ALTER TABLE "attendance" ALTER COLUMN "clock_in" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "clock_in_lat" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "clock_in_lng" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "clock_out_lat" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "clock_out_lng" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "attendance" ALTER COLUMN "work_hours" SET DATA TYPE numeric;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "work_date" date;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "punch_in" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "punch_out" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "status" varchar(20) DEFAULT 'present';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "overtime_hrs" numeric(4, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "company_id" integer;