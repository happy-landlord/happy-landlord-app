CREATE VIEW "public"."admin_dashboard_summary" WITH (security_invoker=true) AS  SELECT ( SELECT (count(*))::integer AS count
           FROM public.properties p
          WHERE (p.status <> 'inactive'::text)) AS total_properties,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status <> 'inactive'::text))) AS total_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'available'::text))) AS available_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'checked_out'::text))) AS checked_out_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'overdue'::text))) AS overdue_keysets,
    ( SELECT (count(*))::integer AS count
           FROM (public.key_sets ks
             JOIN public.properties p ON ((p.id = ks.property_id)))
          WHERE ((p.status = 'active'::text) AND (ks.status = 'missing_damaged'::text))) AS lost_keysets,
    ( SELECT (count(*))::integer AS count
           FROM public.properties p
          WHERE (p.status = 'leased'::text)) AS leased_properties,
    ( SELECT (count(*))::integer AS count
           FROM public.properties p
          WHERE (p.status = 'inactive'::text)) AS inactive_properties;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."admin_dashboard_summary" TO "anon", "authenticated", "postgres", "service_role";
