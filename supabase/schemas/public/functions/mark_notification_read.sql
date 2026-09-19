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

GRANT EXECUTE ON FUNCTION "public"."mark_notification_read"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
