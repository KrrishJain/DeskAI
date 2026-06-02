import { pgTable, serial, integer, numeric, text, date, timestamp } from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { projects } from "../projects/projects.js";
import { companyId } from "../common/company.js";
export const timesheet = pgTable("timesheet", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id").references(() => employees.id),
  companyId,
  projectId: integer("project_id").references(() => projects.id),

  workDate: date("work_date"),

  assignedHours: numeric("assigned_hours", { precision: 5, scale: 2 }).default("8"),

  hoursLogged: numeric("hours_logged", { precision: 5, scale: 2 }).default("0"),

  description: text("description"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});