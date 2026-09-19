CREATE OR REPLACE FUNCTION public.get_account_status_by_email (
  p_email text
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_status text;
BEGIN
  SELECT p.status::text
  INTO v_status
  FROM public.profiles p
  WHERE lower(trim(p.email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN COALESCE(v_status, 'not_found');
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_account_status_by_email"(text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."get_account_status_by_email"(text) FROM PUBLIC;
