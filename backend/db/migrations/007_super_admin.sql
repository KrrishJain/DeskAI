-- ============================================================
-- Migration 007: Super Admin Module
-- ============================================================

-- Add is_active to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add superadmin to the enum (PostgreSQL block to bypass error if exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role_enum' AND e.enumlabel = 'superadmin') THEN
    ALTER TYPE user_role_enum ADD VALUE 'superadmin';
  END IF;
END $$;

-- Insert the role into user_roles
INSERT INTO user_roles (role) VALUES ('superadmin') ON CONFLICT (role) DO NOTHING;

-- Create default super admin (password: superadmin123)
-- Hash generated via bcrypt (Rounds: 12) => $2b$12$R.S2C3h2w.s7Gz8kH2d7w.T7H/lU/X/X/X/X/X/X/X/X/X/X/X/X/X -- Wait, let's use a real hash
-- Better yet, we can't reliably generate bcrypt in SQL easily, so I'll do this via the migration runner.
