import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  timestamp
} from "drizzle-orm/pg-core";

import { candidates } from "./candidates.js";

export const candidateSkills = pgTable("candidate_skills", {
  id: serial("id").primaryKey(),

  candidateId: integer("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),

  skillName: varchar("skill_name", { length: 255 }).notNull(),

  yearsExperience: numeric("years_experience", { precision: 4, scale: 1 }),

  createdAt: timestamp("created_at").defaultNow()
});