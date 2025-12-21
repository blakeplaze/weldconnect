/*
  # Consolidate Multiple Permissive RLS Policies

  1. Security Improvements
    - Consolidate multiple SELECT policies into single policies with OR conditions
    - Reduces policy evaluation overhead
    - Maintains same security behavior but with better performance
  
  2. Tables Updated
    - bids: Merge 2 policies into 1
    - businesses: Merge 2 policies into 1
    - jobs: Merge 3 policies into 1
    - profiles: Merge 2 policies into 1
  
  3. Notes
    - Original behavior is preserved
    - All conditions are combined with OR logic
    - More efficient single policy evaluation
*/

-- Consolidate bids policies
DROP POLICY IF EXISTS "Business owners can view own bids" ON bids;
DROP POLICY IF EXISTS "Job owners can view bids on their jobs" ON bids;

CREATE POLICY "Users can view relevant bids"
  ON bids FOR SELECT
  TO authenticated
  USING (
    business_belongs_to_user(business_id) 
    OR user_owns_job(job_id)
  );

-- Consolidate businesses policies
DROP POLICY IF EXISTS "Business owners can view own business" ON businesses;
DROP POLICY IF EXISTS "Customers can view businesses that bid on their jobs" ON businesses;

CREATE POLICY "Users can view relevant businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR business_has_bid_on_user_job(id)
  );

-- Consolidate jobs policies
DROP POLICY IF EXISTS "Businesses can view jobs they bid on" ON jobs;
DROP POLICY IF EXISTS "Customers can view own jobs" ON jobs;
DROP POLICY IF EXISTS "Subscribed businesses can view open jobs" ON jobs;

CREATE POLICY "Users can view relevant jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    customer_id = (select auth.uid())
    OR user_has_bid_on_job(id)
    OR (
      status = 'open'
      AND EXISTS (
        SELECT 1 FROM businesses b
        LEFT JOIN stripe_subscriptions s ON s.customer_id IN (
          SELECT customer_id FROM stripe_customers WHERE user_id = b.owner_id
        )
        WHERE b.owner_id = (select auth.uid())
          AND (s.status = 'active' OR s.status = 'trialing')
          AND calculate_distance(jobs.latitude, jobs.longitude, b.latitude, b.longitude) <= b.radius_miles
      )
    )
  );

-- Consolidate profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view conversation participants" ON profiles;

CREATE POLICY "Users can view relevant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE (conversations.customer_id = (select auth.uid())
         OR conversations.business_id = (select auth.uid()))
        AND (conversations.customer_id = profiles.id
         OR conversations.business_id = profiles.id)
    )
  );
