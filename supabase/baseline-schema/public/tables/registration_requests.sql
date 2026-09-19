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
  CONSTRAINT "registration_requests_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT "registration_requests_requested_role_check" CHECK ((requested_role = ANY (ARRAY['agent'::text, 'admin'::text]))),
  CONSTRAINT "registration_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "registration_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE "public"."registration_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX one_pending_registration_request_per_profile ON public.registration_requests USING btree (profile_id)
  WHERE (status = 'pending'::text);

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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."registration_requests" TO "anon", "authenticated", "postgres", "service_role";
