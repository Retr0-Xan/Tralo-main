-- Make documents bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documents';

-- Allow public read access to all files in documents bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');
