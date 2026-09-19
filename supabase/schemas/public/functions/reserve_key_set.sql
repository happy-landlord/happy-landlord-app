CREATE OR REPLACE FUNCTION public.reserve_key_set (
  p_key_set_id uuid,
  p_starts_at  timestamp with time zone,
  p_ends_at    timestamp with time zone,
  p_notes      text                     DEFAULT NULL::text
)
  RETURNS public.reservations
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_holder_id uuid;
  v_key_set public.key_sets;
  v_reservation public.reservations;
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
    raise exception 'Only approved agents can reserve keysets';
  end if;

  if p_starts_at < now() then
    raise exception 'Reservation cannot start in the past';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception 'Reservation end time must be after start time';
  end if;

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

  if v_key_set.status <> 'available' then
    raise exception 'Only available keysets can be reserved';
  end if;

  if not exists (
    select 1
    from public.properties p
    where p.id = v_key_set.property_id
      and p.status = 'active'
  ) then
    raise exception 'Property is not active';
  end if;

  insert into public.reservations (
    key_set_id,
    property_id,
    reserved_by_holder_id,
    starts_at,
    ends_at,
    notes,
    created_by
  )
  values (
    p_key_set_id,
    v_key_set.property_id,
    v_holder_id,
    p_starts_at,
    p_ends_at,
    p_notes,
    auth.uid()
  )
  returning *
  into v_reservation;

  return v_reservation;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."reserve_key_set"(uuid, timestamp WITH time zone, timestamp WITH time zone, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
