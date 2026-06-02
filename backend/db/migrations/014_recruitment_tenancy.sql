-- ============================================================
-- Migration 014: Recruitment Tenant Isolation (company_id)
-- ============================================================

-- 1) JOBS: add tenant column and constraints
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;

UPDATE jobs
SET company_id = 1
WHERE company_id IS NULL;

ALTER TABLE jobs
  ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_jobs_id_company'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT uq_jobs_id_company UNIQUE (id, company_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);


-- 2) CANDIDATES: add tenant column and align with parent job tenant
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS company_id INT REFERENCES companies(id) ON DELETE CASCADE;

UPDATE candidates c
SET company_id = j.company_id
FROM jobs j
WHERE c.job_id = j.id
  AND c.company_id IS NULL;

UPDATE candidates
SET company_id = 1
WHERE company_id IS NULL;

ALTER TABLE candidates
  ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidates_job_id_fkey'
  ) THEN
    ALTER TABLE candidates DROP CONSTRAINT candidates_job_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_candidates_id_company'
  ) THEN
    ALTER TABLE candidates
      ADD CONSTRAINT uq_candidates_id_company UNIQUE (id, company_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_candidates_job_company'
  ) THEN
    ALTER TABLE candidates
      ADD CONSTRAINT fk_candidates_job_company
      FOREIGN KEY (job_id, company_id)
      REFERENCES jobs(id, company_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_candidates_company ON candidates(company_id);
