/*
  # Add Walkthrough Completion Tracking

  1. Changes
    - Add `has_completed_walkthrough` field to profiles table
    - Set default to false for new users
    - Update existing users to false (they haven't seen the new walkthrough)
  
  2. Purpose
    - Track whether user has completed the onboarding walkthrough
    - Enable first-time user experience with interactive feature introductions
*/

-- Add walkthrough completion field to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'has_completed_walkthrough'
  ) THEN
    ALTER TABLE profiles ADD COLUMN has_completed_walkthrough boolean DEFAULT false NOT NULL;
  END IF;
END $$;