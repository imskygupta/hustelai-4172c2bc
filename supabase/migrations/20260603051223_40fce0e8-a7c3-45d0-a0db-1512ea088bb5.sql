
CREATE POLICY "users upload own pdf-studio files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pdf-studio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users read own pdf-studio files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pdf-studio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own pdf-studio files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pdf-studio' AND auth.uid()::text = (storage.foldername(name))[1]);
