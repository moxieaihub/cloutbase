CREATE POLICY "Owners manage own campaign assets"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'campaign-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Authenticated can read campaign assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'campaign-assets');