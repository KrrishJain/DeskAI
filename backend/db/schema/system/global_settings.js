import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp
} from "drizzle-orm/pg-core";

import { companies } from "./companies.js";

export const globalSettings = pgTable("global_settings", {
  id: serial("id").primaryKey(),

  companyId: integer("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),

  key: varchar("key", { length: 255 }).notNull(),

  value: text("value"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
});