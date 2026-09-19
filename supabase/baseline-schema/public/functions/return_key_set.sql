CREATE OR REPLACE FUNCTION public.return_key_set (
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
  v_from_holder_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can mark keysets as returned';
  end if;

  select *
  into v_key_set
  from public.key_sets ks
  where ks.id = p_key_set_id
  for update;

  if not found then
    raise exception 'Keyset not found';
  end if;

  if v_key_set.status not in ('checked_out', 'overdue') then
    raise exception 'Only checked out or overdue keysets can be returned';
  end if;

  if v_key_set.current_holder_id is null then
    raise exception 'This keyset is already with company';
  end if;

  v_from_holder_id := v_key_set.current_holder_id;

  update public.key_sets
  set
    status = 'available',
    current_holder_id = null,
    due_back_at = null,
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
    'returned',
    v_from_holder_id,
    null,
    p_notes,
    auth.uid()
  );

  return v_key_set;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."return_key_set"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
