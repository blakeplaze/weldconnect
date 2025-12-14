/*
  # Allow Viewing Reviewer Profiles

  1. Changes
    - Add RLS policy to allow businesses to view profiles of customers who reviewed them
    - This enables displaying customer names on reviews

  2. Security
    - Only allows viewing profiles of customers who have created reviews
    - Businesses can only see profiles of their reviewers
*/

-- Policy: Users can view profiles of people who have reviewed them
CREATE POLICY "Users can view reviewer profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.customer_id = profiles.id
      AND reviews.business_id = auth.uid()
    )
  );
