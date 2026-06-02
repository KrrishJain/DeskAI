import { pgTable, serial, numeric, timestamp } from "drizzle-orm/pg-core";

export const tdsSlabs = pgTable("tds_slabs", {
  id: serial("id").primaryKey(),

  salaryFrom: numeric("salary_from", { precision: 12, scale: 2 }),

  salaryTo: numeric("salary_to", { precision: 12, scale: 2 }),

  pct: numeric("pct", { precision: 6, scale: 2 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});