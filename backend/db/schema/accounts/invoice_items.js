import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  numeric
} from "drizzle-orm/pg-core";

import { invoices } from "./invoices.js";
import { companyId } from "../common/company.js";

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),

  companyId,

  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),

  itemName: varchar("item_name", { length: 200 }).notNull(),

  description: text("description"),

  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).default("0"),

  quantity: numeric("quantity", { precision: 10, scale: 2 }).default("1"),

  sortOrder: integer("sort_order").default(0),
});