/*
  # Use Hardcoded Supabase URL for Notifications

  ## Overview
  Updates notification functions to use hardcoded Supabase project URL.
  The URL is not sensitive and is already public in the client app.

  ## Changes
  - Removes dependency on app.settings configuration
  - Uses project-specific Supabase URL directly
  - Removes service role key requirement (edge function handles auth internally)
*/

-- Function to notify businesses of new job
CREATE OR REPLACE FUNCTION notify_businesses_of_new_job()
RETURNS TRIGGER AS $$
DECLARE
  business_record RECORD;
  notification_url text := 'https://wdzvtsixyefyidflxlqj.supabase.co/functions/v1/send-notification';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify customer of new bid
CREATE OR REPLACE FUNCTION notify_customer_of_new_bid()
RETURNS TRIGGER AS $$
DECLARE
  job_record RECORD;
  business_record RECORD;
  notification_url text := 'https://wdzvtsixyefyidflxlqj.supabase.co/functions/v1/send-notification';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify business of job award
CREATE OR REPLACE FUNCTION notify_business_of_job_award()
RETURNS TRIGGER AS $$
DECLARE
  bid_record RECORD;
  notification_url text := 'https://wdzvtsixyefyidflxlqj.supabase.co/functions/v1/send-notification';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;