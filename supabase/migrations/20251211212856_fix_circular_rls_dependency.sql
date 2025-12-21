/*
  # Fix Circular RLS Dependency Between Jobs and Bids

  1. Problem
    - Jobs policy queries bids table to check "jobs they bid on"
    - Bids policy queries jobs table to check "bids on their jobs"
    - This creates infinite recursion: jobs → bids → jobs → bids...
  
  2. Solution
    - Use SECURITY DEFINER functions that bypass RLS
    - Functions check permissions directly without triggering RLS policies
    - Break the circular dependency chain
  
  3. Security
    - Functions validate auth.uid() directly
    - No RLS policies means no circular dependencies
    - Access control is still enforced via function logic
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Businesses can view jobs they bid on" ON jobs;
DROP POLICY IF EXISTS "Business owners can view own bids" ON bids;
DROP POLICY IF EXISTS "Job owners can view bids on their jobs" ON bids;

-- Create security definer function to check if user has bid on a job
CREATE OR REPLACE FUNCTION user_has_bid_on_job(job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bids b
    JOIN businesses bus ON b.business_id = bus.id
    WHERE b.job_id = job_id
      AND bus.owner_id = auth.uid()
  );
$$;

-- Create security definer function to check if user owns the job
CREATE OR REPLACE FUNCTION user_owns_job(job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jobs
    WHERE id = job_id
      AND customer_id = auth.uid()
  );
$$;

-- Create security definer function to check if business belongs to user
CREATE OR REPLACE FUNCTION business_belongs_to_user(business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM businesses
    WHERE id = business_id
      AND owner_id = auth.uid()
  );
$$;

-- Recreate jobs policy using security definer function
CREATE POLICY "Businesses can view jobs they bid on"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (user_has_bid_on_job(id));

-- Recreate bids policies using security definer functions
CREATE POLICY "Business owners can view own bids"
  ON bids
  FOR SELECT
  TO authenticated
  USING (business_belongs_to_user(business_id));

CREATE POLICY "Job owners can view bids on their jobs"
  ON bids
  FOR SELECT
  TO authenticated
  USING (user_owns_job(job_id));
