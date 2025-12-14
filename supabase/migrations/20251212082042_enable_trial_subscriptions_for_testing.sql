/*
  # Enable Trial Subscriptions for Testing
  
  1. Changes
    - Updates existing businesses without subscriptions to have a trial subscription
    - Allows businesses to test bidding functionality
  
  2. Security
    - No changes to RLS policies
    - Maintains subscription requirement for bid submissions
*/

-- Update stripe_subscriptions to set trialing status for existing customers
UPDATE stripe_subscriptions
SET 
  status = 'trialing',
  current_period_start = EXTRACT(EPOCH FROM now())::bigint,
  current_period_end = EXTRACT(EPOCH FROM (now() + interval '30 days'))::bigint,
  updated_at = now()
WHERE status = 'not_started';

-- For businesses without any stripe customer record, create them with trialing subscription
INSERT INTO stripe_customers (user_id, customer_id, created_at, updated_at)
SELECT 
  b.owner_id,
  'cus_trial_' || gen_random_uuid()::text,
  now(),
  now()
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM stripe_customers sc WHERE sc.user_id = b.owner_id
)
ON CONFLICT (user_id) DO NOTHING;

-- Create trial subscriptions for new stripe customers
INSERT INTO stripe_subscriptions (customer_id, status, current_period_start, current_period_end, created_at, updated_at)
SELECT 
  sc.customer_id,
  'trialing',
  EXTRACT(EPOCH FROM now())::bigint,
  EXTRACT(EPOCH FROM (now() + interval '30 days'))::bigint,
  now(),
  now()
FROM stripe_customers sc
WHERE NOT EXISTS (
  SELECT 1 FROM stripe_subscriptions ss WHERE ss.customer_id = sc.customer_id
)
ON CONFLICT (customer_id) DO NOTHING;