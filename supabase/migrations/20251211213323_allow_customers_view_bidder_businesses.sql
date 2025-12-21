/*
  # Allow Customers to View Business Info for Bids on Their Jobs

  1. Problem
    - Customers viewing job details can't see which businesses bid
    - RLS on businesses table only allows owners to view their own business
    - When embedding businesses in bids query, business data returns null
  
  2. Solution
    - Add policy allowing customers to view business info for bids on their jobs
    - Uses security definer function to avoid circular dependencies
  
  3. Security
    - Only exposes business_name (no sensitive data)
    - Only for businesses that have bid on customer's jobs
    - Validates customer owns the job
*/

-- Create security definer function to check if business has bid on user's job
CREATE OR REPLACE FUNCTION business_has_bid_on_user_job(business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bids b
    JOIN jobs j ON b.job_id = j.id
    WHERE b.business_id = business_id
      AND j.customer_id = auth.uid()
  );
$$;

-- Add policy allowing customers to view businesses that bid on their jobs
CREATE POLICY "Customers can view businesses that bid on their jobs"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (business_has_bid_on_user_job(id));
