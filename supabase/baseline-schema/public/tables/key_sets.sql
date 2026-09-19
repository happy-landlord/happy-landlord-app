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
  CONSTRAINT "key_sets_current_holder_id_fkey" FOREIGN KEY (current_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL,
  CONSTRAINT "key_sets_pkey" PRIMARY KEY (id),
  CONSTRAINT "key_sets_status_check"
    CHECK
    ((status = ANY (ARRAY['available'::text, 'checked_out'::text, 'overdue'::text, 'handover_tenant'::text, 'handover_landlord'::text, 'missing_damaged'::text,
    'inactive'::text]))),
  CONSTRAINT "key_sets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "key_sets_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

ALTER TABLE "public"."key_sets"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX key_sets_code_idx ON public.key_sets USING btree (code);

CREATE UNIQUE INDEX key_sets_qr_code_unique_idx ON public.key_sets USING btree (qr_code);

CREATE TRIGGER set_key_sets_updated_at
  BEFORE UPDATE ON public.key_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."key_sets" TO "anon", "authenticated", "postgres", "service_role";
