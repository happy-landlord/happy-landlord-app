CREATE OR REPLACE FUNCTION public.archive_guest_key_holder (
  p_guest_holder_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_required';
  end if;

  if exists (
    select 1
    from public.key_sets
    where current_holder_id = p_guest_holder_id
  ) then
    raise exception 'guest_has_active_checkout';
  end if;

  update public.key_holders
  set is_active = false, updated_at = now()
  where id = p_guest_holder_id
    and holder_type = 'guest';

  if not found then
    raise exception 'guest_not_found';
  end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."archive_guest_key_holder"(uuid) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."archive_guest_key_holder"(uuid) FROM PUBLIC;
