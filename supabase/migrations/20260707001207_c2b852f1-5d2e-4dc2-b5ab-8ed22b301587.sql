
CREATE POLICY teacher_photos_select_member ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'teacher-photos'
    AND (storage.foldername(name))[1] = public.current_user_institution()::text
  );

CREATE POLICY teacher_photos_insert_director ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-photos'
    AND (storage.foldername(name))[1] = public.current_user_institution()::text
    AND public.has_role(auth.uid(), 'director')
  );

CREATE POLICY teacher_photos_update_director ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'teacher-photos'
    AND (storage.foldername(name))[1] = public.current_user_institution()::text
    AND public.has_role(auth.uid(), 'director')
  );

CREATE POLICY teacher_photos_delete_director ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'teacher-photos'
    AND (storage.foldername(name))[1] = public.current_user_institution()::text
    AND public.has_role(auth.uid(), 'director')
  );
