import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  unique
} from "drizzle-orm/pg-core";

import { users } from "../core/users.js";
import { companyId } from "../common/company.js";

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),

    companyId,

    ticketNo: varchar("ticket_no", { length: 20 }).notNull(),

    subject: varchar("subject", { length: 255 }).notNull(),

    description: text("description").notNull(),

    priority: varchar("priority", { length: 20 }).default("medium").notNull(),

    status: varchar("status", { length: 20 }).default("open").notNull(),

    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    assignedTo: integer("assigned_to").references(() => users.id, {
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
    ticketCompanyUnique: unique("uq_tickets_company_ticket_no").on(
      table.companyId,
      table.ticketNo
    ),
  })
);