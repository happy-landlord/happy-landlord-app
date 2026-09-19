CREATE OR REPLACE FUNCTION public.report_key_set_missing (
  p_key_set_id uuid,
  p_notes      text DEFAULT NULL::text
)
  RETURNS public.key_sets
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_holder_id uuid;
  v_key_set public.key_sets;
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
    raise exception 'Only approved users can report missing or damaged keysets';
  end if;

  select kh.id
  into v_holder_id
  from public.key_holders kh
  where kh.profile_id = auth.uid()
    and kh.holder_type = 'agent'
  limit 1;

  select *
  into v_key_set
  from public.key_sets ks
  where ks.id = p_key_set_id
  for update;

  if not found then
    raise exception 'Keyset not found';
  end if;

  if v_key_set.status in ('handover_tenant', 'handover_landlord', 'inactive') then
    raise exception 'This keyset is no longer active';
  end if;

  -- Admin can report any keyset.
  -- Agent can only report the keyset they currently hold.
  if not public.is_admin() then
    if v_holder_id is null then
      raise exception 'No key holder record found for current agent';
    end if;

    if v_key_set.current_holder_id <> v_holder_id then
      raise exception 'You can only report a keyset you currently hold';
    end if;
  end if;

  update public.key_sets
  set
    status = 'missing_damaged',
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
    'marked_missing_damaged',
    v_key_set.current_holder_id,
    null,
    p_notes,
    auth.uid()
  );

  return v_key_set;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."report_key_set_missing"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
