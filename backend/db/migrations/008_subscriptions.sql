-- ============================================================
-- Migration 008: Super Admin Subscriptions
-- ============================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS subscription_start DATE,
  ADD COLUMN IF NOT EXISTS subscription_end   DATE,
  ADD COLUMN IF NOT EXISTS status             VARCHAR(50) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS admin_username     VARCHAR(200);

-- Backfill existing companies to be active with a 1-year subscription
UPDATE companies 
SET 
  subscription_start = CURRENT_DATE,
  subscription_end = CURRENT_DATE + INTERVAL '1 year',
  status = 'active'
WHERE subscription_start IS NULL;
