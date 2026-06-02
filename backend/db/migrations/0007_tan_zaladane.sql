CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) DEFAULT 'SmartHR' NOT NULL,
	"logo_url" text,
	"currency_symbol" varchar(10) DEFAULT '$' NOT NULL,
	"address" text,
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"mobile" varchar(50),
	"fax" varchar(50),
	"website" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"subscription_start" date,
	"subscription_end" date,
	"status" varchar(50) DEFAULT 'active',
	"admin_username" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "global_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;