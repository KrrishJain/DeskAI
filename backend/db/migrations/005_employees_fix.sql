-- ============================================================
-- Migration 005: Add missing columns to employees table
-- + link employees to users for login capability
-- Run once in your Neon/PostgreSQL console.
-- ============================================================

-- Add columns to employees that may be missing in older DBs
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS email         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS picture       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add user_id FK so an employee row can link to a users login row
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;

-- Unique constraint on email (safe – may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'employees_email_key'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_email_key UNIQUE (email);
  END IF;
END $$;

-- updated_at trigger (safe re-run)
DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
