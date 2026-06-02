import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp
} from "drizzle-orm/pg-core";

import { users } from "../core/users.js";
import { companyId } from "../common/company.js";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),

  companyId,

  title: varchar("title", { length: 255 }).notNull(),

  department: varchar("department", { length: 255 }),

  description: text("description"),

  experienceRequiredMin: integer("experience_required_min").default(0),

  experienceRequiredMax: integer("experience_required_max"),

  educationRequired: varchar("education_required", { length: 255 }),

  educationStrict: boolean("education_strict").default(false),

  status: varchar("status", { length: 50 }).default("open"),

  maxResumes: integer("max_resumes").default(10),

  skillWeight: integer("skill_weight").default(50),

  experienceWeight: integer("experience_weight").default(30),

  educationWeight: integer("education_weight").default(20),

  projectKeywords: text("project_keywords").array(),

  createdBy: integer("created_by").references(() => users.id, {
    onDelete: "set null"
  }),

  createdAt: timestamp("created_at").defaultNow(),

  updatedAt: timestamp("updated_at").defaultNow()
});