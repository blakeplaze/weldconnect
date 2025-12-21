/*
  # Enable HTTP Extension for Notifications

  ## Overview
  Enables the http extension required for database functions to send HTTP requests
  to the send-notification edge function.

  ## Changes
  1. Creates http extension if not exists
  2. Grants necessary permissions
*/

-- Enable http extension for making HTTP requests from database functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Grant execute permissions on http functions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;