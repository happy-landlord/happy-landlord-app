CREATE OR REPLACE FUNCTION public.reject_registration_request (
  p_request_id uuid,
  p_admin_note text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject registration requests';
  end if;

  select profile_id
  into v_profile_id
  from public.registration_requests
  where id = p_request_id;

  if v_profile_id is null then
    raise exception 'Registration request not found';
  end if;

  update public.registration_requests
  set
    status = 'rejected',
    admin_note = p_admin_note,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  update public.profiles
  set status = 'rejected'
  where id = v_profile_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."reject_registration_request"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
