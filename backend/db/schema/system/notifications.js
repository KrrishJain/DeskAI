import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),

  recipientId: integer("recipient_id").notNull(),

  recipientType: varchar("recipient_type", { length: 20 })
    .default("user")
    .notNull(),

  title: varchar("title", { length: 255 }).notNull(),
  companyId,
  message: text("message").notNull(),

  type: varchar("type", { length: 50 })
    .default("info")
    .notNull(),

  isRead: boolean("is_read").default(false).notNull(),

  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});