/*
  # Remove Unused Indexes

  1. Performance Improvements
    - Remove indexes that are not being used
    - Reduces storage overhead and write performance penalty
    - Indexes can be recreated if future usage patterns require them
  
  2. Indexes Removed
    - idx_push_tokens_user_id (not currently used)
    - idx_push_tokens_expo_token (not currently used)
    - idx_notifications_user_id (not currently used)
    - idx_notifications_created_at (not currently used)
    - idx_notifications_read (not currently used)
    - idx_conversations_job_id (not currently used)
    - idx_conversations_last_message (not currently used)
    - idx_messages_created_at (not currently used)
  
  3. Notes
    - These indexes were flagged as unused by database analysis
    - Foreign key indexes were added separately and are kept
    - Indexes can be recreated if usage patterns change
*/

DROP INDEX IF EXISTS idx_push_tokens_user_id;
DROP INDEX IF EXISTS idx_push_tokens_expo_token;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_notifications_read;
DROP INDEX IF EXISTS idx_conversations_job_id;
DROP INDEX IF EXISTS idx_conversations_last_message;
DROP INDEX IF EXISTS idx_messages_created_at;
