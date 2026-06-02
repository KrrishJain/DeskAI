import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";

import { projects } from "./projects.js";
import { employees } from "../employees/employees.js";

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.employeeId] }),
  })
);