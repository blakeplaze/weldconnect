/*
  # Add Push Notifications System

  ## Overview
  Implements push notification infrastructure for alerting users about important events:
  - New jobs matching business location (for businesses)
  - New bids received (for customers)
  - Bid acceptance/rejection (for businesses)

  ## 1. New Tables

  ### `push_tokens`
  Stores Expo push notification tokens for each user's device.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - Token owner
  - `expo_push_token` (text) - Expo push token
  - `device_id` (text, nullable) - Device identifier for managing multiple devices
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `notifications`
  Tracks notification history for debugging and user notification center.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles) - Notification recipient
  - `title` (text) - Notification title
  - `body` (text) - Notification body
  - `data` (jsonb, nullable) - Additional data (job_id, bid_id, etc.)
  - `read` (boolean) - Whether notification was read
  - `sent_at` (timestamptz)
  - `created_at` (timestamptz)

  ## 2. Security (RLS Policies)

  ### Push Tokens
  - Users can view and manage their own push tokens
  - Users can insert/update/delete their own tokens

  ### Notifications
  - Users can view their own notifications
  - Users can update read status on their own notifications
  - System can insert notifications (via edge function)

  ## 3. Performance
  - Index on user_id for fast token lookup
  - Index on expo_push_token for deduplication
  - Index on notifications user_id and created_at for notification feed
*/

-- Create push_tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, expo_push_token)
);

-- Create notifications table
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

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_tokens

CREATE POLICY "Users can view their own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for notifications

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_expo_token ON push_tokens(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER trigger_update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();