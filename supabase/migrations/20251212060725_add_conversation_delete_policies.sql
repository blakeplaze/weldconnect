/*
  # Add delete policies for conversations and messages

  1. Security Changes
    - Add DELETE policy for conversations (both participants can delete)
    - Add DELETE policy for messages (sender can delete their own messages)
  
  2. Notes
    - When a conversation is deleted, all associated messages are automatically deleted due to CASCADE
    - Users can only delete conversations they are part of
    - Users can only delete messages they sent
*/

-- Allow users to delete conversations they are part of
CREATE POLICY "Conversation participants can delete conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = customer_id OR auth.uid() = business_id
  );

-- Allow users to delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id);