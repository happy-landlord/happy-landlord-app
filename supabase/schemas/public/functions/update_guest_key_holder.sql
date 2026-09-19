CREATE OR REPLACE FUNCTION public.update_guest_key_holder (
  p_guest_holder_id uuid,
  p_full_name       text,
  p_phone           text DEFAULT NULL::text,
  p_email           text DEFAULT NULL::text,
  p_company_name    text DEFAULT NULL::text,
  p_notes           text DEFAULT NULL::text
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

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'guest_name_required';
  end if;

  if nullif(btrim(p_phone), '') is null
     and nullif(btrim(p_email), '') is null then
    raise exception 'guest_contact_required';
  end if;

  update public.key_holders
  set
    full_name = btrim(p_full_name),
    phone = nullif(btrim(p_phone), ''),
    email = nullif(lower(btrim(p_email)), ''),
    notes = nullif(btrim(p_notes), ''),
    company_name = nullif(btrim(p_company_name), ''),
    updated_at = now()
  where id = p_guest_holder_id
    and holder_type = 'guest';

  if not found then
    raise exception 'guest_not_found';
  end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_guest_key_holder"(uuid, text, text, text, text, text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."update_guest_key_holder"(uuid, text, text, text, text, text) FROM PUBLIC;
