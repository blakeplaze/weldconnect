/*
  # Revert: Require Stripe Subscription for Bid Submissions

  1. Changes
    - Reverts the bid insertion policy back to requiring active Stripe subscription
    - Business owners must have an active or trialing subscription to submit bids
  
  2. Security
    - Validates business ownership by authenticated user
    - Validates active Stripe subscription status
  
  3. Notes
    - This restores the subscription requirement for the bidding functionality
*/

DROP POLICY IF EXISTS "Business owners can insert bids" ON bids;

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
