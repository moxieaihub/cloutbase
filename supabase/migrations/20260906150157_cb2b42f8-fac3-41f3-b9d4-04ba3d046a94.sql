CREATE POLICY "Signed-in users view course thumbnails" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-assets' AND (storage.foldername(name))[1] = 'thumbnails');

CREATE POLICY "Buyers view course workbooks" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-assets'
    AND (storage.foldername(name))[1] = 'workbooks'
    AND (
      public.is_admin(auth.uid())
      OR public.owns_course(auth.uid(), NULLIF((storage.foldername(name))[2], '')::uuid)
    )
  );

CREATE POLICY "Admins upload course assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-assets' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins update course assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-assets' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'course-assets' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete course assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-assets' AND public.is_admin(auth.uid()));