CREATE TABLE "public"."profiles" (
  "id"            uuid                     NOT NULL,
  "full_name"     text,
  "role"          text                     NOT NULL DEFAULT 'agent'::text,
  "created_at"    timestamp with time zone NOT NULL DEFAULT now(),
  "email"         text,
  "phone"         text,
  "status"        text                     NOT NULL DEFAULT 'pending'::text,
  "profile_image" text,
  CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'agent'::text]))),
  CONSTRAINT "profiles_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'inactive'::text])))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX profiles_phone_unique_idx ON public.profiles USING btree (phone)
  WHERE (phone IS NOT NULL);

CREATE TRIGGER prevent_profile_protected_field_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_protected_field_updates();

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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";
