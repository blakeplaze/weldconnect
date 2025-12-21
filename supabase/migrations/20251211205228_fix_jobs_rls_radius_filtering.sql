/*
  # Fix Jobs RLS Policy for Radius-Based Filtering

  1. Changes
    - Drop the old city-based RLS policy that only showed jobs in the exact same city
    - Create a new policy that allows subscribed businesses to view all open jobs
    - The app will handle radius-based filtering using latitude/longitude calculations

  2. Security
    - Only subscribed businesses with active subscriptions can view jobs
    - Customers can still only view their own jobs
    - Radius filtering happens in the application layer for flexibility
*/

DROP POLICY IF EXISTS "Subscribed businesses can view jobs in their city" ON jobs;

CREATE POLICY "Subscribed businesses can view open jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    status = 'open' AND EXISTS (
      SELECT 1
      FROM businesses
      WHERE businesses.owner_id = auth.uid()
        AND businesses.is_subscribed = true
        AND businesses.subscription_expires_at > now()
    )
  );
