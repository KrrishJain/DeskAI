-- 010_financial_profiles.sql
-- Phase 10: Unified Credential System & Financial Profiles

-- 1. Ensure 'client' role exists in user_roles
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'client';

-- Can use transaction for the rest
BEGIN;

INSERT INTO user_roles (role)
VALUES ('client')
ON CONFLICT (role) DO NOTHING;

-- 2. Add Bank Details to Employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS branch_name VARCHAR(100);

-- 3. Add Bank Details and Credentials to Clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS company_bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS swift_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS vat_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

COMMIT;
