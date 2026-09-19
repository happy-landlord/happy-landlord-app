CREATE OR REPLACE FUNCTION public.approve_registration_request (
  p_request_id uuid,
  p_role       text DEFAULT 'agent'::text,
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
    raise exception 'Only admins can approve registration requests';
  end if;

  if p_role not in ('admin', 'agent') then
    raise exception 'Invalid role';
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
    status = 'approved',
    requested_role = p_role,
    admin_note = p_admin_note,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  update public.profiles
  set
    role = p_role,
    status = 'approved'
  where id = v_profile_id;

  insert into public.key_holders (
    holder_type,
    profile_id,
    full_name,
    email,
    phone,
    notes
  )
  select
    'agent',
    p.id,
    p.full_name,
    p.email,
    p.phone,
    'Auto-created after registration approval'
  from public.profiles p
  where p.id = v_profile_id
  on conflict (profile_id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."approve_registration_request"(uuid, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
