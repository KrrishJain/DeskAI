import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
import { goalStatusEnum } from "../enums.js";

export const goalTypes = pgTable("goal_types", {
  id: serial("id").primaryKey(),

  type: varchar("type", { length: 200 }).notNull().unique(),

  description: text("description"),

  status: goalStatusEnum("status").default("active").notNull(),
  companyId,    
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});