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
  CONSTRAINT "no_overlapping_active_reservations" EXCLUDE USING gist (key_set_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status = 'active'::text)),
  CONSTRAINT "reservations_key_set_id_fkey" FOREIGN KEY (key_set_id) REFERENCES public.key_sets(id) ON DELETE CASCADE,
  CONSTRAINT "reservations_pkey" PRIMARY KEY (id),
  CONSTRAINT "reservations_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "reservations_reserved_by_holder_id_fkey" FOREIGN KEY (reserved_by_holder_id) REFERENCES public.key_holders(id) ON DELETE CASCADE,
  CONSTRAINT "reservations_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'cancelled'::text, 'completed'::text, 'expired'::text]))),
  CONSTRAINT "reservations_time_valid" CHECK ((ends_at > starts_at)),
  "created_by"            uuid                     DEFAULT auth.uid(),
  CONSTRAINT "reservations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE "public"."reservations"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX reservations_key_set_id_idx ON public.reservations USING btree (key_set_id);

CREATE INDEX reservations_property_id_idx ON public.reservations USING btree (property_id);

CREATE INDEX reservations_reserved_by_holder_id_idx ON public.reservations USING btree (reserved_by_holder_id);

CREATE INDEX reservations_time_idx ON public.reservations USING btree (starts_at, ends_at);

CREATE TRIGGER set_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

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

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."reservations" TO "anon", "authenticated", "postgres", "service_role";
