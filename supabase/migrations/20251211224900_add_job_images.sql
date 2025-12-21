/*
  # Add Job Images Support

  1. Changes
    - Add `job_image_url` column to `jobs` table for storing job images
    - Create `job-images` storage bucket for storing job photos
    - Set up RLS policies for the storage bucket
  
  2. Security
    - Authenticated users can upload job images
    - All users can view job images (public read)
    - Only job owners can delete their job images
*/

-- Add job_image_url column to jobs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'job_image_url'
  ) THEN
    ALTER TABLE jobs ADD COLUMN job_image_url text;
  END IF;
END $$;

-- Create storage bucket for job images
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own job images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own job images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view job images" ON storage.objects;

-- Allow authenticated users to upload job images
CREATE POLICY "Authenticated users can upload job images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-images');

-- Allow authenticated users to update their own job images
CREATE POLICY "Users can update own job images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own job images
CREATE POLICY "Users can delete own job images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all job images
CREATE POLICY "Public can view job images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-images');