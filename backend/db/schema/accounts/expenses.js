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

import { employees } from "../employees/employees.js";
import { users } from "../core/users.js";
import { companyId } from "../common/company.js";

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),

  companyId,

  itemName: varchar("item_name", { length: 200 }).notNull(),

  purchaseFrom: varchar("purchase_from", { length: 200 }).notNull(),

  purchaseDate: date("purchase_date").notNull(),

  purchasedBy: integer("purchased_by")
    .notNull()
    .references(() => employees.id, { onDelete: "restrict" }),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

  paidBy: varchar("paid_by", { length: 20 }).notNull(),

  status: varchar("status", { length: 20 }).default("pending").notNull(),

  attachmentPath: varchar("attachment_path", { length: 500 }),

  createdBy: integer("created_by")
    .references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow(),
});