/*
  # Unify Subscription System
  
  1. Changes
    - Updates the bid insertion RLS policy to check the businesses table subscription instead of Stripe tables
    - Syncs existing Stripe subscription data to the businesses table
    - Ensures single source of truth for subscription status
  
  2. Security
    - Maintains subscription requirement for bid submissions
    - Business owners must have an active subscription to submit bids
    - Validates business ownership by authenticated user
  
  3. Notes
    - The businesses.is_subscribed and businesses.subscription_expires_at fields are the single source of truth
    - These fields are automatically updated by the Stripe webhook when subscriptions change
*/

-- Sync existing trial subscriptions to businesses table
UPDATE businesses b
SET 
  is_subscribed = true,
  subscription_expires_at = to_timestamp(ss.current_period_end)
FROM stripe_customers sc
JOIN stripe_subscriptions ss ON ss.customer_id = sc.customer_id
WHERE b.owner_id = sc.user_id
  AND ss.status IN ('active', 'trialing')
  AND (b.is_subscribed = false OR b.subscription_expires_at IS NULL);

-- Drop the old policy
DROP POLICY IF EXISTS "Subscribed businesses can insert bids" ON bids;

-- Create new policy that checks businesses table subscription
CREATE POLICY "Subscribed businesses can insert bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = bids.business_id
        AND b.owner_id = (SELECT auth.uid())
        AND b.is_subscribed = true
        AND b.subscription_expires_at > now()
    )
  );