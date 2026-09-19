CREATE OR REPLACE FUNCTION public.is_approved()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_approved"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
