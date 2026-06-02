import { integer } from "drizzle-orm/pg-core";

export const companyId = integer("company_id").notNull();