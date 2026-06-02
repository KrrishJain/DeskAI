import { pgTable, serial, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { departments } from "./departments.js";
import { companyId } from "../common/company.js";
export const designations = pgTable("designations", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 100 }).notNull(),
  companyId,
  departmentId: integer("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});