/*
  # Add Geocoding and Radius Filtering

  1. Changes to businesses table
    - Add `latitude` (numeric) - Latitude coordinate of business location
    - Add `longitude` (numeric) - Longitude coordinate of business location
    - Add `radius_miles` (integer) - How far business is willing to travel (5, 10, 25, 50 miles)
    - Default radius to 25 miles
  
  2. Changes to jobs table
    - Add `latitude` (numeric) - Latitude coordinate of job location
    - Add `longitude` (numeric) - Longitude coordinate of job location
  
  3. Notes
    - Coordinates will be set manually or via geocoding service
    - Distance calculation will use Haversine formula in application code
    - Existing records will have null coordinates until updated
*/

-- Add geocoding fields to businesses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE businesses ADD COLUMN latitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE businesses ADD COLUMN longitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'radius_miles'
  ) THEN
    ALTER TABLE businesses ADD COLUMN radius_miles integer DEFAULT 25;
  END IF;
END $$;

-- Add geocoding fields to jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE jobs ADD COLUMN latitude numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE jobs ADD COLUMN longitude numeric;
  END IF;
END $$;

-- Add check constraint for radius values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'businesses_radius_miles_check'
  ) THEN
    ALTER TABLE businesses 
    ADD CONSTRAINT businesses_radius_miles_check 
    CHECK (radius_miles IN (5, 10, 25, 50));
  END IF;
END $$;