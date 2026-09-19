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

GRANT EXECUTE ON FUNCTION "public"."dispatch_push_notification"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

