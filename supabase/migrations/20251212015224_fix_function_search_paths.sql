/*
  # Fix Function Search Paths for Security

  1. Security Improvements
    - Set explicit search_path for all functions
    - Prevents role-based search path manipulation attacks
    - Uses 'SET search_path = public, pg_temp'
  
  2. Functions Updated
    - calculate_and_award_job(uuid)
    - user_has_bid_on_job(uuid)
    - user_owns_job(uuid)
    - business_belongs_to_user(uuid)
    - business_has_bid_on_user_job(uuid)
    - update_conversation_last_message()
    - update_push_tokens_updated_at()
    - calculate_distance(numeric, numeric, numeric, numeric)
    - notify_business_of_job_award()
    - notify_businesses_of_new_job()
    - notify_customer_of_new_bid()
  
  3. Notes
    - Functions are altered to include explicit search_path
    - This prevents security vulnerabilities from search path manipulation
*/

ALTER FUNCTION calculate_and_award_job(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION user_has_bid_on_job(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION user_owns_job(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION business_belongs_to_user(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION business_has_bid_on_user_job(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION update_conversation_last_message() SET search_path = public, pg_temp;
ALTER FUNCTION update_push_tokens_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION calculate_distance(numeric, numeric, numeric, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION notify_business_of_job_award() SET search_path = public, pg_temp;
ALTER FUNCTION notify_businesses_of_new_job() SET search_path = public, pg_temp;
ALTER FUNCTION notify_customer_of_new_bid() SET search_path = public, pg_temp;
