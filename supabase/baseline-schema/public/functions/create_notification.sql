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

GRANT EXECUTE ON FUNCTION "public"."create_notification"(uuid, text, text, text, uuid, uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
