import { pgTable, serial, varchar, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
export const salarySettings = pgTable("salary_settings", {
  id: serial("id").primaryKey(),

  settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
  companyId,
  value: numeric("value", { precision: 8, scale: 4 }).default("0"),

  enabled: boolean("enabled").default(true),

  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});