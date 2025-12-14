/*
  # Allow businesses to view jobs they've bid on

  1. Changes
    - Add SELECT policy on jobs table for businesses to view jobs they've placed bids on
    - This allows businesses to see job details in "My Bids" screen regardless of job status
  
  2. Security
    - Policy checks that a bid exists linking the business to the job
    - Ensures businesses can only view jobs they've actually bid on
*/

CREATE POLICY "Businesses can view jobs they bid on"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM bids
      JOIN businesses ON businesses.id = bids.business_id
      WHERE bids.job_id = jobs.id
        AND businesses.owner_id = auth.uid()
    )
  );
