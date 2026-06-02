import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  text,
  timestamp,
  date
} from "drizzle-orm/pg-core";

import { invoices } from "./invoices.js";
import { users } from "../core/users.js";
import { companyId } from "../common/company.js";

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),

  companyId,

  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),

  paymentType: varchar("payment_type", { length: 50 }).notNull(),

  paidDate: date("paid_date").notNull(),

  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull(),

  notes: text("notes"),

  recordedBy: integer("recorded_by")
    .references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow(),
});