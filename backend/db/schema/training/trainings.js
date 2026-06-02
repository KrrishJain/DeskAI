import { pgTable, serial, integer, numeric, date, text, varchar, timestamp } from "drizzle-orm/pg-core";

import { trainingTypes } from "./training_types.js";
import { trainers } from "./trainers.js";
import { employees } from "../employees/employees.js";
import { companyId } from "../common/company.js";
export const trainings = pgTable("trainings", {
  id: serial("id").primaryKey(),
  companyId,
  trainingTypeId: integer("training_type_id").references(() => trainingTypes.id),

  trainerId: integer("trainer_id").references(() => trainers.id),

  employeeId: integer("employee_id").references(() => employees.id),

  trainingCost: numeric("training_cost", { precision: 12, scale: 2 }),

  startDate: date("start_date"),

  endDate: date("end_date"),

  description: text("description"),

  status: varchar("status", { length: 20 }).default("active"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});