-- ============================================================
-- Migration 009: Strict Multi-Tenancy Isolation
-- ============================================================

-- Safely add company_id to all remaining domain tables
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'departments', 'designations', 'clients', 'projects', 
            'assets', 'leaves', 'holidays', 'overtime', 'goal_types', 
            'goals', 'salary_structures', 'attendance', 'documents', 
            'notifications', 'audit_logs'
        ])
    LOOP
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;
        ', t);
        
        -- Back-fill existing records with company_id = 1 (Master Tenant)
        EXECUTE format('
            UPDATE %I SET company_id = 1 WHERE company_id IS NULL;
        ', t);
        
        -- After back-filling, enforce NOT NULL to ensure strict multi-tenancy in future inserts
        -- (Optional but recommended for robust isolation. Uncomment below to enforce)
        -- EXECUTE format('ALTER TABLE %I ALTER COLUMN company_id SET NOT NULL;', t);
    END LOOP;
END $$;
