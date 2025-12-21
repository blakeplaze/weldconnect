/*
  # Add Messaging System

  ## Overview
  Creates a complete messaging system allowing customers and businesses to communicate about jobs.
  Includes real-time chat capabilities with read receipts and image support.

  ## 1. New Tables
  
  ### `conversations`
  Links a customer and business for a specific job. One conversation per job.
  - `id` (uuid, primary key)
  - `job_id` (uuid, references jobs) - The job being discussed
  - `customer_id` (uuid, references profiles) - Job owner
  - `business_id` (uuid, references profiles) - Business user
  - `last_message_at` (timestamptz) - For sorting conversations
  - `created_at` (timestamptz)
  
  ### `messages`
  Individual messages within a conversation.
  - `id` (uuid, primary key)
  - `conversation_id` (uuid, references conversations)
  - `sender_id` (uuid, references profiles) - Who sent the message
  - `message_text` (text) - Message content
  - `image_url` (text, nullable) - Optional image attachment
  - `read_at` (timestamptz, nullable) - When message was read
  - `created_at` (timestamptz)

  ## 2. Security (RLS Policies)
  
  ### Conversations
  - Users can view conversations where they are the customer OR business
  - Conversations created automatically when first message is sent
  
  ### Messages
  - Users can view messages in conversations they participate in
  - Users can create messages in conversations they participate in
  - Users can update read_at on messages sent to them

  ## 3. Performance
  - Index on conversation_id for fast message lookups
  - Index on job_id for finding existing conversations
  - Index on read_at for unread message counts
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, business_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  image_url text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations

-- Users can view conversations they participate in
CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id OR auth.uid() = business_id
  );

-- Users can create conversations for jobs they're involved with
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = customer_id OR auth.uid() = business_id
  );

-- Update last_message_at when new messages arrive
CREATE POLICY "Users can update conversations they participate in"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = customer_id OR auth.uid() = business_id
  )
  WITH CHECK (
    auth.uid() = customer_id OR auth.uid() = business_id
  );

-- RLS Policies for messages

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.customer_id = auth.uid() OR conversations.business_id = auth.uid())
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.customer_id = auth.uid() OR conversations.business_id = auth.uid())
    )
  );

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.customer_id = auth.uid() OR conversations.business_id = auth.uid())
    )
    AND sender_id != auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.customer_id = auth.uid() OR conversations.business_id = auth.uid())
    )
    AND sender_id != auth.uid()
  );

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_job_id ON conversations(job_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;

-- Function to update last_message_at on conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_message_at when message is created
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();