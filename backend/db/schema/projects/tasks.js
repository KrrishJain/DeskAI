import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  date
} from "drizzle-orm/pg-core";

import { projects } from "./projects.js";
import { employees } from "../employees/employees.js";
import { companyId } from "../common/company.js";
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),

  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 500 }).notNull(),

  description: text("description"),

  status: varchar("status", { length: 20 })
    .default("todo")
    .notNull(),

  assignedTo: integer("assigned_to")
    .references(() => employees.id, { onDelete: "set null" }),
  companyId,
  createdBy: integer("created_by")
    .references(() => employees.id, { onDelete: "set null" }),

  dueDate: date("due_date"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});