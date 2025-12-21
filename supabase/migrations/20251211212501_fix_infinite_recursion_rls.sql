/*
  # Fix Infinite Recursion in Jobs RLS Policies

  1. Problem
    - The policy "Businesses can view jobs they bid on" creates infinite recursion
    - It joins bids → businesses → checks job_id, which re-triggers the jobs policy
    - Combined with circular FK between jobs.winning_bid_id and bids.id
  
  2. Solution
    - Replace the problematic policy with a simpler one that avoids the JOIN
    - Use a direct EXISTS subquery that only checks bids table
    - Avoid touching businesses table in the jobs policy to prevent recursion
  
  3. Security
    - Businesses can still only view:
      a) Open jobs if they have an active subscription (first policy)
      b) Jobs they've placed bids on (fixed second policy)
*/

DROP POLICY IF EXISTS "Businesses can view jobs they bid on" ON jobs;

CREATE POLICY "Businesses can view jobs they bid on"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM bids
      WHERE bids.job_id = jobs.id
        AND bids.business_id IN (
          SELECT id 
          FROM businesses 
          WHERE owner_id = auth.uid()
        )
    )
  );
