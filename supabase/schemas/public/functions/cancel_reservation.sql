CREATE OR REPLACE FUNCTION public.cancel_reservation (
  p_reservation_id uuid
)
  RETURNS public.reservations
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_holder_id uuid;
  v_reservation public.reservations;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_approved() then
    raise exception 'Only approved users can cancel reservations';
  end if;

  select kh.id
  into v_holder_id
  from public.key_holders kh
  where kh.profile_id = auth.uid()
    and kh.holder_type = 'agent'
  limit 1;

  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.status <> 'active' then
    raise exception 'Only active reservations can be cancelled';
  end if;

  if not public.is_admin()
     and v_reservation.reserved_by_holder_id <> v_holder_id then
    raise exception 'You can only cancel your own reservation';
  end if;

  update public.reservations
  set
    status = 'cancelled',
    updated_at = now()
  where id = p_reservation_id
  returning *
  into v_reservation;

  return v_reservation;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."cancel_reservation"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
