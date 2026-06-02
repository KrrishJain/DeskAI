import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
} from "drizzle-orm/pg-core";

import { departments } from "../core/departments.js";
import { designations } from "../core/designations.js";
import { companyId } from "../common/company.js";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),

  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),

  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),

  departmentId: integer("department_id").references(() => departments.id, {
    onDelete: "set null",
  }),
  designationId: integer("designation_id").references(() => designations.id, {
    onDelete: "set null",
  }),

  joiningDate: date("joining_date").defaultNow().notNull(),
  picture: varchar("picture", { length: 200 }),
  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

  // ✅ These were missing — now added back
  userId: integer("user_id").unique(),
  companyId,
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),

  // ✅ Bank details — also in DB, now included
  bankName: varchar("bank_name", { length: 100 }),
  accountNumber: varchar("account_number", { length: 100 }),
  ifscCode: varchar("ifsc_code", { length: 50 }),
  branchName: varchar("branch_name", { length: 100 }),
});