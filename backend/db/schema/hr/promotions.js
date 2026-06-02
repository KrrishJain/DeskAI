import { pgTable, serial, integer, varchar, date, boolean, text, timestamp } from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { departments } from "../core/departments.js";
import { companyId } from "../common/company.js";
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id").references(() => employees.id),
  companyId,
  departmentId: integer("department_id").references(() => departments.id),

  promotedFrom: varchar("promoted_from", { length: 200 }),

  promotedTo: varchar("promoted_to", { length: 200 }),

  promotionDate: date("promotion_date"),

  autoUpdateDesig: boolean("auto_update_desig").default(true),

  remarks: text("remarks"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});