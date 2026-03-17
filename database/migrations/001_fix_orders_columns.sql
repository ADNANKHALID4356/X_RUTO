-- =========================================================
-- Migration 001: Fix orders table columns
-- Run this against an existing database to apply schema fixes
-- =========================================================

-- Rename woocommerce_order_id to wc_order_id for consistency with application code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'woocommerce_order_id'
  ) THEN
    ALTER TABLE orders RENAME COLUMN woocommerce_order_id TO wc_order_id;
  END IF;
END $$;

-- Add wc_status column if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wc_status VARCHAR(50);

-- Add source column if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Add failure_reason column if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add delivery_status column if missing (driver-facing view)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(30);

-- Add sequence_number if missing
ALTER TABLE orders ADD COLUMN IF NOT EXISTS sequence_number INTEGER;

-- Add index for wc_order_id lookups
CREATE INDEX IF NOT EXISTS idx_orders_wc_order_id ON orders(wc_order_id);
