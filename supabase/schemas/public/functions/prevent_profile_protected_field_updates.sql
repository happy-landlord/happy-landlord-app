CREATE OR REPLACE FUNCTION public.prevent_profile_protected_field_updates()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  -- Admins can update anything
  if public.is_admin() then
    return new;
  end if;

  -- Normal users cannot change protected fields
  if new.id is distinct from old.id then
    raise exception 'You cannot change profile id';
  end if;

  -- Phone is now login identity, so users cannot change it directly
  if new.phone is distinct from old.phone then
    raise exception 'You cannot change phone number';
  end if;

  if new.role is distinct from old.role then
    raise exception 'You cannot change role';
  end if;

  if new.status is distinct from old.status then
    -- Allow inactive/rejected users to request approval/reactivation
    if old.id = auth.uid()
       and old.status in ('inactive', 'rejected')
       and new.status = 'pending'
    then
      return new;
    end if;

    raise exception 'You cannot change account status';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'You cannot change created_at';
  end if;

  -- Email is allowed to change because it is no longer the login identity
  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."prevent_profile_protected_field_updates"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
