SET local check_function_bodies = off;

CREATE EXTENSION "btree_gist" SCHEMA "public";

CREATE EXTENSION "pg_net" SCHEMA "public";

CREATE TABLE "public"."key_holders" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "holder_type"  text                     NOT NULL,
  "profile_id"   uuid,
  "full_name"    text,
  "email"        text,
  "phone"        text,
  "notes"        text,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "company_name" text,
  "is_active"    boolean                  NOT NULL DEFAULT true,
  "created_by"   uuid,
  CONSTRAINT "agent_holder_profile_or_name_check" CHECK (((holder_type <> 'agent'::text) OR (profile_id IS NOT NULL) OR (full_name IS NOT NULL))),
  CONSTRAINT "key_holders_guest_shape_check" CHECK ((((holder_type = 'guest'::text) AND (profile_id IS NULL) AND (created_by IS NOT NULL) AND (NULLIF(btrim(full_name), ''::text) IS
    NOT NULL) AND ((NULLIF(btrim(phone), ''::text) IS NOT NULL) OR (NULLIF(btrim(email), ''::text) IS NOT NULL))) OR (holder_type <> 'guest'::text))),
  CONSTRAINT "key_holders_holder_type_check" CHECK ((holder_type = ANY (ARRAY['agent'::text, 'tenant'::text, 'landlord'::text, 'guest'::text]))),
  CONSTRAINT "key_holders_pkey" PRIMARY KEY (id),
  CONSTRAINT "key_holders_profile_id_key" UNIQUE (profile_id),
  CONSTRAINT "non_agent_holder_must_have_name" CHECK (((holder_type = 'agent'::text) OR (full_name IS NOT NULL)))
);

ALTER TABLE "public"."key_holders"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."key_sets" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"       uuid                     NOT NULL,
  "code"              text                     NOT NULL,
  "name"              text                     NOT NULL,
  "status"            text                     NOT NULL DEFAULT 'available'::text,
  "current_holder_id" uuid,
  "due_back_at"       timestamp with time zone,
  "notes"             text,
  "created_by"        uuid,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "images"            jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "qr_code"           text,
  "cabinet_slot"      text,
  CONSTRAINT "key_sets_pkey" PRIMARY KEY (id),
  CONSTRAINT "key_sets_status_check"
    CHECK
    ((status = ANY (ARRAY['available'::text, 'checked_out'::text, 'overdue'::text, 'handover_tenant'::text, 'handover_landlord'::text, 'missing_damaged'::text, 'inactive'::text])))
);

ALTER TABLE "public"."key_sets"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."keys" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id" uuid                     NOT NULL,
  "key_type"    text                     NOT NULL,
  "label"       text                     NOT NULL,
  "notes"       text,
  "created_by"  uuid,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "key_set_id"  uuid,
  "code"        text,
  "quantity"    integer                  NOT NULL DEFAULT 1,
  CONSTRAINT "keys_key_type_check"
    CHECK
    ((key_type = ANY (ARRAY['main_door'::text, 'fire_door'::text, 'swipe_fob'::text, 'mailbox'::text, 'window'::text, 'garage_remote'::text, 'key_card'::text, 'storage_cage'::text,
    'common_area'::text, 'security'::text, 'balcony'::text, 'other'::text]))),
  CONSTRAINT "keys_pkey" PRIMARY KEY (id),
  CONSTRAINT "keys_quantity_check" CHECK ((quantity > 0))
);

ALTER TABLE "public"."keys"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "recipient_user_id"   uuid,
  "title"               text                     NOT NULL,
  "body"                text                     NOT NULL,
  "type"                text                     NOT NULL,
  "related_property_id" uuid,
  "related_key_set_id"  uuid,
  "related_checkout_id" uuid,
  "created_by"          uuid,
  "read_at"             timestamp with time zone,
  "sent_at"             timestamp with time zone,
  "created_at"          timestamp with time zone DEFAULT now(),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id),
  CONSTRAINT "notifications_type_check"
    CHECK
    ((type = ANY (ARRAY['KEY_DUE_SOON'::text, 'UPCOMING_RESERVATION'::text, 'KEY_RECALL_REQUESTED'::text, 'KEY_OVERDUE'::text, 'KEY_LOST_REPORTED'::text, 'TENANCY_REMINDER'::text,
    'USER_REGISTRATION_REQUESTED'::text])))
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"            uuid                     NOT NULL,
  "full_name"     text,
  "role"          text                     NOT NULL DEFAULT 'agent'::text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "email"         text,
  "phone"         text,
  "status"        text                     NOT NULL DEFAULT 'pending'::text,
  "profile_image" text,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'agent'::text]))),
  CONSTRAINT "profiles_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'inactive'::text])))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."properties" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_code"      text                     NOT NULL,
  "address"            text                     NOT NULL,
  "suburb"             text                     NOT NULL,
  "city"               text                     NOT NULL DEFAULT 'Sydney'::text,
  "postcode"           text,
  "formatted_address"  text,
  "google_place_id"    text,
  "latitude"           numeric(10,7),
  "longitude"          numeric(10,7),
  "property_type"      text                     NOT NULL,
  "created_by"         uuid,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "unit_number"        text,
  "landlord_holder_id" uuid,
  "images"             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "status"             text                     NOT NULL DEFAULT 'active'::text,
  "developer_name"     text,
  "cabinet_code"       text,
  "title"              text,
  "draft_data"         jsonb,
  "lot_number"         text,
  "consultant_name"    text,
  "maa_fee"            numeric(12,2),
  "defects"            text,
  "parking_location"   text,
  "storage_location"   text,
  "bedrooms"           smallint,
  "bathrooms"          smallint,
  "carparks"           smallint,
  "notes"              text,
  "rental_status"      text,
  CONSTRAINT "properties_bathrooms_nonnegative_check" CHECK (((bathrooms IS NULL) OR (bathrooms >= 0))),
  CONSTRAINT "properties_bedrooms_nonnegative_check" CHECK (((bedrooms IS NULL) OR (bedrooms >= 0))),
  CONSTRAINT "properties_carparks_nonnegative_check" CHECK (((carparks IS NULL) OR (carparks >= 0))),
  CONSTRAINT "properties_draft_data_object_check" CHECK (((draft_data IS NULL) OR (jsonb_typeof(draft_data) = 'object'::text))),
  CONSTRAINT "properties_draft_data_size_check" CHECK (((draft_data IS NULL) OR (octet_length((draft_data)::text) <= 1048576))),
  CONSTRAINT "properties_draft_shape_check" CHECK ((((status = 'draft'::text) AND (draft_data IS NOT NULL)) OR ((status <> 'draft'::text) AND (draft_data IS NULL)))),
  CONSTRAINT "properties_maa_fee_nonnegative_check" CHECK (((maa_fee IS NULL) OR (maa_fee >= (0)::numeric))),
  CONSTRAINT "properties_pkey" PRIMARY KEY (id),
  CONSTRAINT "properties_property_code_key" UNIQUE (property_code),
  CONSTRAINT "properties_property_type_check"
    CHECK ((property_type = ANY (ARRAY['house'::text, 'townhouse'::text, 'apartment'::text, 'unit'::text, 'duplex'::text, 'villa'::text, 'other'::text]))),
  CONSTRAINT "properties_rental_status_check" CHECK (((rental_status IS NULL) OR (rental_status = ANY (ARRAY['short'::text, 'long'::text])))),
  CONSTRAINT "properties_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'leased'::text, 'inactive'::text, 'draft'::text])))
);

ALTER TABLE "public"."properties"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."registration_requests" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "profile_id"     uuid                     NOT NULL,
  "full_name"      text,
  "email"          text,
  "phone"          text,
  "requested_role" text                     NOT NULL DEFAULT 'agent'::text,
  "status"         text                     NOT NULL DEFAULT 'pending'::text,
  "admin_note"     text,
  "reviewed_by"    uuid,
  "reviewed_at"    timestamp with time zone,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "user_message"   text,
  CONSTRAINT "registration_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "registration_requests_requested_role_check" CHECK ((requested_role = ANY (ARRAY['agent'::text, 'admin'::text]))),
  CONSTRAINT "registration_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE "public"."registration_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."reservations" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "key_set_id"            uuid                     NOT NULL,
  "property_id"           uuid                     NOT NULL,
  "reserved_by_holder_id" uuid                     NOT NULL,
  "starts_at"             timestamp with time zone NOT NULL,
  "ends_at"               timestamp with time zone NOT NULL,
  "status"                text                     NOT NULL DEFAULT 'active'::text,
  "notes"                 text,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "reservations_pkey" PRIMARY KEY (id),
  CONSTRAINT "reservations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'completed'::text, 'expired'::text]))),
  CONSTRAINT "reservations_time_valid" CHECK ((ends_at > starts_at)),
  "created_by"            uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."reservations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."transactions" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "key_set_id"       uuid                     NOT NULL,
  "property_id"      uuid                     NOT NULL,
  "transaction_type" text                     NOT NULL,
  "from_holder_id"   uuid,
  "to_holder_id"     uuid,
  "due_back_at"      timestamp with time zone,
  "notes"            text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id),
  CONSTRAINT "transactions_transaction_type_check"
    CHECK
    ((transaction_type = ANY (ARRAY['created'::text, 'checked_out'::text, 'returned'::text, 'transferred'::text, 'marked_overdue'::text, 'marked_missing_damaged'::text,
    'resolved_missing_damaged'::text, 'handover_tenant'::text, 'handover_landlord'::text, 'notes_updated'::text]))),
  "updated_by"       uuid                     DEFAULT auth.uid()
);

ALTER TABLE "public"."transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."user_push_tokens" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"         uuid                     NOT NULL,
  "expo_push_token" text                     NOT NULL,
  "device_name"     text,
  "platform"        text,
  "is_active"       boolean                  DEFAULT true,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "last_seen_at"    timestamp with time zone,
  CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY (id),
  CONSTRAINT "user_push_tokens_user_id_expo_push_token_key" UNIQUE (user_id, expo_push_token)
);

ALTER TABLE "public"."user_push_tokens"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.approve_registration_request (
  p_request_id uuid,
  p_role       text DEFAULT 'agent'::text,
  p_admin_note text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve registration requests';
  end if;

  if p_role not in ('admin', 'agent') then
    raise exception 'Invalid role';
  end if;

  select profile_id
  into v_profile_id
  from public.registration_requests
  where id = p_request_id;

  if v_profile_id is null then
    raise exception 'Registration request not found';
  end if;

  update public.registration_requests
  set
    status = 'approved',
    requested_role = p_role,
    admin_note = p_admin_note,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  update public.profiles
  set
    role = p_role,
    status = 'approved'
  where id = v_profile_id;

  insert into public.key_holders (
    holder_type,
    profile_id,
    full_name,
    email,
    phone,
    notes
  )
  select
    'agent',
    p.id,
    p.full_name,
    p.email,
    p.phone,
    'Auto-created after registration approval'
  from public.profiles p
  where p.id = v_profile_id
  on conflict (profile_id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone;
end;
$function$;

CREATE OR REPLACE FUNCTION public.archive_guest_key_holder (
  p_guest_holder_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_required';
  end if;

  if exists (
    select 1
    from public.key_sets
    where current_holder_id = p_guest_holder_id
  ) then
    raise exception 'guest_has_active_checkout';
  end if;

  update public.key_holders
  set is_active = false, updated_at = now()
  where id = p_guest_holder_id
    and holder_type = 'guest';

  if not found then
    raise exception 'guest_not_found';
  end if;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.create_guest_key_holder (
  p_full_name    text,
  p_phone        text DEFAULT NULL::text,
  p_email        text DEFAULT NULL::text,
  p_company_name text DEFAULT NULL::text,
  p_notes        text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  guest_id uuid;
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_required';
  end if;

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'guest_name_required';
  end if;

  if nullif(btrim(p_phone), '') is null
     and nullif(btrim(p_email), '') is null then
    raise exception 'guest_contact_required';
  end if;

  insert into public.key_holders (
    holder_type,
    profile_id,
    full_name,
    phone,
    email,
    notes,
    company_name,
    is_active,
    created_by
  )
  values (
    'guest',
    null,
    btrim(p_full_name),
    nullif(btrim(p_phone), ''),
    nullif(lower(btrim(p_email)), ''),
    nullif(btrim(p_notes), ''),
    nullif(btrim(p_company_name), ''),
    true,
    auth.uid()
  )
  returning id into guest_id;

  return guest_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_notification (
  p_recipient_user_id   uuid,
  p_title               text,
  p_body                text,
  p_type                text,
  p_related_property_id uuid DEFAULT NULL::uuid,
  p_related_key_set_id  uuid DEFAULT NULL::uuid,
  p_related_checkout_id uuid DEFAULT NULL::uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  new_notification_id uuid;
begin
  if p_recipient_user_id <> auth.uid()
     and not public.is_admin()
  then
    raise exception 'Not allowed to create notification for another user';
  end if;

  insert into public.notifications (
    recipient_user_id,
    title,
    body,
    type,
    related_property_id,
    related_key_set_id,
    related_checkout_id,
    created_by
  )
  values (
    p_recipient_user_id,
    p_title,
    p_body,
    p_type,
    p_related_property_id,
    p_related_key_set_id,
    p_related_checkout_id,
    auth.uid()
  )
  returning id into new_notification_id;

  return new_notification_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.delete_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
  AS $function$
declare
  v_uid uuid := auth.uid();
  v_checkouts int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Block deletion if user currently holds checked out/overdue keysets
  select count(*)
  into v_checkouts
  from public.key_sets ks
  join public.key_holders kh on kh.id = ks.current_holder_id
  where kh.profile_id = v_uid
    and ks.status in ('checked_out', 'overdue');

  if v_checkouts > 0 then
    raise exception 'active_checkouts|You have % keyset% checked out. Return all keys before deleting your account.',
      v_checkouts,
      case when v_checkouts = 1 then '' else 's' end
    using errcode = 'P0001';
  end if;

  -- Cancel active reservations by this user
  update public.reservations r
  set
    status = 'cancelled',
    updated_at = now()
  from public.key_holders kh
  where r.reserved_by_holder_id = kh.id
    and kh.profile_id = v_uid
    and r.status = 'active';

  -- Anonymise key holder before profile/auth deletion
  update public.key_holders
  set
    full_name = 'Deleted user',
    email = null,
    phone = null,
    notes = trim(coalesce(notes, '') || E'\nAccount deleted by user.'),
    updated_at = now()
  where profile_id = v_uid;

  -- Delete auth user.
  -- profiles.id has on delete cascade from auth.users,
  -- then all profile references above will cascade/set null.
  delete from auth.users
  where id = v_uid;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_push_notification()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  perform net.http_post(
    url := 'https://lpwahlwswtbgxwrnipoh.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwd2FobHdzd3RiZ3h3cm5pcG9oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzODUyNywiZXhwIjoyMDk0ODE0NTI3fQ.MFFNcFGiHBmgtvE6SuTpnJeV8-RjRBgzW19JCBwYeYs'
    ),
    body := jsonb_build_object(
      'notification_id', new.id
    )
  );

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_account_status_by_email (
  p_email text
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_status text;
BEGIN
  SELECT p.status::text
  INTO v_status
  FROM public.profiles p
  WHERE lower(trim(p.email)) = lower(trim(p_email))
  LIMIT 1;

  RETURN COALESCE(v_status, 'not_found');
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'approved'
  );
$function$;

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

CREATE OR REPLACE FUNCTION public.mark_notification_read (
  notification_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  update public.notifications
  set read_at = now()
  where id = notification_id
    and recipient_user_id = auth.uid();
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_profile_protected_field_updates()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
begin
  -- Admins can update anything
  if public.is_admin() then
    return new;
  end if;

  -- Normal users cannot change protected fields
  if new.id is distinct from old.id then
    raise exception 'You cannot change profile id';
  end if;

  -- Phone is now login identity, so users cannot change it directly
  if new.phone is distinct from old.phone then
    raise exception 'You cannot change phone number';
  end if;

  if new.role is distinct from old.role then
    raise exception 'You cannot change role';
  end if;

  if new.status is distinct from old.status then
    -- Allow inactive/rejected users to request approval/reactivation
    if old.id = auth.uid()
       and old.status in ('inactive', 'rejected')
       and new.status = 'pending'
    then
      return new;
    end if;

    raise exception 'You cannot change account status';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'You cannot change created_at';
  end if;

  -- Email is allowed to change because it is no longer the login identity
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reject_registration_request (
  p_request_id uuid,
  p_admin_note text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_profile_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can reject registration requests';
  end if;

  select profile_id
  into v_profile_id
  from public.registration_requests
  where id = p_request_id;

  if v_profile_id is null then
    raise exception 'Registration request not found';
  end if;

  update public.registration_requests
  set
    status = 'rejected',
    admin_note = p_admin_note,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  update public.profiles
  set status = 'rejected'
  where id = v_profile_id;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.submit_registration_request (
  p_full_name text DEFAULT NULL::text,
  p_phone     text DEFAULT NULL::text,
  p_message   text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_request_id uuid;
begin
  if exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'approved'
  ) then
    raise exception 'Approved users do not need to resubmit registration requests';
  end if;

  if exists (
    select 1
    from public.registration_requests
    where profile_id = auth.uid()
      and status = 'pending'
  ) then
    raise exception 'You already have a pending registration request';
  end if;

  update public.profiles
  set
    full_name = coalesce(nullif(p_full_name, ''), full_name),
    phone = coalesce(nullif(p_phone, ''), phone),
    status = 'pending'
  where id = auth.uid();

  insert into public.registration_requests (
    profile_id,
    full_name,
    email,
    phone,
    requested_role,
    status,
    admin_note
  )
  select
    id,
    full_name,
    email,
    phone,
    role,
    'pending',
    p_message
  from public.profiles
  where id = auth.uid()
  returning id into v_request_id;

  return v_request_id;
end;
$function$;

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

CREATE OR REPLACE FUNCTION public.update_guest_key_holder (
  p_guest_holder_id uuid,
  p_full_name       text,
  p_phone           text DEFAULT NULL::text,
  p_email           text DEFAULT NULL::text,
  p_company_name    text DEFAULT NULL::text,
  p_notes           text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  if not public.current_user_is_admin() then
    raise exception 'admin_required';
  end if;

  if nullif(btrim(p_full_name), '') is null then
    raise exception 'guest_name_required';
  end if;

  if nullif(btrim(p_phone), '') is null
     and nullif(btrim(p_email), '') is null then
    raise exception 'guest_contact_required';
  end if;

  update public.key_holders
  set
    full_name = btrim(p_full_name),
    phone = nullif(btrim(p_phone), ''),
    email = nullif(lower(btrim(p_email)), ''),
    notes = nullif(btrim(p_notes), ''),
    company_name = nullif(btrim(p_company_name), ''),
    updated_at = now()
  where id = p_guest_holder_id
    and holder_type = 'guest';

  if not found then
    raise exception 'guest_not_found';
  end if;
end;
$function$;

ALTER TABLE "public"."key_sets"
  ADD CONSTRAINT "key_sets_current_holder_id_fkey" FOREIGN KEY (current_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL;

ALTER TABLE "public"."keys"
  ADD CONSTRAINT "keys_key_set_id_fkey" FOREIGN KEY (key_set_id) REFERENCES public.key_sets(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."key_holders"
  ADD CONSTRAINT "key_holders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."key_holders"
  ADD CONSTRAINT "key_holders_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."key_sets"
  ADD CONSTRAINT "key_sets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."keys"
  ADD CONSTRAINT "keys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."properties"
  ADD CONSTRAINT "properties_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."properties"
  ADD CONSTRAINT "properties_landlord_holder_id_fkey" FOREIGN KEY (landlord_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL;

ALTER TABLE "public"."key_sets"
  ADD CONSTRAINT "key_sets_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."keys"
  ADD CONSTRAINT "keys_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."registration_requests"
  ADD CONSTRAINT "registration_requests_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."registration_requests"
  ADD CONSTRAINT "registration_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "no_overlapping_active_reservations" EXCLUDE USING gist (key_set_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status = 'active'::text));

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_key_set_id_fkey" FOREIGN KEY (key_set_id) REFERENCES public.key_sets(id) ON DELETE CASCADE;

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_reserved_by_holder_id_fkey" FOREIGN KEY (reserved_by_holder_id) REFERENCES public.key_holders(id) ON DELETE CASCADE;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_from_holder_id_fkey" FOREIGN KEY (from_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_key_set_id_fkey" FOREIGN KEY (key_set_id) REFERENCES public.key_sets(id) ON DELETE CASCADE;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_to_holder_id_fkey" FOREIGN KEY (to_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL;

ALTER TABLE "public"."user_push_tokens"
  ADD CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE VIEW "public"."admin_dashboard_summary" WITH (security_invoker=true) AS  SELECT ( SELECT (count(*))::integer AS count
           FROM public.properties p
          WHERE (p.status <> 'inactive'::text)) AS total_properties,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status <> 'inactive'::text))) AS total_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'available'::text))) AS available_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'checked_out'::text))) AS checked_out_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'overdue'::text))) AS overdue_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'missing_damaged'::text))) AS lost_keysets,
    ( SELECT (count(*))::integer AS count
           FROM public.properties p
          WHERE (p.status = 'leased'::text)) AS leased_properties,
    ( SELECT (count(*))::integer AS count
           FROM public.properties p
          WHERE (p.status = 'inactive'::text)) AS inactive_properties;

CREATE INDEX idx_notifications_recipient_created ON public.notifications USING btree (recipient_user_id, created_at DESC);

CREATE INDEX idx_notifications_recipient_read ON public.notifications USING btree (recipient_user_id, read_at);

CREATE INDEX idx_notifications_sent_at ON public.notifications USING btree (sent_at);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (TYPE);

CREATE INDEX idx_properties_title ON public.properties USING gin (to_tsvector('english'::regconfig, COALESCE(title, ''::text)));

CREATE INDEX idx_user_push_tokens_active ON public.user_push_tokens USING btree (user_id, is_active);

CREATE INDEX idx_user_push_tokens_token ON public.user_push_tokens USING btree (expo_push_token);

CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens USING btree (user_id);

CREATE INDEX key_holders_active_guests_company_idx ON public.key_holders USING btree (lower(company_name))
  WHERE ((holder_type = 'guest'::text) AND is_active AND (company_name IS NOT NULL));

CREATE INDEX key_holders_active_guests_name_idx ON public.key_holders USING btree (lower(full_name))
  WHERE ((holder_type = 'guest'::text) AND is_active);

CREATE INDEX key_sets_code_idx ON public.key_sets USING btree (code);

CREATE UNIQUE INDEX key_sets_qr_code_unique_idx ON public.key_sets USING btree (qr_code);

CREATE INDEX keys_property_id_idx ON public.keys USING btree (property_id);

CREATE UNIQUE INDEX one_pending_registration_request_per_profile ON public.registration_requests USING btree (profile_id)
  WHERE (status = 'pending'::text);

CREATE UNIQUE INDEX profiles_phone_unique_idx ON public.profiles USING btree (phone)
  WHERE (phone IS NOT NULL);

CREATE INDEX properties_building_units_lookup_idx ON public.properties USING btree (google_place_id, lower(COALESCE(NULLIF(btrim(unit_number), ''::text), ''::text)))
  WHERE ((google_place_id IS NOT NULL) AND (btrim(google_place_id) <> ''::text));

CREATE INDEX properties_cabinet_code_idx ON public.properties USING btree (cabinet_code);

CREATE INDEX properties_developer_name_idx ON public.properties USING btree (developer_name);

CREATE INDEX properties_drafts_updated_at_idx ON public.properties USING btree (updated_at DESC)
  WHERE (status = 'draft'::text);

CREATE UNIQUE INDEX properties_google_place_unit_unique_idx ON public.properties USING btree (google_place_id, lower(COALESCE(NULLIF(btrim(unit_number), ''::text), ''::text)))
  WHERE ((google_place_id IS NOT NULL) AND (btrim(google_place_id) <> ''::text) AND (status <> 'draft'::text));

CREATE INDEX properties_landlord_holder_id_idx ON public.properties USING btree (landlord_holder_id);

CREATE INDEX properties_property_code_idx ON public.properties USING btree (property_code);

CREATE INDEX properties_suburb_idx ON public.properties USING btree (suburb);

CREATE INDEX reservations_key_set_id_idx ON public.reservations USING btree (key_set_id);

CREATE INDEX reservations_property_id_idx ON public.reservations USING btree (property_id);

CREATE INDEX reservations_reserved_by_holder_id_idx ON public.reservations USING btree (reserved_by_holder_id);

CREATE INDEX reservations_time_idx ON public.reservations USING btree (starts_at, ends_at);

CREATE INDEX transactions_created_at_idx ON public.transactions USING btree (created_at);

CREATE INDEX transactions_key_set_id_idx ON public.transactions USING btree (key_set_id);

CREATE INDEX transactions_property_id_idx ON public.transactions USING btree (property_id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_key_holders_updated_at
  BEFORE UPDATE ON public.key_holders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_key_sets_updated_at
  BEFORE UPDATE ON public.key_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_keys_updated_at
  BEFORE UPDATE ON public.keys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_notification_created_dispatch_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_push_notification();

CREATE TRIGGER prevent_profile_protected_field_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_protected_field_updates();

CREATE TRIGGER set_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins can create key holders" ON "public"."key_holders"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update key holders" ON "public"."key_holders"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can read key holders" ON "public"."key_holders"
  FOR SELECT
  TO "authenticated"
  USING (public.is_approved());

CREATE POLICY "Authenticated users can read key holders" ON "public"."key_holders"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Guest holders are admin managed" ON "public"."key_holders"
  AS RESTRICTIVE
  FOR ALL
  TO "authenticated"
  USING (((holder_type <> 'guest'::text) OR public.current_user_is_admin()))
  WITH CHECK (((holder_type <> 'guest'::text) OR public.current_user_is_admin()));

CREATE POLICY "Admins can create key sets" ON "public"."key_sets"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update key sets" ON "public"."key_sets"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can read key sets" ON "public"."key_sets"
  FOR SELECT
  TO "authenticated"
  USING (public.is_approved());

CREATE POLICY "Admins can create keys" ON "public"."keys"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete keys" ON "public"."keys"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update keys" ON "public"."keys"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can read keys" ON "public"."keys"
  FOR SELECT
  TO "authenticated"
  USING (public.is_approved());

CREATE POLICY "Admins can delete notifications" ON "public"."notifications"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can read all notifications" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update all notifications" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can create notifications" ON "public"."notifications"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_approved());

CREATE POLICY "Users can read own notifications" ON "public"."notifications"
  FOR SELECT
  TO "authenticated"
  USING ((recipient_user_id = auth.uid()));

CREATE POLICY "Users can update own notifications" ON "public"."notifications"
  FOR UPDATE
  TO "authenticated"
  USING ((recipient_user_id = auth.uid()))
  WITH CHECK ((recipient_user_id = auth.uid()));

CREATE POLICY "Admins can read all profiles" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update profiles" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can read own profile" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((id = auth.uid()));

CREATE POLICY "Users can update own profile" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

CREATE POLICY "Admins can create properties" ON "public"."properties"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete properties" ON "public"."properties"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update properties" ON "public"."properties"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view properties" ON "public"."properties"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Draft properties are admin only" ON "public"."properties"
  AS RESTRICTIVE
  FOR ALL
  TO "authenticated"
  USING (((status <> 'draft'::text) OR public.current_user_is_admin()))
  WITH CHECK (((status <> 'draft'::text) OR public.current_user_is_admin()));

CREATE POLICY "Admins can read all registration requests" ON "public"."registration_requests"
  FOR SELECT
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update registration requests" ON "public"."registration_requests"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can read own registration request" ON "public"."registration_requests"
  FOR SELECT
  TO "authenticated"
  USING ((profile_id = auth.uid()));

CREATE POLICY "Admins can create reservations" ON "public"."reservations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete reservations" ON "public"."reservations"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update reservations" ON "public"."reservations"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can read reservations" ON "public"."reservations"
  FOR SELECT
  TO "authenticated"
  USING (public.is_approved());

CREATE POLICY "Admins can create transactions" ON "public"."transactions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update transactions" ON "public"."transactions"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can read transactions" ON "public"."transactions"
  FOR SELECT
  TO "authenticated"
  USING (public.is_approved());

CREATE POLICY "Admins can read all push tokens" ON "public"."user_push_tokens"
  FOR SELECT
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Users can delete own push tokens" ON "public"."user_push_tokens"
  FOR DELETE
  TO "authenticated"
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can insert own push tokens" ON "public"."user_push_tokens"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can read own push tokens" ON "public"."user_push_tokens"
  FOR SELECT
  TO "authenticated"
  USING (((user_id = auth.uid()) OR public.is_admin()));

CREATE POLICY "Users can update own push tokens" ON "public"."user_push_tokens"
  FOR UPDATE
  TO "authenticated"
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Admins can delete key images" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'properties'::text) AND public.is_admin()));

CREATE POLICY "Admins can update key images" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'properties'::text) AND public.is_admin()))
  WITH CHECK (((bucket_id = 'properties'::text) AND public.is_admin()));

CREATE POLICY "Approved users can delete own profile image" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Approved users can read key images" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'properties'::text) AND public.is_approved()));

CREATE POLICY "Approved users can read profile images" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'profiles'::text) AND public.is_approved()));

CREATE POLICY "Approved users can update own profile image" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  WITH CHECK (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Approved users can upload key images" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'properties'::text) AND public.is_approved()));

CREATE POLICY "Approved users can upload own profile image" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Draft property photos are admin only" ON "storage"."objects"
  AS RESTRICTIVE
  FOR ALL
  TO "anon", "authenticated"
  USING (((bucket_id <> 'properties'::text) OR (COALESCE((storage.foldername(name))[1], ''::text) <> 'drafts'::text) OR public.current_user_is_admin()))
  WITH CHECK (((bucket_id <> 'properties'::text) OR (COALESCE((storage.foldername(name))[1], ''::text) <> 'drafts'::text) OR public.current_user_is_admin()));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON COLUMN "public"."properties"."bathrooms" IS 'Number of bathrooms.';

COMMENT ON COLUMN "public"."properties"."bedrooms" IS 'Number of bedrooms.';

COMMENT ON COLUMN "public"."properties"."carparks" IS 'Number of car parks.';

COMMENT ON COLUMN "public"."properties"."consultant_name" IS 'Consultant responsible for the property.';

COMMENT ON COLUMN "public"."properties"."defects" IS 'Free-text defects and condition notes.';

COMMENT ON COLUMN "public"."properties"."draft_data" IS 'Resumable add-property wizard snapshot while status is draft.';

COMMENT ON COLUMN "public"."properties"."lot_number" IS 'Lot identifier supplied for the property.';

COMMENT ON COLUMN "public"."properties"."maa_fee" IS 'MAA fee stored as a non-negative decimal value.';

COMMENT ON COLUMN "public"."properties"."notes" IS 'Free-text property notes, including amenities and other useful details.';

COMMENT ON COLUMN "public"."properties"."parking_location" IS 'Free-text description of the property parking location.';

COMMENT ON COLUMN "public"."properties"."rental_status" IS 'Rental term classification: short or long.';

COMMENT ON COLUMN "public"."properties"."storage_location" IS 'Free-text description of the property storage location.';

COMMENT ON EXTENSION "btree_gist" IS 'support for indexing common datatypes in GiST';

COMMENT ON EXTENSION "pg_net" IS 'Async HTTP';

GRANT EXECUTE ON FUNCTION "public"."approve_registration_request"(uuid, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."archive_guest_key_holder"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."archive_guest_key_holder"(uuid) TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."cancel_reservation"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."checkout_key_set"(uuid, timestamp WITH time zone, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."checkout_key_set_to_guest"(uuid, uuid, timestamp WITH time zone, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."checkout_key_set_to_guest"(uuid, uuid, timestamp WITH time zone, text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."create_guest_key_holder"(text, text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."create_guest_key_holder"(text, text, text, text, text) TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."create_notification"(uuid, text, text, text, uuid, uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."current_user_is_admin"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."current_user_is_admin"() TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_account"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."dispatch_push_notification"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."get_account_status_by_email"(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."get_account_status_by_email"(text) TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_admin"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_approved"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."mark_notification_read"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."prevent_profile_protected_field_updates"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reject_registration_request"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."report_key_set_missing"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."reserve_key_set"(uuid, timestamp WITH time zone, timestamp WITH time zone, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."return_key_set"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."submit_registration_request"(text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."submit_registration_request"(text, text, text) TO "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."transfer_key_set_to_me"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."undo_key_set_missing_damaged"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."update_guest_key_holder"(uuid, text, text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."update_guest_key_holder"(uuid, text, text, text, text, text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON SCHEMA "public" FROM "supabase_auth_admin";

GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."key_holders" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."key_sets" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."keys" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."registration_requests" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reservations" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_push_tokens" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_dashboard_summary" TO "anon", "authenticated", "postgres", "service_role";

ALTER TABLE "public"."reservations"
  ADD CONSTRAINT "reservations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."transactions"
  ADD CONSTRAINT "transactions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

