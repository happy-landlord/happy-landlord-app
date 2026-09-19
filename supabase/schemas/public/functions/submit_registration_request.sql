CREATE OR REPLACE FUNCTION public.submit_registration_request (
  p_full_name text DEFAULT NULL::text,
  p_phone     text DEFAULT NULL::text,
  p_message   text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_request_id uuid;
begin
  if exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  ) then
    raise exception 'Approved users do not need to resubmit registration requests';
  end if;

  if exists (
    select 1
    from public.registration_requests
    where profile_id = auth.uid()
      and status = 'pending'
  ) then
    raise exception 'You already have a pending registration request';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(p_full_name, ''), full_name),
    phone = coalesce(nullif(p_phone, ''), phone),
    status = 'pending'
  where id = auth.uid();

  insert into public.registration_requests (
    profile_id,
    full_name,
    email,
    phone,
    requested_role,
    status,
    admin_note
  )
  select
    id,
    full_name,
    email,
    phone,
    role,
    'pending',
    p_message
  from public.profiles
  where id = auth.uid()
  returning id into v_request_id;

  return v_request_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."submit_registration_request"(text, text, text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."submit_registration_request"(text, text, text) FROM PUBLIC;
