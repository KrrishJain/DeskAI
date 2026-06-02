import {
  pgTable,
  serial,
  varchar,
  smallint,
  timestamp,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),

  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),

  username: varchar("username", { length: 255 })
    .notNull()
    .unique(),
  companyId,
  email: varchar("email", { length: 255 })
    .notNull()
    .unique(),

  passwordHash: varchar("password_hash", { length: 255 }).notNull(),

  clientId: varchar("client_id", { length: 50 })
    .notNull()
    .unique(),

  phone: varchar("phone", { length: 20 }),

  company: varchar("company", { length: 255 }),

  address: varchar("address", { length: 255 }),

  status: smallint("status").default(1).notNull(),

  picture: varchar("picture", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});