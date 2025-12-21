/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add index on `businesses.owner_id` for foreign key lookup
    - Add index on `jobs.winning_bid_id` for foreign key lookup
    - Add index on `jobs.customer_id` for foreign key lookup
    - Add index on `messages.sender_id` for foreign key lookup
  
  2. Notes
    - These indexes improve query performance when joining tables
    - Foreign keys without indexes can lead to slow queries at scale
*/

CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_winning_bid_id ON jobs(winning_bid_id);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
