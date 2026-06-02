import {
  pgTable,
  serial,
  integer,
  numeric,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
import { employees } from "../employees/employees.js";

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id")
    .notNull()
    .unique()
    .references(() => employees.id, { onDelete: "cascade" }),

  basic: numeric("basic", { precision: 12, scale: 2 }).default("0").notNull(),

  daPercent: numeric("da_percent", { precision: 5, scale: 2 })
    .default("40")
    .notNull(),

  hraPercent: numeric("hra_percent", { precision: 5, scale: 2 })
    .default("15")
    .notNull(),

  conveyance: numeric("conveyance", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  allowance: numeric("allowance", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  medicalAllow: numeric("medical_allow", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  otherEarnings: numeric("other_earnings", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  tds: numeric("tds", { precision: 12, scale: 2 }).default("0").notNull(),

  esi: numeric("esi", { precision: 12, scale: 2 }).default("0").notNull(),

  pf: numeric("pf", { precision: 12, scale: 2 }).default("0").notNull(),
  companyId,
  leaveDeduct: numeric("leave_deduct", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  profTax: numeric("prof_tax", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  labourWelfare: numeric("labour_welfare", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  otherDeduct: numeric("other_deduct", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  effectiveFrom: date("effective_from").defaultNow().notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});