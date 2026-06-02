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

import { clients } from "../core/clients.js";
import { projects } from "../projects/projects.js";
import { users } from "../core/users.js";
import { taxes } from "./taxes.js";
import { companyId } from "../common/company.js";

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),

  companyId,

  invoiceNumber: varchar("invoice_number", { length: 20 })
    .notNull()
    .unique(),

  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id, { onDelete: "restrict" }),

  projectId: integer("project_id")
    .references(() => projects.id, { onDelete: "set null" }),

  taxId: integer("tax_id")
    .references(() => taxes.id, { onDelete: "set null" }),

  clientAddress: text("client_address"),

  billingAddress: text("billing_address"),

  invoiceDate: date("invoice_date").notNull(),

  dueDate: date("due_date").notNull(),

  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0"),

  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),

  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).default("0"),

  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).default("0"),

  status: varchar("status", { length: 20 }).default("draft").notNull(),

  otherInfo: text("other_info"),

  createdBy: integer("created_by")
    .references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow(),
});