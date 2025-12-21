/*
  # Complete Database Schema Migration
  
  This migration consolidates all database schema changes from the old Supabase project.
  It includes all tables, RLS policies, functions, triggers, indexes, and storage buckets.
  
  ## Tables Created
  1. profiles - User profile information
  2. businesses - Business information for service providers
  3. jobs - Job postings from customers
  4. bids - Bids from businesses on jobs
  5. stripe_customers - Stripe customer integration
  6. stripe_subscriptions - Stripe subscription management
  7. stripe_orders - Stripe order tracking
  8. conversations - Messaging between customers and businesses
  9. messages - Individual messages in conversations
  10. push_tokens - Push notification tokens
  11. notifications - Notification history
  12. contact_form_submissions - Contact form tracking
  13. reviews - Business reviews and ratings
  
  ## Features
  - Row Level Security (RLS) on all tables
  - Geocoding support with radius filtering
  - Messaging system with real-time chat
  - Push notifications
  - Reviews and ratings system
  - Stripe payment integration
  - Storage buckets for profile pictures and job images
  - Automated bid award algorithm with rating factors
  - Free beta access with automatic subscription grants
*/

-- ============================================================================
-- ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ============================================================================
-- CREATE CUSTOM TYPES
-- ============================================================================

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

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  user_type text NOT NULL CHECK (user_type IN ('customer', 'business')),
  last_job_posted_at timestamptz,
  profile_picture_url text,
  average_rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  theme_preference text DEFAULT 'light' NOT NULL CHECK (theme_preference IN ('light', 'dark')),
  created_at timestamptz DEFAULT now()
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  description text,
  latitude numeric,
  longitude numeric,
  radius_miles integer DEFAULT 25 CHECK (radius_miles IN (5, 10, 25, 50)),
  website text,
  is_subscribed boolean DEFAULT false,
  subscription_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  address text,
  contact_name text,
  contact_phone text,
  latitude numeric,
  longitude numeric,
  job_image_url text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'bidding', 'awarded', 'completed')),
  winning_bid_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Bids table
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for winning_bid_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_winning_bid' AND table_name = 'jobs'
  ) THEN
    ALTER TABLE jobs ADD CONSTRAINT fk_winning_bid 
    FOREIGN KEY (winning_bid_id) REFERENCES bids(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Stripe subscriptions table
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  customer_id text UNIQUE NOT NULL,
  subscription_id text,
  price_id text,
  current_period_start bigint,
  current_period_end bigint,
  cancel_at_period_end boolean DEFAULT false,
  payment_method_brand text,
  payment_method_last4 text,
  status stripe_subscription_status NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Stripe orders table
CREATE TABLE IF NOT EXISTS stripe_orders (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  checkout_session_id text NOT NULL,
  payment_intent_id text NOT NULL,
  customer_id text NOT NULL,
  amount_subtotal bigint NOT NULL,
  amount_total bigint NOT NULL,
  currency text NOT NULL,
  payment_status text NOT NULL,
  status stripe_order_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, business_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  image_url text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read boolean DEFAULT false,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contact_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  submitted_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_review_per_job UNIQUE (job_id)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_winning_bid_id ON jobs(winning_bid_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);

-- Contact form indexes
CREATE INDEX IF NOT EXISTS contact_form_submissions_submitted_at_idx ON contact_form_submissions(user_id, submitted_at DESC);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Function to check if user has bid on a job
CREATE OR REPLACE FUNCTION user_has_bid_on_job(job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bids b
    JOIN businesses bus ON b.business_id = bus.id
    WHERE b.job_id = $1
      AND bus.owner_id = auth.uid()
  );
$$;

-- Function to check if user owns a job
CREATE OR REPLACE FUNCTION user_owns_job(job_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jobs
    WHERE id = $1
      AND customer_id = auth.uid()
  );
$$;

-- Function to check if business belongs to user
CREATE OR REPLACE FUNCTION business_belongs_to_user(business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM businesses
    WHERE id = $1
      AND owner_id = auth.uid()
  );
$$;

-- Function to check if business has bid on user's job
CREATE OR REPLACE FUNCTION business_has_bid_on_user_job(business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM bids b
    JOIN jobs j ON b.job_id = j.id
    WHERE b.business_id = $1
      AND j.customer_id = auth.uid()
  );
$$;

-- Function to calculate distance using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  r numeric := 3959;
  dlat numeric;
  dlon numeric;
  a numeric;
  c numeric;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN r * c;
END;
$$;

-- Function to calculate and award job to best bid
CREATE OR REPLACE FUNCTION calculate_and_award_job(p_job_id uuid)
RETURNS TABLE(
  winner_bid_id uuid,
  winner_amount numeric,
  average_amount numeric,
  total_bids integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_avg_amount decimal;
  v_winner_bid_id uuid;
  v_winner_amount decimal;
  v_total_bids integer;
  v_max_distance decimal;
BEGIN
  -- Calculate average bid amount and total bid count
  SELECT 
    AVG(amount),
    COUNT(*)
  INTO v_avg_amount, v_total_bids
  FROM bids
  WHERE job_id = p_job_id;

  -- Check if there are any bids
  IF v_total_bids = 0 THEN
    RAISE EXCEPTION 'No bids found for this job';
  END IF;

  -- Calculate max distance from average for normalization
  SELECT MAX(ABS(amount - v_avg_amount))
  INTO v_max_distance
  FROM bids
  WHERE job_id = p_job_id;

  -- Prevent division by zero
  IF v_max_distance = 0 THEN
    v_max_distance = 1;
  END IF;

  -- Find winning bid using weighted composite score:
  -- - Bid proximity score (30%): Inverse of normalized distance from average
  -- - Rating score (50%): Normalized rating (0-1 scale)
  -- - Review count score (20%): Logarithmic scale for review count
  SELECT 
    b.id, 
    b.amount
  INTO v_winner_bid_id, v_winner_amount
  FROM bids b
  JOIN businesses bus ON b.business_id = bus.id
  JOIN profiles p ON bus.owner_id = p.id
  WHERE b.job_id = p_job_id
  ORDER BY (
    -- Bid proximity score (30% weight): Higher score for bids closer to average
    (0.30 * (1.0 - (ABS(b.amount - v_avg_amount) / NULLIF(v_max_distance, 0)))) +
    
    -- Rating score (50% weight): Normalized 0-1 scale from 5-star rating
    (0.50 * (COALESCE(p.average_rating, 0) / 5.0)) +
    
    -- Review count score (20% weight): Logarithmic scale with diminishing returns
    (0.20 * LEAST(1.0, LN(COALESCE(p.review_count, 0) + 1) / 5.0))
  ) DESC
  LIMIT 1;

  -- Update job status and set winning bid
  UPDATE jobs
  SET 
    status = 'awarded',
    winning_bid_id = v_winner_bid_id
  WHERE id = p_job_id;

  -- Return results
  RETURN QUERY
  SELECT 
    v_winner_bid_id,
    v_winner_amount,
    v_avg_amount,
    v_total_bids;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Function to update push_tokens updated_at
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to update business rating
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the business profile with new average rating and count
  UPDATE profiles
  SET 
    average_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE business_id = COALESCE(NEW.business_id, OLD.business_id)
    )
  WHERE id = COALESCE(NEW.business_id, OLD.business_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to grant free beta subscription
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

-- Notification functions (using hardcoded URL - update as needed)
CREATE OR REPLACE FUNCTION notify_businesses_of_new_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  business_record RECORD;
  notification_url text := 'https://fydoqyuttiodmrlfsuxk.supabase.co/functions/v1/send-notification';
BEGIN
  FOR business_record IN
    SELECT DISTINCT b.owner_id, b.business_name
    FROM businesses b
    WHERE b.latitude IS NOT NULL 
      AND b.longitude IS NOT NULL
      AND NEW.latitude IS NOT NULL 
      AND NEW.longitude IS NOT NULL
      AND calculate_distance(
        b.latitude, b.longitude, 
        NEW.latitude, NEW.longitude
      ) <= b.radius_miles
  LOOP
    PERFORM extensions.http_post(
      url := notification_url,
      body := jsonb_build_object(
        'userId', business_record.owner_id,
        'title', 'New Job Available',
        'body', 'A new job "' || NEW.title || '" is available in your area',
        'data', jsonb_build_object('jobId', NEW.id)
      )::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error sending notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_customer_of_new_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  job_record RECORD;
  business_record RECORD;
  notification_url text := 'https://fydoqyuttiodmrlfsuxk.supabase.co/functions/v1/send-notification';
BEGIN
  SELECT customer_id, title INTO job_record
  FROM jobs
  WHERE id = NEW.job_id;

  SELECT business_name INTO business_record
  FROM businesses
  WHERE id = NEW.business_id;

  PERFORM extensions.http_post(
    url := notification_url,
    body := jsonb_build_object(
      'userId', job_record.customer_id,
      'title', 'New Bid Received',
      'body', business_record.business_name || ' placed a bid of $' || NEW.amount || ' on "' || job_record.title || '"',
      'data', jsonb_build_object('jobId', NEW.job_id)
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error sending notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_business_of_job_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  bid_record RECORD;
  notification_url text := 'https://fydoqyuttiodmrlfsuxk.supabase.co/functions/v1/send-notification';
BEGIN
  IF NEW.winning_bid_id IS NOT NULL AND (OLD.winning_bid_id IS NULL OR OLD.winning_bid_id != NEW.winning_bid_id) THEN
    SELECT b.business_id, bus.owner_id, bus.business_name
    INTO bid_record
    FROM bids b
    JOIN businesses bus ON bus.id = b.business_id
    WHERE b.id = NEW.winning_bid_id;

    PERFORM extensions.http_post(
      url := notification_url,
      body := jsonb_build_object(
        'userId', bid_record.owner_id,
        'title', 'Congratulations! You Won a Job',
        'body', 'Your bid was selected for "' || NEW.title || '"',
        'data', jsonb_build_object('jobId', NEW.id)
      )::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error sending notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

DROP TRIGGER IF EXISTS trigger_update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER trigger_update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

DROP TRIGGER IF EXISTS trigger_update_business_rating ON reviews;
CREATE TRIGGER trigger_update_business_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rating();

DROP TRIGGER IF EXISTS auto_grant_free_subscription ON businesses;
CREATE TRIGGER auto_grant_free_subscription
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION grant_free_beta_subscription();

DROP TRIGGER IF EXISTS trigger_notify_businesses_new_job ON jobs;
CREATE TRIGGER trigger_notify_businesses_new_job
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_businesses_of_new_job();

DROP TRIGGER IF EXISTS trigger_notify_customer_new_bid ON bids;
CREATE TRIGGER trigger_notify_customer_new_bid
  AFTER INSERT ON bids
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_of_new_bid();

DROP TRIGGER IF EXISTS trigger_notify_business_job_award ON jobs;
CREATE TRIGGER trigger_notify_business_job_award
  AFTER UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION notify_business_of_job_award();

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
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

-- Businesses policies
DROP POLICY IF EXISTS "Business owners can insert own business" ON businesses;
CREATE POLICY "Business owners can insert own business"
  ON businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Business owners can update own business" ON businesses;
CREATE POLICY "Business owners can update own business"
  ON businesses FOR UPDATE
  TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view relevant businesses" ON businesses;
CREATE POLICY "Users can view relevant businesses"
  ON businesses FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR business_has_bid_on_user_job(id)
  );

-- Jobs policies
DROP POLICY IF EXISTS "Customers can insert own jobs" ON jobs;
CREATE POLICY "Customers can insert own jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update jobs" ON jobs;
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

DROP POLICY IF EXISTS "Users can view relevant jobs" ON jobs;
CREATE POLICY "Users can view relevant jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR user_has_bid_on_job(id)
    OR (
      status = 'open'
      AND EXISTS (
        SELECT 1 FROM businesses b
        WHERE b.owner_id = (SELECT auth.uid())
          AND b.is_subscribed = true
          AND b.subscription_expires_at > now()
          AND b.latitude IS NOT NULL
          AND b.longitude IS NOT NULL
          AND jobs.latitude IS NOT NULL
          AND jobs.longitude IS NOT NULL
          AND calculate_distance(jobs.latitude, jobs.longitude, b.latitude, b.longitude) <= b.radius_miles
      )
    )
  );

-- Bids policies
DROP POLICY IF EXISTS "Subscribed businesses can insert bids" ON bids;
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

DROP POLICY IF EXISTS "Users can view relevant bids" ON bids;
CREATE POLICY "Users can view relevant bids"
  ON bids FOR SELECT
  TO authenticated
  USING (
    business_belongs_to_user(business_id) 
    OR user_owns_job(job_id)
  );

-- Stripe customers policies
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
CREATE POLICY "Users can view their own customer data"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Stripe subscriptions policies
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
CREATE POLICY "Users can view their own subscription data"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT customer_id
      FROM stripe_customers
      WHERE user_id = (SELECT auth.uid()) AND deleted_at IS NULL
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
      WHERE user_id = (SELECT auth.uid()) AND deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Conversations policies
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    customer_id = (SELECT auth.uid()) OR business_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;
CREATE POLICY "Users can update conversations they participate in"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid()) OR business_id = (SELECT auth.uid())
  )
  WITH CHECK (
    customer_id = (SELECT auth.uid()) OR business_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid()) OR business_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Conversation participants can delete conversations" ON conversations;
CREATE POLICY "Conversation participants can delete conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR business_id = (SELECT auth.uid())
  );

-- Messages policies
DROP POLICY IF EXISTS "Users can mark messages as read" ON messages;
CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (SELECT auth.uid())
         OR conversations.business_id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (SELECT auth.uid())
         OR conversations.business_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (SELECT auth.uid())
         OR conversations.business_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = (SELECT auth.uid())
         OR conversations.business_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()));

-- Push tokens policies
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON push_tokens;
CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own push tokens" ON push_tokens;
CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own push tokens" ON push_tokens;
CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own push tokens" ON push_tokens;
CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Notifications policies
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Contact form submissions policies
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

-- Reviews policies
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

DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- CREATE VIEWS
-- ============================================================================

-- View for user subscriptions
CREATE OR REPLACE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

-- View for user orders
CREATE OR REPLACE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;

GRANT SELECT ON stripe_user_orders TO authenticated;

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for job images
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-images', 'job-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Profile pictures storage policies
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
CREATE POLICY "Users can upload own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
CREATE POLICY "Users can update own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;
CREATE POLICY "Users can delete own profile picture"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Job images storage policies
DROP POLICY IF EXISTS "Authenticated users can upload job images" ON storage.objects;
CREATE POLICY "Authenticated users can upload job images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-images');

DROP POLICY IF EXISTS "Users can update own job images" ON storage.objects;
CREATE POLICY "Users can update own job images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'job-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own job images" ON storage.objects;
CREATE POLICY "Users can delete own job images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'job-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public can view job images" ON storage.objects;
CREATE POLICY "Public can view job images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-images');

-- ============================================================================
-- DATA MIGRATIONS
-- ============================================================================

-- Grant all existing businesses free beta access
UPDATE businesses
SET
  is_subscribed = true,
  subscription_expires_at = '2025-12-31 23:59:59'
WHERE is_subscribed = false OR subscription_expires_at IS NULL OR subscription_expires_at < now();