/*
  # Make Ratings a Primary Factor in Bid Winning

  1. Changes
    - Updates `calculate_and_award_job` to use a weighted scoring system
    - Average rating and review count are now PRIMARY factors, not just tie-breakers
    - Businesses with higher ratings and more reviews have significant advantage
  
  2. Scoring Algorithm
    - Calculates a composite score for each bid combining:
      * Bid proximity score: How close the bid is to average (30% weight)
      * Rating score: Business average rating (50% weight)
      * Review count score: Number of reviews (20% weight)
    - Higher total score wins the bid
  
  3. Score Components
    - Bid proximity: 1.0 for closest bid, decreasing with distance
    - Rating: Normalized 0-1 based on 5-star scale
    - Review count: Logarithmic scale (diminishing returns for very high counts)
  
  4. Benefits
    - Rewards quality service and reputation
    - Businesses with better ratings can win even with slightly higher bids
    - Encourages businesses to maintain high service quality
    - Still considers bid amount as important factor
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
    -- Using log(review_count + 1) to handle 0 reviews and provide diminishing returns
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
