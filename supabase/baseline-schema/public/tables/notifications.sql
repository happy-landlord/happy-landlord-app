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
    'USER_REGISTRATION_REQUESTED'::text]))),
  CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_recipient_created ON public.notifications USING btree (recipient_user_id, created_at DESC);

CREATE INDEX idx_notifications_recipient_read ON public.notifications USING btree (recipient_user_id, read_at);

CREATE INDEX idx_notifications_sent_at ON public.notifications USING btree (sent_at);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (TYPE);

CREATE TRIGGER on_notification_created_dispatch_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_push_notification();

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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "anon", "authenticated", "postgres", "service_role";
