import { pgTable, serial, varchar, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
export const payrollAdditions = pgTable("payroll_additions", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 200 }).notNull(),
  companyId,
  category: varchar("category", { length: 100 }).default("monthly"),

  unitAmount: numeric("unit_amount", { precision: 12, scale: 2 }).default("0"),

  unitCalc: boolean("unit_calc").default(false),

  assignee: varchar("assignee", { length: 20 }).default("none"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});