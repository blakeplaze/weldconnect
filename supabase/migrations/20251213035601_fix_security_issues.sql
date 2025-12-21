/*
  # Fix Security Issues

  1. Foreign Key Indexes
    - Add index on `businesses.owner_id` for optimal query performance
    - Add index on `messages.sender_id` for optimal query performance  
    - Add index on `notifications.user_id` for optimal query performance
    - These indexes are critical for JOIN operations and foreign key lookups

  2. Function Security
    - Fix `grant_free_beta_subscription` function to use immutable search_path
    - Set explicit search_path to prevent SQL injection vulnerabilities
    - Use SECURITY DEFINER with stable search_path for security

  3. Notes
    - Foreign key indexes dramatically improve performance on large datasets
    - Mutable search_path in SECURITY DEFINER functions is a security risk
    - Auth connection strategy and leaked password protection must be configured in dashboard
*/

-- Add missing foreign key indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Fix function to use immutable search_path (prevents SQL injection in SECURITY DEFINER functions)
CREATE OR REPLACE FUNCTION grant_free_beta_subscription()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.is_subscribed := true;
  NEW.subscription_expires_at := '2025-12-31 23:59:59'::timestamp;
  RETURN NEW;
END;
$$;
