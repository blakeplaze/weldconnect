/*
  # Add Job Posting Cooldown

  1. Changes
    - Add `last_job_posted_at` column to `profiles` table to track when user last posted a job
    - This enables spam prevention by enforcing cooldown periods between job posts

  2. Purpose
    - Prevent spam by tracking the last time a user posted a job
    - Allows enforcement of cooldown periods (e.g., 2 minutes between posts)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_job_posted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_job_posted_at timestamptz;
  END IF;
END $$;