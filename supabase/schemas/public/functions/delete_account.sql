CREATE OR REPLACE FUNCTION public.delete_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_checkouts int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Block deletion if user currently holds checked out/overdue keysets
  select count(*)
  into v_checkouts
  from public.key_sets ks
  join public.key_holders kh on kh.id = ks.current_holder_id
  where kh.profile_id = v_uid
    and ks.status in ('checked_out', 'overdue');

  if v_checkouts > 0 then
    raise exception 'active_checkouts|You have % keyset% checked out. Return all keys before deleting your account.',
      v_checkouts,
      case when v_checkouts = 1 then '' else 's' end
    using errcode = 'P0001';
  end if;

  -- Cancel active reservations by this user
  update public.reservations r
  set
    status = 'cancelled',
    updated_at = now()
  from public.key_holders kh
  where r.reserved_by_holder_id = kh.id
    and kh.profile_id = v_uid
    and r.status = 'active';

  -- Anonymise key holder before profile/auth deletion
  update public.key_holders
  set
    full_name = 'Deleted user',
    email = null,
    phone = null,
    notes = trim(coalesce(notes, '') || E'\nAccount deleted by user.'),
    updated_at = now()
  where profile_id = v_uid;

  -- Delete auth user.
  -- profiles.id has on delete cascade from auth.users,
  -- then all profile references above will cascade/set null.
  delete from auth.users
  where id = v_uid;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."delete_account"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
