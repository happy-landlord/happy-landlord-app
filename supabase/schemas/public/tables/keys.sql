CREATE TABLE "public"."keys" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id" uuid                     NOT NULL,
  "key_type"    text                     NOT NULL,
  "label"       text                     NOT NULL,
  "notes"       text,
  "created_by"  uuid,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "key_set_id"  uuid,
  "code"        text,
  "quantity"    integer                  NOT NULL DEFAULT 1,
  CONSTRAINT "keys_key_set_id_fkey" FOREIGN KEY (key_set_id) REFERENCES public.key_sets(id) ON DELETE CASCADE,
  CONSTRAINT "keys_key_type_check"
    CHECK
    ((key_type = ANY (ARRAY['main_door'::text, 'fire_door'::text, 'swipe_fob'::text, 'mailbox'::text, 'window'::text, 'garage_remote'::text, 'key_card'::text, 'storage_cage'::text,
    'common_area'::text, 'security'::text, 'balcony'::text, 'other'::text]))),
  CONSTRAINT "keys_pkey" PRIMARY KEY (id),
  CONSTRAINT "keys_quantity_check" CHECK ((quantity > 0)),
  CONSTRAINT "keys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "keys_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE
);

ALTER TABLE "public"."keys"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX keys_property_id_idx ON public.keys USING btree (property_id);

CREATE TRIGGER set_keys_updated_at
  BEFORE UPDATE ON public.keys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins can create keys" ON "public"."keys"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete keys" ON "public"."keys"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update keys" ON "public"."keys"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can read keys" ON "public"."keys"
  FOR SELECT
  TO "authenticated"
  USING (public.is_approved());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."keys" TO "anon", "authenticated", "postgres", "service_role";
