-- ============================================================
-- Migration 004: Companies, Global Settings, and company_id
-- SmartHR Multi-Tenancy Layer
-- Run once against your PostgreSQL / Neon DB instance.
-- ============================================================

-- ─── 1. COMPANIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(255)  NOT NULL DEFAULT 'SmartHR',
  logo_url         TEXT,
  currency_symbol  VARCHAR(10)   NOT NULL DEFAULT '$',
  address          TEXT,
  timezone         VARCHAR(100)  NOT NULL DEFAULT 'UTC',
  contact_person   VARCHAR(255),
  email            VARCHAR(255),
  phone            VARCHAR(50),
  mobile           VARCHAR(50),
  fax              VARCHAR(50),
  website          VARCHAR(255),
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Seed a default company so existing rows can reference it
INSERT INTO companies (id, name, currency_symbol)
VALUES (1, 'SmartHR', '$')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. GLOBAL SETTINGS (key-value per company) ─────────────
CREATE TABLE IF NOT EXISTS global_settings (
  id          SERIAL PRIMARY KEY,
  company_id  INT          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key         VARCHAR(100) NOT NULL,
  value       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, key)
);

-- Seed default settings for company 1
INSERT INTO global_settings (company_id, key, value) VALUES
  (1, 'theme_sidebar_color',  '#1e293b'),
  (1, 'theme_accent_color',   '#6366f1'),
  (1, 'invoice_prefix',       '#INV-'),
  (1, 'invoice_tax_percent',  '0'),
  (1, 'invoice_footer_notes', ''),
  (1, 'salary_tax_percent',   '0'),
  (1, 'salary_pf_rate',       '12'),
  (1, 'salary_payslip_prefix','#PS-')
ON CONFLICT (company_id, key) DO NOTHING;

-- ─── 3. ADD company_id TO users ─────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id    INT REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nationality   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Back-fill existing users to company 1
UPDATE users SET company_id = 1 WHERE company_id IS NULL;

-- ─── 4. ADD company_id TO employees ─────────────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE SET NULL;

-- Back-fill
UPDATE employees SET company_id = 1 WHERE company_id IS NULL;

-- ─── 5. Update trigger for global_settings.updated_at ───────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_global_settings_updated_at ON global_settings;
CREATE TRIGGER trg_global_settings_updated_at
  BEFORE UPDATE ON global_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
