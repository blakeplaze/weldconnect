/*
  # Add Missing Foreign Key Index

  1. Performance Improvement
    - Add index on `notifications.user_id` for foreign key lookup
    - Improves query performance when filtering or joining by user_id
  
  2. Notes
    - This index will be used by queries filtering notifications by user
    - Essential for efficient user notification queries
*/

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
