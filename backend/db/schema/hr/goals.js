import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  smallint,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
import { goalTypes } from "./goal_types.js";
import { employees } from "../employees/employees.js";
import { goalStatusEnum } from "../enums.js";

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),

  goalTypeId: integer("goal_type_id").references(() => goalTypes.id, {
    onDelete: "set null",
  }),

  subject: varchar("subject", { length: 200 }).notNull(),

  target: text("target").notNull(),

  startDate: date("start_date").notNull(),

  endDate: date("end_date").notNull(),

  description: text("description"),

  status: goalStatusEnum("status").default("active").notNull(),

  progress: smallint("progress").default(0).notNull(),

  assignedTo: integer("assigned_to").references(() => employees.id, {
    onDelete: "set null",
  }),
  companyId,
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});