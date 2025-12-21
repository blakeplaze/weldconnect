/*
  # Add Notification Triggers

  ## Overview
  Creates database triggers to automatically send push notifications for key events:
  1. New jobs matching business location - notify businesses within radius
  2. New bids received - notify job customer
  3. Job awarded - notify winning business

  ## Functions

  ### `notify_businesses_of_new_job()`
  Triggered when a new job is created. Finds all businesses within radius and sends notifications.

  ### `notify_customer_of_new_bid()`
  Triggered when a new bid is placed. Notifies the job's customer.

  ### `notify_business_of_job_award()`
  Triggered when a job's winning_bid_id is set. Notifies the winning business.

  ## Triggers
  - `trigger_notify_businesses_new_job` - After INSERT on jobs
  - `trigger_notify_customer_new_bid` - After INSERT on bids
  - `trigger_notify_business_job_award` - After UPDATE on jobs
*/

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric
)
RETURNS numeric AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to notify businesses of new job
CREATE OR REPLACE FUNCTION notify_businesses_of_new_job()
RETURNS TRIGGER AS $$
DECLARE
  business_record RECORD;
  notification_url text;
BEGIN
  notification_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    ''
  ) || '/functions/v1/send-notification';

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
    PERFORM net.http_post(
      url := notification_url,
      body := jsonb_build_object(
        'userId', business_record.owner_id,
        'title', 'New Job Available',
        'body', 'A new job "' || NEW.title || '" is available in your area',
        'data', jsonb_build_object('jobId', NEW.id)
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify customer of new bid
CREATE OR REPLACE FUNCTION notify_customer_of_new_bid()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  business_record RECORD;
  notification_url text;
BEGIN
  notification_url := COALESCE(
    current_setting('app.settings.supabase_url', true),
    ''
  ) || '/functions/v1/send-notification';

  SELECT customer_id, title INTO job_record
  FROM jobs
  WHERE id = NEW.job_id;

  SELECT business_name INTO business_record
  FROM businesses
  WHERE id = NEW.business_id;

  PERFORM net.http_post(
    url := notification_url,
    body := jsonb_build_object(
      'userId', job_record.customer_id,
      'title', 'New Bid Received',
      'body', business_record.business_name || ' placed a bid of $' || NEW.amount || ' on "' || job_record.title || '"',
      'data', jsonb_build_object('jobId', NEW.job_id)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify business of job award
CREATE OR REPLACE FUNCTION notify_business_of_job_award()
RETURNS TRIGGER AS $$
DECLARE
  bid_record RECORD;
  job_title text;
  business_owner_id uuid;
  notification_url text;
BEGIN
  IF NEW.winning_bid_id IS NOT NULL AND (OLD.winning_bid_id IS NULL OR OLD.winning_bid_id != NEW.winning_bid_id) THEN
    notification_url := COALESCE(
      current_setting('app.settings.supabase_url', true),
      ''
    ) || '/functions/v1/send-notification';

    SELECT b.business_id, bus.owner_id, bus.business_name
    INTO bid_record
    FROM bids b
    JOIN businesses bus ON bus.id = b.business_id
    WHERE b.id = NEW.winning_bid_id;

    PERFORM net.http_post(
      url := notification_url,
      body := jsonb_build_object(
        'userId', bid_record.owner_id,
        'title', 'Congratulations! You Won a Job',
        'body', 'Your bid was selected for "' || NEW.title || '"',
        'data', jsonb_build_object('jobId', NEW.id)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers

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