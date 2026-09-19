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
  CONSTRAINT "non_agent_holder_must_have_name" CHECK (((holder_type = 'agent'::text) OR (full_name IS NOT NULL))),
  CONSTRAINT "key_holders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT "key_holders_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE "public"."key_holders"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX key_holders_active_guests_company_idx ON public.key_holders USING btree (lower(company_name))
  WHERE ((holder_type = 'guest'::text) AND is_active AND (company_name IS NOT NULL));

CREATE INDEX key_holders_active_guests_name_idx ON public.key_holders USING btree (lower(full_name))
  WHERE ((holder_type = 'guest'::text) AND is_active);

CREATE TRIGGER set_key_holders_updated_at
  BEFORE UPDATE ON public.key_holders
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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."key_holders" TO "anon", "authenticated", "postgres", "service_role";
