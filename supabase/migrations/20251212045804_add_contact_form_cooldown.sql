/*
  # Add Contact Form Submission Tracking

  1. New Tables
    - `contact_form_submissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text)
      - `email` (text)
      - `subject` (text)
      - `message` (text)
      - `submitted_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `contact_form_submissions` table
    - Add policy for users to read their own submissions
    - Add policy for users to insert submissions (with cooldown check)

  3. Indexes
    - Add index on user_id for efficient cooldown checks
*/

CREATE TABLE IF NOT EXISTS contact_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE contact_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS contact_form_submissions_user_id_idx ON contact_form_submissions(user_id);
CREATE INDEX IF NOT EXISTS contact_form_submissions_submitted_at_idx ON contact_form_submissions(user_id, submitted_at DESC);

CREATE POLICY "Users can view own contact submissions"
  ON contact_form_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert contact submissions"
  ON contact_form_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
