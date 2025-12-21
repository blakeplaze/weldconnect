/*
  # Enhance Job Award Algorithm with Business Ratings

  1. Changes
    - Updates `calculate_and_award_job` function to factor in business ratings
    - When bids are close in amount, businesses with better ratings win
    - Tie-breaking order:
      1. Bid amount closest to average (primary factor)
      2. Higher average rating (first tie-breaker)
      3. More reviews (second tie-breaker)
  
  2. Algorithm
    - Calculates average bid amount across all bids
    - Orders bids by distance from average
    - Uses business rating and review count as tie-breakers
    - Businesses with higher ratings have advantage when bids are similar
  
  3. Notes
    - Maintains existing security (SECURITY DEFINER, search_path)
    - Returns same output structure for backward compatibility
    - Encourages quality service by rewarding highly-rated businesses
*/

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

  -- Find the winning bid considering:
  -- 1. Closest to average amount (primary)
  -- 2. Higher business rating (tie-breaker)
  -- 3. More reviews (secondary tie-breaker)
  SELECT 
    b.id, 
    b.amount
  INTO v_winner_bid_id, v_winner_amount
  FROM bids b
  JOIN businesses bus ON b.business_id = bus.id
  JOIN profiles p ON bus.owner_id = p.id
  WHERE b.job_id = p_job_id
  ORDER BY 
    ABS(b.amount - v_avg_amount) ASC,
    COALESCE(p.average_rating, 0) DESC,
    COALESCE(p.review_count, 0) DESC
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
