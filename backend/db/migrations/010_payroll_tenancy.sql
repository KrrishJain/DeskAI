-- Migration 010: Payroll Multi-Tenancy
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['salaries', 'payroll_additions', 'payroll_deductions', 'salary_settings'])
    LOOP
        EXECUTE format('
            ALTER TABLE %I 
            ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;
        ', t);
        
        EXECUTE format('
            UPDATE %I SET company_id = 1 WHERE company_id IS NULL;
        ', t);
    END LOOP;
END $$;
