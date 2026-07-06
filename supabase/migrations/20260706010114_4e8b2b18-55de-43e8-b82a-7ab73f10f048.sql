
CREATE POLICY "student_photos_read_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-photos');

CREATE POLICY "student_photos_director_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-photos'
    AND public.has_role(auth.uid(), 'director')
  );

CREATE POLICY "student_photos_director_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND public.has_role(auth.uid(), 'director')
  );

CREATE POLICY "student_photos_director_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-photos'
    AND public.has_role(auth.uid(), 'director')
  );
