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
import { companyId } from "../common/company.js";
import { clients } from "../core/clients.js";
import { employees } from "../employees/employees.js";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull(),

  clientId: integer("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  companyId,
  leaderId: integer("leader_id").references(() => employees.id, {
    onDelete: "set null",
  }),

  startDate: date("start_date"),
  endDate: date("end_date"),

  rate: numeric("rate", { precision: 10, scale: 2 }),

  rateType: varchar("rate_type", { length: 20 })
    .default("hourly")
    .notNull(),

  priority: varchar("priority", { length: 20 })
    .default("medium")
    .notNull(),

  description: text("description"),

  status: varchar("status", { length: 30 })
    .default("active")
    .notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});