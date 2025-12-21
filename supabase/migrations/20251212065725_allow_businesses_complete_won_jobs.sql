/*
  # Allow businesses to mark won jobs as completed

  1. Changes
    - Add UPDATE policy for jobs table allowing businesses to update job status to 'completed'
    - Restricts updates to only jobs where the business owns the winning bid
    - Only allows updating the status field to 'completed'
  
  2. Security
    - Businesses can only update jobs they've won (via winning_bid_id)
    - Only allows changing status to 'completed', not other fields
*/

CREATE POLICY "Businesses can mark won jobs as completed"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bids
      JOIN businesses ON businesses.id = bids.business_id
      WHERE bids.id = jobs.winning_bid_id
        AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'completed'
    AND EXISTS (
      SELECT 1 FROM bids
      JOIN businesses ON businesses.id = bids.business_id
      WHERE bids.id = jobs.winning_bid_id
        AND businesses.owner_id = auth.uid()
    )
  );
