-- ============================================================
-- Migration 006: Documents table + audit_logs API columns
-- ============================================================

-- Documents table (company policies, handbooks, etc.)
CREATE TABLE IF NOT EXISTS documents (
  id            SERIAL PRIMARY KEY,
  title         VARCHAR(300) NOT NULL,
  description   TEXT,
  category      VARCHAR(100) NOT NULL DEFAULT 'policy',  -- policy | handbook | contract | other
  file_path     TEXT NOT NULL,                            -- relative URL served by static middleware
  file_name     VARCHAR(255) NOT NULL,
  file_size     INT,                                      -- bytes
  mime_type     VARCHAR(100),
  uploaded_by   INT REFERENCES users(id) ON DELETE SET NULL,
  is_public     BOOLEAN NOT NULL DEFAULT TRUE,            -- visible to all employees?
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploaded_by);

-- Add API-level columns to audit_logs (safe — idempotent)
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS module      VARCHAR(100),   -- users | employees | payroll …
  ADD COLUMN IF NOT EXISTS method      VARCHAR(10),    -- POST | PUT | DELETE
  ADD COLUMN IF NOT EXISTS endpoint    TEXT;           -- /api/employees/:id
