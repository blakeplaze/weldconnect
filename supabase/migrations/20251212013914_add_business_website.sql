/*
  # Add Website Field to Businesses

  1. Changes
    - Add `website` column to `businesses` table to store business website URL
    - This allows businesses to share their website link with customers

  2. Security
    - No RLS changes needed as the column inherits existing policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'website'
  ) THEN
    ALTER TABLE businesses ADD COLUMN website text;
  END IF;
END $$;
