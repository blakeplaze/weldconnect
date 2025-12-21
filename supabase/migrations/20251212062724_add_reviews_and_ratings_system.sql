/*
  # Add Reviews and Ratings System

  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key to jobs)
      - `business_id` (uuid, foreign key to profiles)
      - `customer_id` (uuid, foreign key to profiles)
      - `rating` (integer, 1-5 stars)
      - `review_text` (text, optional written review)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - One review per job (unique constraint on job_id)
    - Rating must be between 1 and 5
    - Only customers who had jobs completed can review
    - Business being reviewed must be the one awarded the job

  3. Indexes
    - Index on business_id for fast rating aggregation
    - Index on customer_id for review history
    - Index on created_at for sorting

  4. Computed Columns
    - Add average_rating and review_count to profiles table

  5. Security
    - Enable RLS on reviews table
    - Customers can create reviews for their completed jobs
    - Customers can update their own reviews
    - Anyone can view reviews
    - Businesses can view reviews about them
*/

-- Create reviews table
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Add rating columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE profiles ADD COLUMN average_rating decimal(3,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE profiles ADD COLUMN review_count integer DEFAULT 0;
  END IF;
END $$;

-- Function to update business ratings
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update ratings
DROP TRIGGER IF EXISTS trigger_update_business_rating ON reviews;
CREATE TRIGGER trigger_update_business_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_business_rating();

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Customers can create reviews for jobs they posted that are completed
CREATE POLICY "Customers can create reviews for completed jobs"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND EXISTS (
      SELECT 1 FROM jobs
      JOIN bids ON jobs.winning_bid_id = bids.id
      WHERE jobs.id = job_id
      AND jobs.customer_id = customer_id
      AND jobs.status = 'completed'
      AND bids.business_id = business_id
    )
  );

-- Policy: Customers can update their own reviews
CREATE POLICY "Customers can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Policy: Customers can delete their own reviews
CREATE POLICY "Customers can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

-- Policy: Anyone authenticated can view reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (true);
