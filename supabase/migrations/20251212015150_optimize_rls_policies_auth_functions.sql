/*
  # Optimize RLS Policies for Performance

  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in all RLS policies
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale
  
  2. Tables Updated
    - profiles (4 policies)
    - businesses (3 policies)
    - bids (1 policy)
    - push_tokens (4 policies)
    - notifications (2 policies)
    - stripe_customers (1 policy)
    - stripe_subscriptions (1 policy)
    - stripe_orders (1 policy)
    - jobs (4 policies)
    - conversations (3 policies)
    - messages (3 policies)
  
  3. Notes
    - All policies are dropped and recreated with optimized auth function calls
    - Behavior remains the same, only performance improves
*/

-- Profiles policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view conversation participants" ON profiles;

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can view conversation participants"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE (conversations.customer_id = (select auth.uid())
         OR conversations.business_id = (select auth.uid()))
        AND (conversations.customer_id = profiles.id
         OR conversations.business_id = profiles.id)
    )
  );

-- Businesses policies
DROP POLICY IF EXISTS "Business owners can insert own business" ON businesses;
DROP POLICY IF EXISTS "Business owners can update own business" ON businesses;
DROP POLICY IF EXISTS "Business owners can view own business" ON businesses;

CREATE POLICY "Business owners can insert own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Business owners can update own business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()))
  WITH CHECK (owner_id = (select auth.uid()));

CREATE POLICY "Business owners can view own business"
  ON businesses FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- Bids policies
DROP POLICY IF EXISTS "Subscribed businesses can insert bids" ON bids;

CREATE POLICY "Subscribed businesses can insert bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      LEFT JOIN stripe_subscriptions s ON s.customer_id IN (
        SELECT customer_id FROM stripe_customers WHERE user_id = b.owner_id
      )
      WHERE b.id = bids.business_id
        AND b.owner_id = (select auth.uid())
        AND (s.status = 'active' OR s.status = 'trialing')
    )
  );

-- Push tokens policies
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can view their own push tokens" ON push_tokens;

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Notifications policies
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Stripe customers policies
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;

CREATE POLICY "Users can view their own customer data"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Stripe subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;

CREATE POLICY "Users can view their own subscription data"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = (select auth.uid()) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Stripe orders policies
DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;

CREATE POLICY "Users can view their own order data"
  ON stripe_orders FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = (select auth.uid()) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Jobs policies
DROP POLICY IF EXISTS "Customers can insert own jobs" ON jobs;
DROP POLICY IF EXISTS "Customers can update own jobs" ON jobs;
DROP POLICY IF EXISTS "Customers can view own jobs" ON jobs;
DROP POLICY IF EXISTS "Subscribed businesses can view open jobs" ON jobs;

CREATE POLICY "Customers can insert own jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Customers can update own jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Customers can view own jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Subscribed businesses can view open jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
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
  );

-- Conversations policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = (select auth.uid()) OR business_id = (select auth.uid())
  );

CREATE POLICY "Users can update conversations they participate in"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    customer_id = (select auth.uid()) OR business_id = (select auth.uid())
  )
  WITH CHECK (
    customer_id = (select auth.uid()) OR business_id = (select auth.uid())
  );

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    customer_id = (select auth.uid()) OR business_id = (select auth.uid())
  );

-- Messages policies
DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (select auth.uid())
         OR conversations.business_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (select auth.uid())
         OR conversations.business_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (select auth.uid())
         OR conversations.business_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (select auth.uid())
         OR conversations.business_id = (select auth.uid()))
    )
  );
