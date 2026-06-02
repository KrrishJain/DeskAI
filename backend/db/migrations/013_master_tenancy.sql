-- Migration 013: Master Multi-Tenancy Complete
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'taxes', 'resignations', 'promotions', 'payments', 
            'invoices', 'invoice_items', 'expenses', 'provident_fund'
        ])
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
