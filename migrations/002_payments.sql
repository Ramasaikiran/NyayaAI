-- Run this in Supabase SQL editor (or via CLI) after schema.sql.
-- Adds Razorpay payment tracking to review_requests.

ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS razorpay_order_id   TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status       TEXT NOT NULL DEFAULT 'unpaid'
                                                CHECK (payment_status IN ('unpaid','paid','refunded'));

CREATE INDEX IF NOT EXISTS idx_review_requests_razorpay_payment_id
  ON review_requests(razorpay_payment_id);
