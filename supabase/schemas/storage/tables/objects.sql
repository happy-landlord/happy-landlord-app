CREATE POLICY "Admins can delete key images" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'properties'::text) AND public.is_admin()));

CREATE POLICY "Admins can update key images" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'properties'::text) AND public.is_admin()))
  WITH CHECK (((bucket_id = 'properties'::text) AND public.is_admin()));

CREATE POLICY "Approved users can delete own profile image" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Approved users can read key images" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'properties'::text) AND public.is_approved()));

CREATE POLICY "Approved users can read profile images" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING (((bucket_id = 'profiles'::text) AND public.is_approved()));

CREATE POLICY "Approved users can update own profile image" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  WITH CHECK (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Approved users can upload key images" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'properties'::text) AND public.is_approved()));

CREATE POLICY "Approved users can upload own profile image" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'profiles'::text) AND public.is_approved() AND ((storage.foldername(name))[1] = (auth.uid())::text)));

CREATE POLICY "Draft property photos are admin only" ON "storage"."objects"
  AS RESTRICTIVE
  FOR ALL
  TO "anon", "authenticated"
  USING (((bucket_id <> 'properties'::text) OR (COALESCE((storage.foldername(name))[1], ''::text) <> 'drafts'::text) OR public.current_user_is_admin()))
  WITH CHECK (((bucket_id <> 'properties'::text) OR (COALESCE((storage.foldername(name))[1], ''::text) <> 'drafts'::text) OR public.current_user_is_admin()));
