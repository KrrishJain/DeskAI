-- Migration 012: Training Multi-Tenancy
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['training_types', 'trainers', 'trainings'])
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
