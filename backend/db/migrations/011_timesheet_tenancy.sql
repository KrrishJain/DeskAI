-- Migration 011: Timesheet Multi-Tenancy
DO $$ 
BEGIN
    ALTER TABLE timesheet 
    ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;
    
    UPDATE timesheet SET company_id = 1 WHERE company_id IS NULL;
END $$;
