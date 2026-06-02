import {
  pgTable,
  serial,
  integer,
  timestamp,
  inet,
  numeric,
  text,
  varchar,
  date
} from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { companyId } from "../common/company.js";
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),

  clockIn: timestamp("clock_in", { withTimezone: true }).notNull(),

  clockOut: timestamp("clock_out", { withTimezone: true }),

  clockInIp: inet("clock_in_ip"),

  clockOutIp: inet("clock_out_ip"),

  clockInLat: numeric("clock_in_lat"),

  clockInLng: numeric("clock_in_lng"),

  clockOutLat: numeric("clock_out_lat"),

  clockOutLng: numeric("clock_out_lng"),

  workHours: numeric("work_hours"),

  notes: text("notes"),
  companyId,
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  workDate: date("work_date"),

  punchIn: timestamp("punch_in", { withTimezone: true }),

  punchOut: timestamp("punch_out", { withTimezone: true }),

  status: varchar("status", { length: 20 }).default("present"),

  overtimeHrs: numeric("overtime_hrs", { precision: 4, scale: 2 }).default("0"),
});