CREATE OR REPLACE FUNCTION public.checkout_key_set (
  p_key_set_id  uuid,
  p_due_back_at timestamp with time zone,
  p_notes       text                     DEFAULT NULL::text
)
  RETURNS public.key_sets
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_holder_id uuid;
  v_key_set public.key_sets;
  v_checkout_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('agent', 'admin')
      and p.status = 'approved'
  ) then
    raise exception 'Only approved agents can check out keysets';
  end if;

  if p_due_back_at is null then
    raise exception 'Due back time is required';
  end if;

  if p_due_back_at <= now() then
    raise exception 'Due back time must be in the future';
  end if;

  v_checkout_end := p_due_back_at;

  select kh.id
  into v_holder_id
  from public.key_holders kh
  where kh.profile_id = auth.uid()
    and kh.holder_type = 'agent'
  limit 1;

  if v_holder_id is null then
    raise exception 'No key holder record found for current agent';
  end if;

  select *
  into v_key_set
  from public.key_sets ks
  where ks.id = p_key_set_id
  for update;

  if not found then
    raise exception 'Keyset not found';
  end if;

  if not exists (
    select 1
    from public.properties p
    where p.id = v_key_set.property_id
      and p.status = 'active'
  ) then
    raise exception 'Property is not active';
  end if;

  if not exists (
    select 1
    from public.keys k
    where k.key_set_id = p_key_set_id
  ) then
    raise exception 'This keyset has no keys assigned';
  end if;

  if v_key_set.status <> 'available' then
    raise exception 'Keyset is not available';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.key_set_id = p_key_set_id
      and r.status = 'active'
      and r.reserved_by_holder_id <> v_holder_id
      and tstzrange(now(), v_checkout_end, '[)')
          && tstzrange(r.starts_at, r.ends_at, '[)')
  ) then
    raise exception 'This keyset is reserved by another agent during the requested checkout time';
  end if;

  update public.key_sets
  set
    status = 'checked_out',
    current_holder_id = v_holder_id,
    due_back_at = p_due_back_at,
    updated_at = now()
  where id = p_key_set_id
  returning *
  into v_key_set;

  update public.reservations
  set
    status = 'completed',
    updated_at = now()
  where key_set_id = p_key_set_id
    and reserved_by_holder_id = v_holder_id
    and status = 'active'
    and tstzrange(now(), v_checkout_end, '[)')
        && tstzrange(starts_at, ends_at, '[)');

  insert into public.transactions (
    key_set_id,
    property_id,
    transaction_type,
    from_holder_id,
    to_holder_id,
    due_back_at,
    notes,
    updated_by
  )
  values (
    p_key_set_id,
    v_key_set.property_id,
    'checked_out',
    null,
    v_holder_id,
    p_due_back_at,
    p_notes,
    auth.uid()
  );

  return v_key_set;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."checkout_key_set"(uuid, timestamp WITH time zone, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
