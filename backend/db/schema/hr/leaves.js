import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  date,
  unique
} from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { users } from "../core/users.js";
import { leaveStatusEnum } from "../enums.js";
import { companyId } from "../common/company.js";

export const leaves = pgTable(
  "leaves",
  {
    id: serial("id").primaryKey(),

    companyId,

    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),

    startingAt: date("starting_at").notNull(),

    endingOn: date("ending_on").notNull(),

    days: integer("days").notNull(),

    reason: text("reason").notNull(),

    status: leaveStatusEnum("status").default("pending").notNull(),

    reviewedBy: integer("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    leaveDuplicateGuard: unique("leave_duplicate_guard").on(
      table.companyId,
      table.employeeId,
      table.startingAt,
      table.endingOn
    ),
  })
);