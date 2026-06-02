import {
  pgTable,
  serial,
  varchar,
  numeric,
  timestamp
} from "drizzle-orm/pg-core";

import { companyId } from "../common/company.js";

export const taxes = pgTable("taxes", {
  id: serial("id").primaryKey(),

  companyId,

  name: varchar("name", { length: 100 }).notNull().unique(),

  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),

  status: varchar("status", { length: 10 }).default("active").notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});