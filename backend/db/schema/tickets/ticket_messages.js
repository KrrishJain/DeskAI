import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  timestamp
} from "drizzle-orm/pg-core";
import { companyId } from "../common/company.js";
import { tickets } from "./tickets.js";
import { users } from "../core/users.js";

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),


  ticketId: integer("ticket_id")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),

  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  message: text("message").notNull(),

  senderName: varchar("sender_name", { length: 255 }),
  companyId,
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});