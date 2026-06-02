"""
schema.py — Human-readable DB schema fed to the ERP Planner LLM.

Keep this updated whenever you add/change tables.
The LLM uses this to generate correct SQL with proper JOINs.
"""

SCHEMA = """
=== HRMS DATABASE SCHEMA (PostgreSQL / NeonDB) ===

All tables have a `company_id` FK — always filter by company_id in queries.

── CORE EMPLOYEE TABLES ──────────────────────────────────────────────────────

Table: employees
  id              INTEGER PK
  first_name      VARCHAR
  last_name       VARCHAR
  employee_id     VARCHAR UNIQUE  (e.g. EMP-3NS8HG)
  email           VARCHAR
  phone           VARCHAR
  department_id   INTEGER FK → departments.id
  designation_id  INTEGER FK → designations.id
  joining_date    DATE
  is_active       BOOLEAN
  user_id         INTEGER FK → users.id
  company_id      INTEGER FK → companies.id
  bank_name       VARCHAR
  account_number  VARCHAR
  ifsc_code       VARCHAR
  branch_name     VARCHAR
  picture         VARCHAR
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Table: departments
  id              INTEGER PK
  name            VARCHAR UNIQUE  (e.g. 'Marketing', 'IT Department', 'Human Resources')
  company_id      INTEGER FK → companies.id
  created_at      TIMESTAMPTZ

Table: designations
  id              INTEGER PK
  title           VARCHAR  (e.g. 'HR Manager', 'IT Manager', 'Marketing Executive')
  department_id   INTEGER FK → departments.id
  company_id      INTEGER FK → companies.id
  created_at      TIMESTAMPTZ

Table: users
  id              INTEGER PK
  first_name      VARCHAR
  last_name       VARCHAR
  username        VARCHAR UNIQUE
  email           VARCHAR UNIQUE
  role_id         INTEGER FK → user_roles.id
  is_active       BOOLEAN
  company_id      INTEGER FK → companies.id
  date_of_birth   DATE
  gender          VARCHAR
  nationality     VARCHAR
  marital_status  VARCHAR

Table: user_roles
  id              INTEGER PK
  role            VARCHAR UNIQUE  (e.g. 'admin', 'hr', 'employee')

── ATTENDANCE & TIME ─────────────────────────────────────────────────────────

Table: attendance
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  clock_in        TIMESTAMPTZ
  clock_out       TIMESTAMPTZ
  work_date       DATE
  work_hours      NUMERIC
  overtime_hrs    NUMERIC
  status          VARCHAR
  company_id      INTEGER FK → companies.id

Table: timesheet
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  project_id      INTEGER FK → projects.id
  work_date       DATE
  assigned_hours  NUMERIC
  hours_logged    NUMERIC
  description     TEXT
  company_id      INTEGER FK → companies.id

Table: overtime
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  overtime_date   DATE
  hours           NUMERIC
  type            VARCHAR
  description     TEXT
  approved_by     INTEGER FK → employees.id
  company_id      INTEGER FK → companies.id

── LEAVE MANAGEMENT ──────────────────────────────────────────────────────────

Table: leaves
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  starting_at     DATE
  ending_on       DATE
  days            INTEGER
  reason          TEXT
  status          VARCHAR  ('pending', 'approved', 'rejected')
  reviewed_by     INTEGER FK → employees.id
  company_id      INTEGER FK → companies.id
  created_at      TIMESTAMPTZ

Table: holidays
  id              INTEGER PK
  name            VARCHAR
  holiday_date    DATE
  company_id      INTEGER FK → companies.id

── PAYROLL & SALARY ──────────────────────────────────────────────────────────

Table: salaries
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  salary_month    DATE  (first day of month, e.g. 2026-03-01)
  basic           NUMERIC
  da              NUMERIC  (dearness allowance)
  hra             NUMERIC  (house rent allowance)
  conveyance      NUMERIC
  allowance       NUMERIC
  medical         NUMERIC
  others_earn     NUMERIC
  tds             NUMERIC  (tax deducted at source)
  esi             NUMERIC
  pf              NUMERIC  (provident fund)
  leave_deduction NUMERIC
  prof_tax        NUMERIC
  labour_welfare  NUMERIC
  others_ded      NUMERIC
  total_earnings  NUMERIC
  total_deductions NUMERIC
  net_salary      NUMERIC
  payslip_no      VARCHAR UNIQUE
  status          VARCHAR  ('paid', 'pending', 'processing')
  paid_on         DATE
  company_id      INTEGER FK → companies.id

Table: salary_structures
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id  (UNIQUE — one structure per employee)
  basic           NUMERIC
  da_percent      NUMERIC
  hra_percent     NUMERIC
  conveyance      NUMERIC
  allowance       NUMERIC
  medical_allow   NUMERIC
  other_earnings  NUMERIC
  tds             NUMERIC
  esi             NUMERIC
  pf              NUMERIC
  leave_deduct    NUMERIC
  prof_tax        NUMERIC
  labour_welfare  NUMERIC
  other_deduct    NUMERIC
  effective_from  DATE
  company_id      INTEGER FK → companies.id

Table: provident_fund
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id  (UNIQUE)
  pf_type         VARCHAR
  employee_share_amt  NUMERIC
  org_share_amt   NUMERIC
  employee_share_pct  NUMERIC
  org_share_pct   NUMERIC
  status          VARCHAR
  company_id      INTEGER FK → companies.id

Table: payroll_additions
  id              INTEGER PK
  name            VARCHAR
  category        VARCHAR
  unit_amount     NUMERIC
  unit_calc       BOOLEAN
  assignee        VARCHAR
  company_id      INTEGER FK → companies.id

Table: payroll_deductions
  id              INTEGER PK
  name            VARCHAR
  category        VARCHAR
  unit_amount     NUMERIC
  unit_calc       BOOLEAN
  assignee        VARCHAR
  company_id      INTEGER FK → companies.id

Table: tds_slabs
  id              INTEGER PK
  salary_from     NUMERIC
  salary_to       NUMERIC
  pct             NUMERIC

Table: taxes
  id              INTEGER PK
  name            VARCHAR UNIQUE
  percentage      NUMERIC
  status          VARCHAR
  company_id      INTEGER FK → companies.id

── PROJECTS & TASKS ──────────────────────────────────────────────────────────

Table: projects
  id              INTEGER PK
  name            VARCHAR
  client_id       INTEGER FK → clients.id
  leader_id       INTEGER FK → employees.id
  start_date      DATE
  end_date        DATE
  rate            NUMERIC
  rate_type       VARCHAR
  priority        VARCHAR  ('low', 'medium', 'high')
  status          VARCHAR  ('not_started', 'in_progress', 'completed', 'on_hold')
  company_id      INTEGER FK → companies.id

Table: project_members
  project_id      INTEGER FK → projects.id  (PK composite)
  employee_id     INTEGER FK → employees.id  (PK composite)

Table: tasks
  id              INTEGER PK
  project_id      INTEGER FK → projects.id
  title           VARCHAR
  status          VARCHAR
  assigned_to     INTEGER FK → employees.id
  created_by      INTEGER FK → employees.id
  due_date        DATE
  company_id      INTEGER FK → companies.id

── RECRUITMENT ───────────────────────────────────────────────────────────────

Table: jobs
  id              INTEGER PK
  title           VARCHAR
  department      VARCHAR
  description     TEXT
  experience_required_min  INTEGER
  experience_required_max  INTEGER
  education_required  VARCHAR
  status          VARCHAR
  company_id      INTEGER FK → companies.id

Table: candidates
  id              INTEGER PK
  job_id          INTEGER FK → jobs.id
  full_name       VARCHAR
  email           VARCHAR
  phone           VARCHAR
  total_experience  NUMERIC
  ats_score       NUMERIC
  final_score     NUMERIC
  status          VARCHAR  ('new', 'screening', 'interview', 'hired', 'rejected')
  company_id      INTEGER FK → companies.id

Table: candidate_skills
  id              INTEGER PK
  candidate_id    INTEGER FK → candidates.id
  skill_name      VARCHAR
  years_experience  NUMERIC

Table: job_skills
  id              INTEGER PK
  job_id          INTEGER FK → jobs.id
  skill_name      VARCHAR
  is_mandatory    BOOLEAN
  weight          INTEGER

── ASSETS & EXPENSES ─────────────────────────────────────────────────────────

Table: assets
  id              INTEGER PK
  asset_name      VARCHAR
  asset_code      VARCHAR UNIQUE
  purchase_date   DATE
  manufacturer    VARCHAR
  model           VARCHAR
  status          VARCHAR  ('available', 'assigned', 'maintenance', 'retired')
  price           NUMERIC
  assigned_to_id  INTEGER FK → employees.id
  company_id      INTEGER FK → companies.id

Table: expenses
  id              INTEGER PK
  item_name       VARCHAR
  purchase_from   VARCHAR
  purchase_date   DATE
  purchased_by    INTEGER FK → employees.id
  amount          NUMERIC
  paid_by         VARCHAR
  status          VARCHAR  ('pending', 'approved', 'rejected')
  company_id      INTEGER FK → companies.id

── CLIENTS & INVOICES ────────────────────────────────────────────────────────

Table: clients
  id              INTEGER PK
  first_name      VARCHAR
  last_name       VARCHAR
  email           VARCHAR UNIQUE
  phone           VARCHAR
  company         VARCHAR
  status          SMALLINT
  company_id      INTEGER FK → companies.id

Table: invoices
  id              INTEGER PK
  invoice_number  VARCHAR UNIQUE
  client_id       INTEGER FK → clients.id
  project_id      INTEGER FK → projects.id
  invoice_date    DATE
  due_date        DATE
  subtotal        NUMERIC
  tax_amount      NUMERIC
  grand_total     NUMERIC
  status          VARCHAR  ('draft', 'sent', 'paid', 'overdue')
  company_id      INTEGER FK → companies.id

Table: payments
  id              INTEGER PK
  invoice_id      INTEGER FK → invoices.id
  payment_type    VARCHAR
  paid_date       DATE
  paid_amount     NUMERIC
  company_id      INTEGER FK → companies.id

── TRAINING & DEVELOPMENT ────────────────────────────────────────────────────

Table: trainings
  id              INTEGER PK
  training_type_id  INTEGER FK → training_types.id
  trainer_id      INTEGER FK → trainers.id
  employee_id     INTEGER FK → employees.id
  training_cost   NUMERIC
  start_date      DATE
  end_date        DATE
  status          VARCHAR
  company_id      INTEGER FK → companies.id

Table: trainers
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  name            VARCHAR
  email           VARCHAR
  company_id      INTEGER FK → companies.id

Table: training_types
  id              INTEGER PK
  type_name       VARCHAR
  status          VARCHAR
  company_id      INTEGER FK → companies.id

── PERFORMANCE & GROWTH ──────────────────────────────────────────────────────

Table: goals
  id              INTEGER PK
  subject         VARCHAR
  target          TEXT
  start_date      DATE
  end_date        DATE
  status          VARCHAR  ('not_started', 'in_progress', 'completed', 'cancelled')
  progress        SMALLINT  (0-100 percentage)
  assigned_to     INTEGER FK → employees.id
  goal_type_id    INTEGER FK → goal_types.id
  company_id      INTEGER FK → companies.id

Table: promotions
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  department_id   INTEGER FK → departments.id
  promoted_from   VARCHAR
  promoted_to     VARCHAR
  promotion_date  DATE
  remarks         TEXT
  company_id      INTEGER FK → companies.id

Table: resignations
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  notice_date     DATE
  resignation_date  DATE
  notice_period   INTEGER  (days)
  reason          TEXT
  status          VARCHAR  ('pending', 'approved', 'rejected')
  approved_by     INTEGER FK → employees.id
  company_id      INTEGER FK → companies.id

── SUPPORT ───────────────────────────────────────────────────────────────────

Table: tickets
  id              INTEGER PK
  ticket_no       VARCHAR UNIQUE
  subject         VARCHAR
  description     TEXT
  priority        VARCHAR  ('low', 'medium', 'high', 'critical')
  status          VARCHAR  ('open', 'in_progress', 'resolved', 'closed')
  created_by      INTEGER FK → employees.id
  assigned_to     INTEGER FK → employees.id
  company_id      INTEGER FK → companies.id

Table: documents
  id              INTEGER PK
  employee_id     INTEGER FK → employees.id
  document_type   VARCHAR
  file_name       VARCHAR
  is_verified     BOOLEAN
  company_id      INTEGER FK → companies.id

=== KEY RELATIONSHIPS ===
employees.department_id  → departments.id
employees.designation_id → designations.id
employees.user_id        → users.id
designations.department_id → departments.id
attendance.employee_id   → employees.id
leaves.employee_id       → employees.id
salaries.employee_id     → employees.id
salary_structures.employee_id → employees.id
project_members.employee_id → employees.id
project_members.project_id  → projects.id
tasks.assigned_to        → employees.id

=== COMMON JOIN PATTERNS ===
-- Get employee with department and designation:
SELECT e.first_name, e.last_name, e.employee_id, d.name AS department, 
       dg.title AS designation, e.joining_date, e.email, e.phone, e.is_active
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
LEFT JOIN designations dg ON e.designation_id = dg.id
WHERE e.company_id = <company_id>

-- Get salary for employee:
SELECT e.first_name, e.last_name, s.net_salary, s.salary_month, s.status
FROM salaries s
JOIN employees e ON s.employee_id = e.id
WHERE s.company_id = <company_id>

-- Get leave records:
SELECT e.first_name, e.last_name, l.starting_at, l.ending_on, l.days, l.status, l.reason
FROM leaves l
JOIN employees e ON l.employee_id = e.id
WHERE l.company_id = <company_id>
"""

# Short version for supervisor intent classification (no need for full schema)
SCHEMA_SUMMARY = """
HRMS Database tables: employees, departments, designations, users,
attendance, timesheet, overtime, leaves, holidays,
salaries, salary_structures, provident_fund, payroll_additions, payroll_deductions, tds_slabs, taxes,
projects, project_members, tasks,
jobs, candidates, candidate_skills, job_skills,
assets, expenses,
clients, invoices, invoice_items, payments,
trainings, trainers, training_types,
goals, goal_types, promotions, resignations,
tickets, ticket_messages, documents, companies, audit_logs
"""