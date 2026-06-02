import { pgEnum } from "drizzle-orm/pg-core";

export const assetStatusEnum = pgEnum("asset_status", [
  "pending",
  "approved",
  "returned"
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "approved",
  "rejected"
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "inactive",
  "completed"
]);

export const userRoleEnum = pgEnum("user_role_enum", [
  "admin",
  "hr",
  "employee"
]);