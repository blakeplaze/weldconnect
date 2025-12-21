-- ============================================================================
-- WELDCONNECT DATABASE SETUP
-- Run this entire script in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/fydoqyuttiodmrlfsuxk/sql/new
-- ============================================================================

-- MIGRATION 1: Initial Schema
-- Copy from: supabase/migrations/20251220221642_initial_schema.sql

-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- CREATE CUSTOM TYPES
DO $$ BEGIN
  CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stripe_order_status AS ENUM (
    'pending',
    'completed',
    'canceled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- For the complete migration, please:
-- 1. Go to https://supabase.com/dashboard/project/fydoqyuttiodmrlfsuxk/sql/new
-- 2. Copy the ENTIRE contents of: supabase/migrations/20251220221642_initial_schema.sql
-- 3. Paste and Run it
-- 4. Then copy and run: supabase/migrations/20251220233707_add_walkthrough_completed_field.sql
