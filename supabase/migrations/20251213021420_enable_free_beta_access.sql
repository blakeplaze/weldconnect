/*
  # Enable Free Beta Access

  1. Changes
    - Grants all businesses a free subscription valid until end of 2025
    - Automatically grants new businesses a free subscription on creation
    - Removes subscription requirement for beta testing period

  2. Security
    - Maintains RLS policies (they just always pass now)
    - No changes to authentication or authorization

  3. Notes
    - Can be reverted by removing this migration and restoring subscription checks
    - Expiration date set to Dec 31, 2025 to allow for full year of beta testing
*/

-- Grant all existing businesses a free subscription
UPDATE businesses
SET
  is_subscribed = true,
  subscription_expires_at = '2025-12-31 23:59:59'
WHERE is_subscribed = false OR subscription_expires_at IS NULL OR subscription_expires_at < now();

-- Create a function to automatically grant free subscriptions to new businesses
CREATE OR REPLACE FUNCTION grant_free_beta_subscription()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_subscribed := true;
  NEW.subscription_expires_at := '2025-12-31 23:59:59'::timestamp;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically grant free subscriptions
DROP TRIGGER IF EXISTS auto_grant_free_subscription ON businesses;
CREATE TRIGGER auto_grant_free_subscription
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION grant_free_beta_subscription();
