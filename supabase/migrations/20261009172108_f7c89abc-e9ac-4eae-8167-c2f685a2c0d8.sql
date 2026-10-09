DROP POLICY IF EXISTS "Public can view marketplace images" ON storage.objects;
CREATE POLICY "Signed-in users can view marketplace images" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'marketplace-images');