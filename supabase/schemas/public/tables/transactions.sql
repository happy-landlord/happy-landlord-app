CREATE TABLE "public"."transactions" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "key_set_id"       uuid                     NOT NULL,
  "property_id"      uuid                     NOT NULL,
  "transaction_type" text                     NOT NULL,
  "from_holder_id"   uuid,
  "to_holder_id"     uuid,
  "due_back_at"      timestamp with time zone,
  "notes"            text,
  "created_at"       timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "transactions_from_holder_id_fkey" FOREIGN KEY (from_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_key_set_id_fkey" FOREIGN KEY (key_set_id) REFERENCES public.key_sets(id) ON DELETE CASCADE,
  CONSTRAINT "transactions_pkey" PRIMARY KEY (id),
  CONSTRAINT "transactions_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  CONSTRAINT "transactions_to_holder_id_fkey" FOREIGN KEY (to_holder_id) REFERENCES public.key_holders(id) ON DELETE SET NULL,
  CONSTRAINT "transactions_transaction_type_check"
    CHECK
    ((transaction_type = ANY (ARRAY['created'::text, 'checked_out'::text, 'returned'::text, 'transferred'::text, 'marked_overdue'::text, 'marked_missing_damaged'::text,
    'resolved_missing_damaged'::text, 'handover_tenant'::text, 'handover_landlord'::text, 'notes_updated'::text]))),
  "updated_by"       uuid                     DEFAULT auth.uid(),
  CONSTRAINT "transactions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE "public"."transactions"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX transactions_created_at_idx ON public.transactions USING btree (created_at);

CREATE INDEX transactions_key_set_id_idx ON public.transactions USING btree (key_set_id);

CREATE INDEX transactions_property_id_idx ON public.transactions USING btree (property_id);

CREATE POLICY "Admins can create transactions" ON "public"."transactions"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update transactions" ON "public"."transactions"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users can read transactions" ON "public"."transactions"
  FOR SELECT
  TO "authenticated"
  USING (public.is_approved());

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."transactions" TO "anon", "authenticated", "postgres", "service_role";
