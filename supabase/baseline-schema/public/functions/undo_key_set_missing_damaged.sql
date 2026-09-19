CREATE OR REPLACE FUNCTION public.undo_key_set_missing_damaged (
  p_key_set_id uuid,
  p_notes      text DEFAULT NULL::text
)
  RETURNS public.key_sets
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_key_set public.key_sets;
  v_old_holder_id uuid;
  v_new_status text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can undo missing or damaged keysets';
  end if;

  select *
  into v_key_set
  from public.key_sets ks
  where ks.id = p_key_set_id
  for update;

  if not found then
    raise exception 'Keyset not found';
  end if;

  if v_key_set.status <> 'missing_damaged' then
    raise exception 'Only missing/damaged keysets can be restored';
  end if;

  if not exists (
    select 1
    from public.properties p
    where p.id = v_key_set.property_id
      and p.status = 'active'
  ) then
    raise exception 'Property is not active';
  end if;

  v_old_holder_id := v_key_set.current_holder_id;

  v_new_status :=
    case
      when v_key_set.current_holder_id is null then 'available'
      when v_key_set.due_back_at is not null and v_key_set.due_back_at < now() then 'overdue'
      else 'checked_out'
    end;

  update public.key_sets
  set
    status = v_new_status,
    updated_at = now()
  where id = p_key_set_id
  returning *
  into v_key_set;

  insert into public.transactions (
    key_set_id,
    property_id,
    transaction_type,
    from_holder_id,
    to_holder_id,
    notes,
    updated_by
  )
  values (
    p_key_set_id,
    v_key_set.property_id,
    'resolved_missing_damaged',
    v_old_holder_id,
    v_old_holder_id,
    p_notes,
    auth.uid()
  );

  return v_key_set;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."undo_key_set_missing_damaged"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
