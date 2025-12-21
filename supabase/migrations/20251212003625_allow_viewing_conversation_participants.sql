/*
  # Allow Viewing Conversation Participants' Profiles

  ## Problem
  Customers can't see business names in messages tab because:
  - Current RLS policies only allow users to view their own profile
  - "Unknown User" appears instead of business names
  - Profile data returns null when querying conversation participants

  ## Solution
  Add policy allowing users to view profiles of people they have conversations with

  ## Security
  - Users can only see profiles of people they have active conversations with
  - No sensitive data exposed beyond what's needed for messaging
*/

-- Allow users to view profiles of people they're conversing with
CREATE POLICY "Users can view conversation participants"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE (conversations.customer_id = auth.uid() OR conversations.business_id = auth.uid())
      AND (conversations.customer_id = profiles.id OR conversations.business_id = profiles.id)
    )
  );
