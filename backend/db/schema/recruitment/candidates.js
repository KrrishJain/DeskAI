import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  numeric,
  jsonb,
  timestamp
} from "drizzle-orm/pg-core";

import { jobs } from "./jobs.js";
import { companyId } from "../common/company.js";

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),

  companyId,

  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),

  fullName: varchar("full_name", { length: 255 }),

  email: varchar("email", { length: 255 }),

  phone: varchar("phone", { length: 50 }),

  resumeFilePath: text("resume_file_path").notNull(),

  originalFilename: varchar("original_filename", { length: 255 }),

  totalExperience: numeric("total_experience", { precision: 4, scale: 1 }),

  relevantExperience: numeric("relevant_experience", { precision: 4, scale: 1 }),

  education: varchar("education", { length: 255 }),

  parsedData: jsonb("parsed_data"),

  atsScore: numeric("ats_score", { precision: 5, scale: 2 }),

  manualScoreOverride: numeric("manual_score_override", { precision: 5, scale: 2 }),

  scoreBreakdown: jsonb("score_breakdown"),

  status: varchar("status", { length: 50 }).default("uploaded"),

  hrNotes: text("hr_notes"),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow()
});