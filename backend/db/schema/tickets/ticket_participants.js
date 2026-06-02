import {
  pgTable,
  integer,
  timestamp,
  primaryKey
} from "drizzle-orm/pg-core";

import { companyId } from "../common/company.js";
import { tickets } from "./tickets.js";
import { users } from "../core/users.js";

export const ticketParticipants = pgTable(
  "ticket_participants",
  {
    companyId,

    ticketId: integer("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),

    employeeId: integer("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.companyId, table.ticketId, table.employeeId],
    }),
  })
);