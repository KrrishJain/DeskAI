import { pgTable, serial, integer, date, text, varchar, timestamp } from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { companyId } from "../common/company.js";
export const resignations = pgTable("resignations", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id").references(() => employees.id),
  companyId,
  noticeDate: date("notice_date"),

  resignationDate: date("resignation_date"),

  reason: text("reason"),

  status: varchar("status", { length: 20 }).default("pending"),

  approvedBy: integer("approved_by").references(() => employees.id),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});