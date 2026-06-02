import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  text,
  timestamp,
  date,
} from "drizzle-orm/pg-core";

import { employees } from "../employees/employees.js";
import { assetStatusEnum } from "../enums.js";
import { companyId } from "../common/company.js";

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),

  assetName: varchar("asset_name", { length: 200 }).notNull(),

  assetCode: varchar("asset_code", { length: 200 })
    .notNull()
    .unique(),

  purchaseDate: date("purchase_date"),

  purchaseFrom: varchar("purchase_from", { length: 200 }),

  manufacturer: varchar("manufacturer", { length: 200 }),

  model: varchar("model", { length: 200 }),

  status: assetStatusEnum("status").default("pending").notNull(),

  supplier: varchar("supplier", { length: 255 }),

  condition: varchar("condition", { length: 255 }),

  warranty: varchar("warranty", { length: 255 }),

  price: numeric("price", { precision: 12, scale: 2 })
    .default("0")
    .notNull(),

  assignedToId: integer("assigned_to_id").references(() => employees.id, {
    onDelete: "set null",
  }),

  description: text("description"),
  companyId,
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});