
CREATE POLICY "Public can view marketplace images" ON storage.objects FOR SELECT USING (bucket_id = 'marketplace-images');
CREATE POLICY "Users can upload own marketplace images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'marketplace-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own marketplace images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'marketplace-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own marketplace images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'marketplace-images' AND auth.uid()::text = (storage.foldername(name))[1]);
