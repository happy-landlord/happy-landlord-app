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
  CONSTRAINT "user_push_tokens_user_id_expo_push_token_key" UNIQUE (user_id, expo_push_token),
  CONSTRAINT "user_push_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE "public"."user_push_tokens"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_user_push_tokens_active ON public.user_push_tokens USING btree (user_id, is_active);

CREATE INDEX idx_user_push_tokens_token ON public.user_push_tokens USING btree (expo_push_token);

CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens USING btree (user_id);

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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."user_push_tokens" TO "anon", "authenticated", "postgres", "service_role";
