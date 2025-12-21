/*
  # Add Theme Preference to User Profiles

  1. Changes
    - Add `theme_preference` column to `profiles` table
      - Type: text
      - Values: 'light' or 'dark'
      - Default: 'light'
      - Not null constraint
  
  2. Security
    - No RLS changes needed (existing policies cover this column)
  
  3. Notes
    - Allows users to persist their theme preference across sessions
    - Defaults to light mode for existing and new users
*/

-- Add theme_preference column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE profiles ADD COLUMN theme_preference text DEFAULT 'light' NOT NULL CHECK (theme_preference IN ('light', 'dark'));
  END IF;
END $$;