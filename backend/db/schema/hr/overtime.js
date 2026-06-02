import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  date,
  numeric,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
import { employees } from "../employees/employees.js";
import { users } from "../core/users.js";

export const overtime = pgTable("overtime", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),

  overtimeDate: date("overtime_date").notNull(),

  hours: numeric("hours", { precision: 4, scale: 1 }).notNull(),

  type: varchar("type", { length: 200 }).notNull(),

  description: text("description"),
  companyId,
  approvedBy: integer("approved_by").references(() => users.id, {
    onDelete: "set null",
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});