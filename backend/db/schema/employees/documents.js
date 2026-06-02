import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { employees } from "./employees.js";
import { users } from "../core/users.js";
import { companyId } from "../common/company.js";
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),

  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id, { onDelete: "cascade" }),

  documentType: varchar("document_type", { length: 100 }).notNull(),

  fileName: varchar("file_name", { length: 255 }).notNull(),
  companyId,
  filePath: varchar("file_path", { length: 500 }).notNull(),

  fileSize: integer("file_size"),

  mimeType: varchar("mime_type", { length: 100 }),

  isVerified: boolean("is_verified").default(false).notNull(),

  uploadedBy: integer("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});