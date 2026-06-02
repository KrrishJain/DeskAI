import {
  pgTable,
  serial,
  varchar,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 200 }).notNull(),

  holidayDate: date("holiday_date").notNull(),
  companyId,
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});