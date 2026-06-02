import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { userRoleEnum } from "../enums.js";

export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  role: userRoleEnum("role").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});