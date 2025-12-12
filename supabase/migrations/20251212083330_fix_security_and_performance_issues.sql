/*
  # Fix Security and Performance Issues
  
  1. Auth RLS Optimization
    - Update RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - Prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale
  
  2. Index Cleanup
    - Remove unused indexes that add maintenance overhead
    - Keeps database lean and efficient
  
  3. Policy Consolidation
    - Merge multiple permissive policies into single policies
    - Simplifies policy management and improves clarity
  
  4. Function Security
    - Fix mutable search_path in functions
    - Prevents potential security vulnerabilities
*/

-- ============================================================================
-- 1. OPTIMIZE RLS POLICIES - Replace auth.uid() with (select auth.uid())
-- ============================================================================

-- contact_form_submissions policies
DROP POLICY IF EXISTS "Users can insert contact submissions" ON contact_form_submissions;
CREATE POLICY "Users can insert contact submissions"
  ON contact_form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own contact submissions" ON contact_form_submissions;
CREATE POLICY "Users can view own contact submissions"
  ON contact_form_submissions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- conversations policies
DROP POLICY IF EXISTS "Conversation participants can delete conversations" ON conversations;
CREATE POLICY "Conversation participants can delete conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR business_id = (SELECT auth.uid())
  );

-- messages policies
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()));

-- reviews policies
DROP POLICY IF EXISTS "Customers can create reviews for completed jobs" ON reviews;
CREATE POLICY "Customers can create reviews for completed jobs"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = reviews.job_id
        AND jobs.customer_id = (SELECT auth.uid())
        AND jobs.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Customers can update own reviews" ON reviews;
CREATE POLICY "Customers can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = reviews.job_id
        AND jobs.customer_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = reviews.job_id
        AND jobs.customer_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Customers can delete own reviews" ON reviews;
CREATE POLICY "Customers can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = reviews.job_id
        AND jobs.customer_id = (SELECT auth.uid())
    )
  );

-- jobs policies - will be consolidated later
DROP POLICY IF EXISTS "Businesses can mark won jobs as completed" ON jobs;
CREATE POLICY "Businesses can mark won jobs as completed"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    status = 'awarded'
    AND EXISTS (
      SELECT 1 FROM bids
      WHERE bids.id = jobs.winning_bid_id
        AND EXISTS (
          SELECT 1 FROM businesses
          WHERE businesses.id = bids.business_id
            AND businesses.owner_id = (SELECT auth.uid())
        )
    )
  )
  WITH CHECK (
    status = 'completed'
    AND EXISTS (
      SELECT 1 FROM bids
      WHERE bids.id = jobs.winning_bid_id
        AND EXISTS (
          SELECT 1 FROM businesses
          WHERE businesses.id = bids.business_id
            AND businesses.owner_id = (SELECT auth.uid())
        )
    )
  );

-- profiles policies - will be consolidated later
DROP POLICY IF EXISTS "Users can view reviewer profiles" ON profiles;
CREATE POLICY "Users can view reviewer profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT DISTINCT b.owner_id
      FROM businesses b
      JOIN reviews r ON r.business_id = b.id
      WHERE r.job_id IN (
        SELECT id FROM jobs
        WHERE customer_id = (SELECT auth.uid())
      )
    )
  );

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_businesses_owner_id;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_reviews_created_at;
DROP INDEX IF EXISTS idx_reviews_rating;
DROP INDEX IF EXISTS idx_messages_sender_id;
DROP INDEX IF EXISTS contact_form_submissions_user_id_idx;

-- ============================================================================
-- 3. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

-- Consolidate jobs UPDATE policies
DROP POLICY IF EXISTS "Businesses can mark won jobs as completed" ON jobs;
DROP POLICY IF EXISTS "Customers can update own jobs" ON jobs;

CREATE POLICY "Users can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    -- Customers can update their own jobs
    customer_id = (SELECT auth.uid())
    OR
    -- Businesses can mark won jobs as completed
    (
      status = 'awarded'
      AND EXISTS (
        SELECT 1 FROM bids
        WHERE bids.id = jobs.winning_bid_id
          AND EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = bids.business_id
              AND businesses.owner_id = (SELECT auth.uid())
          )
      )
    )
  )
  WITH CHECK (
    -- Customers can update their own jobs
    customer_id = (SELECT auth.uid())
    OR
    -- Businesses can only set status to completed
    (
      status = 'completed'
      AND EXISTS (
        SELECT 1 FROM bids
        WHERE bids.id = jobs.winning_bid_id
          AND EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = bids.business_id
              AND businesses.owner_id = (SELECT auth.uid())
          )
      )
    )
  );

-- Consolidate profiles SELECT policies
DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view reviewer profiles" ON profiles;

CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own profile
    id = (SELECT auth.uid())
    OR
    -- Users can view profiles of job customers
    id IN (
      SELECT DISTINCT j.customer_id
      FROM jobs j
      JOIN bids b ON b.job_id = j.id
      JOIN businesses bus ON bus.id = b.business_id
      WHERE bus.owner_id = (SELECT auth.uid())
    )
    OR
    -- Users can view profiles of bidding businesses
    id IN (
      SELECT DISTINCT bus.owner_id
      FROM businesses bus
      JOIN bids b ON b.business_id = bus.id
      WHERE b.job_id IN (
        SELECT id FROM jobs
        WHERE customer_id = (SELECT auth.uid())
      )
    )
    OR
    -- Users can view profiles of conversation participants
    id IN (
      SELECT customer_id FROM conversations WHERE business_id = (SELECT auth.uid())
      UNION
      SELECT business_id FROM conversations WHERE customer_id = (SELECT auth.uid())
    )
    OR
    -- Users can view profiles of reviewers
    id IN (
      SELECT DISTINCT b.owner_id
      FROM businesses b
      JOIN reviews r ON r.business_id = b.id
      WHERE r.job_id IN (
        SELECT id FROM jobs
        WHERE customer_id = (SELECT auth.uid())
      )
    )
  );

-- ============================================================================
-- 4. FIX FUNCTION SEARCH PATH
-- ============================================================================

CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE businesses
  SET 
    total_rating = (
      SELECT COALESCE(SUM(rating), 0)
      FROM reviews
      WHERE business_id = NEW.business_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE business_id = NEW.business_id
    )
  WHERE id = NEW.business_id;
  
  RETURN NEW;
END;
$$;