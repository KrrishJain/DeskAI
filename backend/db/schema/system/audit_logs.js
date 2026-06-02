import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  inet,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),

  tableName: varchar("table_name", { length: 100 }).notNull(),
  companyId,
  recordId: integer("record_id").notNull(),

  action: varchar("action", { length: 20 }).notNull(),

  changedBy: integer("changed_by"),

  changedByType: varchar("changed_by_type", { length: 20 })
    .default("user")
    .notNull(),

  oldValues: jsonb("old_values"),

  newValues: jsonb("new_values"),

  ipAddress: inet("ip_address"),

  userAgent: text("user_agent"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});