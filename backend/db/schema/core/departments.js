import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  companyId,
  name: varchar("name", { length: 200 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});