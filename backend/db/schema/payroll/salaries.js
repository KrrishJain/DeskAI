import {
  pgTable,
  serial,
  integer,
  numeric,
  varchar,
  date,
  text,
  timestamp
} from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { companyId } from "../common/company.js";
export const salaries = pgTable("salaries", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),

  salaryMonth: date("salary_month").notNull(),
  companyId,
  basic: numeric("basic", { precision: 12, scale: 2 }).default("0"),
  da: numeric("da", { precision: 12, scale: 2 }).default("0"),
  hra: numeric("hra", { precision: 12, scale: 2 }).default("0"),
  conveyance: numeric("conveyance", { precision: 12, scale: 2 }).default("0"),
  allowance: numeric("allowance", { precision: 12, scale: 2 }).default("0"),
  medical: numeric("medical", { precision: 12, scale: 2 }).default("0"),
  othersEarn: numeric("others_earn", { precision: 12, scale: 2 }).default("0"),

  tds: numeric("tds", { precision: 12, scale: 2 }).default("0"),
  esi: numeric("esi", { precision: 12, scale: 2 }).default("0"),
  pf: numeric("pf", { precision: 12, scale: 2 }).default("0"),
  leaveDeduction: numeric("leave_deduction", { precision: 12, scale: 2 }).default("0"),
  profTax: numeric("prof_tax", { precision: 12, scale: 2 }).default("0"),
  labourWelfare: numeric("labour_welfare", { precision: 12, scale: 2 }).default("0"),
  othersDed: numeric("others_ded", { precision: 12, scale: 2 }).default("0"),

  payslipNo: varchar("payslip_no", { length: 20 }).unique(),

  status: varchar("status", { length: 20 }).default("unpaid"),

  paidOn: date("paid_on"),

  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});