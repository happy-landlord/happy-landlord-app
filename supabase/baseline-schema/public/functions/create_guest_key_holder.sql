CREATE OR REPLACE FUNCTION public.create_guest_key_holder (
  p_full_name    text,
  p_phone        text DEFAULT NULL::text,
  p_email        text DEFAULT NULL::text,
  p_company_name text DEFAULT NULL::text,
  p_notes        text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  guest_id uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_required';
  end if;

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'guest_name_required';
  end if;

  if nullif(btrim(p_phone), '') is null
     and nullif(btrim(p_email), '') is null then
    raise exception 'guest_contact_required';
  end if;

  insert into public.key_holders (
    holder_type,
    profile_id,
    full_name,
    phone,
    email,
    notes,
    company_name,
    is_active,
    created_by
  )
  values (
    'guest',
    null,
    btrim(p_full_name),
    nullif(btrim(p_phone), ''),
    nullif(lower(btrim(p_email)), ''),
    nullif(btrim(p_notes), ''),
    nullif(btrim(p_company_name), ''),
    true,
    auth.uid()
  )
  returning id into guest_id;

  return guest_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_guest_key_holder"(text, text, text, text, text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."create_guest_key_holder"(text, text, text, text, text) FROM PUBLIC;
