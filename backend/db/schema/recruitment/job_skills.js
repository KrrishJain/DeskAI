import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp
} from "drizzle-orm/pg-core";

import { jobs } from "./jobs.js";

export const jobSkills = pgTable("job_skills", {
  id: serial("id").primaryKey(),

  jobId: integer("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),

  skillName: varchar("skill_name", { length: 255 }).notNull(),

  isMandatory: boolean("is_mandatory").default(false),

  weight: integer("weight").default(10),

  createdAt: timestamp("created_at").defaultNow()
});