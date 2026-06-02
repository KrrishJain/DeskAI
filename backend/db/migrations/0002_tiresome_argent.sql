CREATE TABLE "timesheet" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"project_id" integer,
	"work_date" date,
	"assigned_hours" numeric(5, 2) DEFAULT '8',
	"hours_logged" numeric(5, 2) DEFAULT '0',
	"description" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"department_id" integer,
	"promoted_from" varchar(200),
	"promoted_to" varchar(200),
	"promotion_date" date,
	"auto_update_desig" boolean DEFAULT true,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resignations" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"notice_date" date,
	"resignation_date" date,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending',
	"approved_by" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"salary_month" date NOT NULL,
	"basic" numeric(12, 2) DEFAULT '0',
	"da" numeric(12, 2) DEFAULT '0',
	"hra" numeric(12, 2) DEFAULT '0',
	"conveyance" numeric(12, 2) DEFAULT '0',
	"allowance" numeric(12, 2) DEFAULT '0',
	"medical" numeric(12, 2) DEFAULT '0',
	"others_earn" numeric(12, 2) DEFAULT '0',
	"tds" numeric(12, 2) DEFAULT '0',
	"esi" numeric(12, 2) DEFAULT '0',
	"pf" numeric(12, 2) DEFAULT '0',
	"leave_deduction" numeric(12, 2) DEFAULT '0',
	"prof_tax" numeric(12, 2) DEFAULT '0',
	"labour_welfare" numeric(12, 2) DEFAULT '0',
	"others_ded" numeric(12, 2) DEFAULT '0',
	"payslip_no" varchar(20),
	"status" varchar(20) DEFAULT 'unpaid',
	"paid_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "salaries_payslip_no_unique" UNIQUE("payslip_no")
);
--> statement-breakpoint
CREATE TABLE "payroll_additions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(100) DEFAULT 'monthly',
	"unit_amount" numeric(12, 2) DEFAULT '0',
	"unit_calc" boolean DEFAULT false,
	"assignee" varchar(20) DEFAULT 'none',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payroll_deductions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(100) DEFAULT 'monthly',
	"unit_amount" numeric(12, 2) DEFAULT '0',
	"unit_calc" boolean DEFAULT false,
	"assignee" varchar(20) DEFAULT 'none',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "salary_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"value" numeric(8, 4) DEFAULT '0',
	"enabled" boolean DEFAULT true,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "salary_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "tds_slabs" (
	"id" serial PRIMARY KEY NOT NULL,
	"salary_from" numeric(12, 2),
	"salary_to" numeric(12, 2),
	"pct" numeric(6, 2),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_name" varchar(200) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"name" varchar(200) NOT NULL,
	"phone" varchar(30),
	"email" varchar(150),
	"description" text,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trainings" (
	"id" serial PRIMARY KEY NOT NULL,
	"training_type_id" integer,
	"trainer_id" integer,
	"employee_id" integer,
	"training_cost" numeric(12, 2),
	"start_date" date,
	"end_date" date,
	"description" text,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_approved_by_employees_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salaries" ADD CONSTRAINT "salaries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_training_type_id_training_types_id_fk" FOREIGN KEY ("training_type_id") REFERENCES "public"."training_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainings" ADD CONSTRAINT "trainings_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;