import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  text,
  timestamp,
  unique
} from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { companyId } from "../common/company.js";

export const providentFund = pgTable(
  "provident_fund",
  {
    id: serial("id").primaryKey(),

    companyId,

    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    pfType: varchar("pf_type", { length: 30 }).notNull(),

    employeeShareAmt: numeric("employee_share_amt", { precision: 12, scale: 2 }).default("0"),

    orgShareAmt: numeric("org_share_amt", { precision: 12, scale: 2 }).default("0"),

    employeeSharePct: numeric("employee_share_pct", { precision: 5, scale: 2 }).default("0"),

    orgSharePct: numeric("org_share_pct", { precision: 5, scale: 2 }).default("0"),

    description: text("description"),

    status: varchar("status", { length: 20 }).default("pending").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueEmployee: unique("uq_pf_employee").on(table.employeeId),
  })
);