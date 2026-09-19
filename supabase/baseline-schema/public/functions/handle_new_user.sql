CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_full_name text;
  v_phone text;
  v_email text;
  v_request_id uuid;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );

  v_phone := coalesce(
    new.phone,
    new.raw_user_meta_data->>'phone',
    ''
  );

  v_email := nullif(
    lower(trim(coalesce(new.email, new.raw_user_meta_data->>'email', ''))),
    ''
  );

  insert into public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    status
  )
  values (
    new.id,
    v_full_name,
    v_email,
    v_phone,
    'agent',
    'pending'
  )
  on conflict (id) do update
  set
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone);

  /*
    Trigger runs outside normal authenticated request context,
    so auth.uid() may not be reliable here.
    Temporarily set request jwt claim so submit_registration_request()
    can behave as if the new user submitted it.
  */
  perform set_config(
    'request.jwt.claim.sub',
    new.id::text,
    true
  );

  select public.submit_registration_request(
    v_full_name,
    v_phone,
    null
  )
  into v_request_id;

  return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
