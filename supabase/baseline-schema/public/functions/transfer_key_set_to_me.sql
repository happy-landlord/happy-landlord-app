CREATE OR REPLACE FUNCTION public.transfer_key_set_to_me (
  p_key_set_id uuid,
  p_notes      text DEFAULT NULL::text
)
  RETURNS public.key_sets
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$declare
  v_to_holder_id uuid;
  v_from_holder_id uuid;
  v_key_set public.key_sets;
begin
  -- 1. Make sure user is logged in
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Make sure logged-in user is approved agent/admin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('agent', 'admin')
      and p.status = 'approved'
  ) then
    raise exception 'Only approved agents can transfer keysets';
  end if;

  -- 3. Find current user's key holder row
  select kh.id
  into v_to_holder_id
  from public.key_holders kh
  where kh.profile_id = auth.uid()
    and kh.holder_type = 'agent'
  limit 1;

  if v_to_holder_id is null then
    raise exception 'No key holder record found for current agent';
  end if;

  -- 4. Lock keyset row
  select *
  into v_key_set
  from public.key_sets ks
  where ks.id = p_key_set_id
  for update;

  if not found then
    raise exception 'Keyset not found';
  end if;

  -- 5. Validate status
  if v_key_set.status not in ('checked_out', 'overdue') then
    raise exception 'Only checked out or overdue keysets can be transferred';
  end if;

  -- 6. Must currently have a holder
  if v_key_set.current_holder_id is null then
    raise exception 'This keyset is currently held by company and cannot be transferred';
  end if;

  -- 7. Cannot transfer to yourself
  if v_key_set.current_holder_id = v_to_holder_id then
    raise exception 'You already hold this keyset';
  end if;

  v_from_holder_id := v_key_set.current_holder_id;

  -- 8. Update live keyset holder
  update public.key_sets
  set
    current_holder_id = v_to_holder_id,
    updated_at = now()
  where id = p_key_set_id
  returning *
  into v_key_set;

  -- 9. Write transaction log
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
    'transferred',
    v_from_holder_id,
    v_to_holder_id,
    p_notes,
    auth.uid()
  );

  return v_key_set;
end;$function$;

GRANT EXECUTE ON FUNCTION "public"."transfer_key_set_to_me"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
