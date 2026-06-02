import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { userRoles } from "./user_roles.js";
import { companyId } from "../common/company.js";
export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  firstName: varchar("first_name", { length: 200 }).notNull(),
  lastName: varchar("last_name", { length: 200 }).notNull(),

  username: varchar("username", { length: 200 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),

  companyId,

  passwordHash: varchar("password_hash", { length: 255 }).notNull(),

  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 200 }),
  picture: varchar("picture", { length: 255 }),

  roleId: integer("role_id")
    .references(() => userRoles.id)
    .default(1)
    .notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});