/*
  # Allow Businesses to Submit Bids Without Subscription

  1. Changes
    - Updates the "Subscribed businesses can insert bids" policy
    - Removes the Stripe subscription requirement for submitting bids
    - Now allows any authenticated business owner to submit bids
  
  2. Security
    - Still validates that the bid is from a business owned by the authenticated user
    - Prevents users from submitting bids on behalf of other businesses
  
  3. Notes
    - Subscription checks can be added back later as business logic
    - This unblocks the core bidding functionality
*/

DROP POLICY IF EXISTS "Subscribed businesses can insert bids" ON bids;

CREATE POLICY "Business owners can insert bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = bids.business_id
        AND b.owner_id = (select auth.uid())
    )
  );
