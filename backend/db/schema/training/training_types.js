import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
export const trainingTypes = pgTable("training_types", {
  id: serial("id").primaryKey(),

  typeName: varchar("type_name", { length: 200 }).notNull(),
  companyId,
  description: text("description"),

  status: varchar("status", { length: 20 }).default("active"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});