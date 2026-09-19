CREATE OR REPLACE FUNCTION public.checkout_key_set_to_guest (
  p_key_set_id      uuid,
  p_guest_holder_id uuid,
  p_due_back_at     timestamp with time zone,
  p_notes           text                     DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  key_set_row public.key_sets%rowtype;
  transaction_id uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_required';
  end if;

  if p_due_back_at is null or p_due_back_at <= now() then
    raise exception 'future_due_date_required';
  end if;

  perform 1
  from public.key_holders
  where id = p_guest_holder_id
    and holder_type = 'guest'
    and is_active
  for share;

  if not found then
    raise exception 'active_guest_not_found';
  end if;

  select *
  into key_set_row
  from public.key_sets
  where id = p_key_set_id
  for update;

  if not found then
    raise exception 'key_set_not_found';
  end if;

  if key_set_row.status <> 'available'
     or key_set_row.current_holder_id is not null then
    raise exception 'key_set_not_available';
  end if;

  if exists (
    select 1
    from public.reservations
    where key_set_id = p_key_set_id
      and status = 'active'
      and starts_at < p_due_back_at
      and ends_at > now()
  ) then
    raise exception 'key_set_has_overlapping_reservation';
  end if;

  update public.key_sets
  set
    status = 'checked_out',
    current_holder_id = p_guest_holder_id,
    due_back_at = p_due_back_at,
    updated_at = now()
  where id = p_key_set_id;

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
    key_set_row.id,
    key_set_row.property_id,
    'checked_out',
    null,
    p_guest_holder_id,
    p_due_back_at,
    nullif(btrim(p_notes), ''),
    auth.uid()
  )
  returning id into transaction_id;

  return transaction_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."checkout_key_set_to_guest"(uuid, uuid, timestamp WITH time zone, text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."checkout_key_set_to_guest"(uuid, uuid, timestamp WITH time zone, text) FROM PUBLIC;
