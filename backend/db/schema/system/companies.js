import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  date
} from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).notNull().default("SmartHR"),

  logoUrl: text("logo_url"),

  currencySymbol: varchar("currency_symbol", { length: 10 })
    .notNull()
    .default("$"),

  address: text("address"),

  timezone: varchar("timezone", { length: 100 })
    .notNull()
    .default("UTC"),

  contactPerson: varchar("contact_person", { length: 255 }),

  email: varchar("email", { length: 255 }),

  phone: varchar("phone", { length: 50 }),

  mobile: varchar("mobile", { length: 50 }),

  fax: varchar("fax", { length: 50 }),

  website: varchar("website", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  isActive: boolean("is_active")
    .default(true)
    .notNull(),

  subscriptionStart: date("subscription_start"),

  subscriptionEnd: date("subscription_end"),

  status: varchar("status", { length: 50 }).default("active"),

  adminUsername: varchar("admin_username", { length: 255 })
});