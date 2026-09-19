CREATE TABLE "public"."properties" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_code"      text                     NOT NULL,
  "address"            text                     NOT NULL,
  "suburb"             text                     NOT NULL,
  "city"               text                     NOT NULL DEFAULT 'Sydney'::text,
  "postcode"           text,
  "formatted_address"  text,
  "google_place_id"    text,
  "latitude"           numeric(10,7),
  "longitude"          numeric(10,7),
  "property_type"      text                     NOT NULL,
  "created_by"         uuid,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "unit_number"        text,
  "landlord_holder_id" uuid,
  "images"             jsonb                    NOT NULL DEFAULT '[]'::jsonb,
  "status"             text                     NOT NULL DEFAULT 'active'::text,
  "developer_name"     text,
  "cabinet_code"       text,
  "title"              text,
  "draft_data"         jsonb,
  "lot_number"         text,
  "consultant_name"    text,
  "maa_fee"            numeric(12,2),
  "defects"            text,
  "parking_location"   text,
  "storage_location"   text,
  "bedrooms"           smallint,
  "bathrooms"          smallint,
  "carparks"           smallint,
  "notes"              text,
  "rental_status"      text,
  CONSTRAINT "properties_bathrooms_nonnegative_check" CHECK (((bathrooms IS NULL) OR (bathrooms >= 0))),
  CONSTRAINT "properties_bedrooms_nonnegative_check" CHECK (((bedrooms IS NULL) OR (bedrooms >= 0))),
  CONSTRAINT "properties_carparks_nonnegative_check" CHECK (((carparks IS NULL) OR (carparks >= 0))),
  CONSTRAINT "properties_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT "properties_draft_data_object_check" CHECK (((draft_data IS NULL) OR (jsonb_typeof(draft_data) = 'object'::text))),
  CONSTRAINT "properties_draft_data_size_check" CHECK (((draft_data IS NULL) OR (octet_length((draft_data)::text) <= 1048576))),
  CONSTRAINT "properties_draft_shape_check" CHECK ((((status = 'draft'::text) AND (draft_data IS NOT NULL)) OR ((status <> 'draft'::text) AND (draft_data IS NULL)))),
  CONSTRAINT "properties_landlord_holder_id_fkey" FOREIGN KEY (landlord_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL,
  CONSTRAINT "properties_maa_fee_nonnegative_check" CHECK (((maa_fee IS NULL) OR (maa_fee >= (0)::numeric))),
  CONSTRAINT "properties_pkey" PRIMARY KEY (id),
  CONSTRAINT "properties_property_code_key" UNIQUE (property_code),
  CONSTRAINT "properties_property_type_check"
    CHECK ((property_type = ANY (ARRAY['house'::text, 'townhouse'::text, 'apartment'::text, 'unit'::text, 'duplex'::text, 'villa'::text, 'other'::text]))),
  CONSTRAINT "properties_rental_status_check" CHECK (((rental_status IS NULL) OR (rental_status = ANY (ARRAY['short'::text, 'long'::text])))),
  CONSTRAINT "properties_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'leased'::text, 'inactive'::text, 'draft'::text])))
);

ALTER TABLE "public"."properties"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_properties_title ON public.properties USING gin (to_tsvector('english'::regconfig, COALESCE(title, ''::text)));

CREATE INDEX properties_building_units_lookup_idx ON public.properties USING btree (google_place_id, lower(COALESCE(NULLIF(btrim(unit_number), ''::text), ''::text)))
  WHERE ((google_place_id IS NOT NULL) AND (btrim(google_place_id) <> ''::text));

CREATE INDEX properties_cabinet_code_idx ON public.properties USING btree (cabinet_code);

CREATE INDEX properties_developer_name_idx ON public.properties USING btree (developer_name);

CREATE INDEX properties_drafts_updated_at_idx ON public.properties USING btree (updated_at DESC)
  WHERE (status = 'draft'::text);

CREATE UNIQUE INDEX properties_google_place_unit_unique_idx ON public.properties USING btree (google_place_id, lower(COALESCE(NULLIF(btrim(unit_number), ''::text), ''::text)))
  WHERE ((google_place_id IS NOT NULL) AND (btrim(google_place_id) <> ''::text) AND (status <> 'draft'::text));

CREATE INDEX properties_landlord_holder_id_idx ON public.properties USING btree (landlord_holder_id);

CREATE INDEX properties_property_code_idx ON public.properties USING btree (property_code);

CREATE INDEX properties_suburb_idx ON public.properties USING btree (suburb);

CREATE TRIGGER set_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Admins can create properties" ON "public"."properties"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete properties" ON "public"."properties"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can update properties" ON "public"."properties"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view properties" ON "public"."properties"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Draft properties are admin only" ON "public"."properties"
  AS RESTRICTIVE
  FOR ALL
  TO "authenticated"
  USING (((status <> 'draft'::text) OR public.current_user_is_admin()))
  WITH CHECK (((status <> 'draft'::text) OR public.current_user_is_admin()));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "anon", "authenticated", "postgres", "service_role";

COMMENT ON COLUMN "public"."properties"."bathrooms" IS 'Number of bathrooms.';

COMMENT ON COLUMN "public"."properties"."bedrooms" IS 'Number of bedrooms.';

COMMENT ON COLUMN "public"."properties"."carparks" IS 'Number of car parks.';

COMMENT ON COLUMN "public"."properties"."consultant_name" IS 'Consultant responsible for the property.';

COMMENT ON COLUMN "public"."properties"."defects" IS 'Free-text defects and condition notes.';

COMMENT ON COLUMN "public"."properties"."draft_data" IS 'Resumable add-property wizard snapshot while status is draft.';

COMMENT ON COLUMN "public"."properties"."lot_number" IS 'Lot identifier supplied for the property.';

COMMENT ON COLUMN "public"."properties"."maa_fee" IS 'MAA fee stored as a non-negative decimal value.';

COMMENT ON COLUMN "public"."properties"."notes" IS 'Free-text property notes, including amenities and other useful details.';

COMMENT ON COLUMN "public"."properties"."parking_location" IS 'Free-text description of the property parking location.';

COMMENT ON COLUMN "public"."properties"."rental_status" IS 'Rental term classification: short or long.';

COMMENT ON COLUMN "public"."properties"."storage_location" IS 'Free-text description of the property storage location.';
