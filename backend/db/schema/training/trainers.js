import { pgTable, serial, integer, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { employees } from "../employees/employees.js";
import { companyId } from "../common/company.js";
export const trainers = pgTable("trainers", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id").references(() => employees.id),

  name: varchar("name", { length: 200 }).notNull(),
  companyId,
  phone: varchar("phone", { length: 30 }),

  email: varchar("email", { length: 150 }),

  description: text("description"),

  status: varchar("status", { length: 20 }).default("active"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});