/**
 * middleware/auditLogger.js
 */

import { db } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const MODULE_MAP = {
  employees: "Employees",
  users: "Users",
  leaves: "Leaves",
  payroll: "Payroll",
  salary: "Payroll",
  projects: "Projects",
  clients: "Clients",
  assets: "Assets",
  documents: "Documents",
  holidays: "Holidays",
  overtime: "Overtime",
  training: "Training",
  goals: "Goals",
  promotion: "Promotions",
  resignation: "Resignations",
  departments: "Departments",
  designations: "Designations",
  settings: "Settings",
  timesheet: "Timesheet",
};

const auditLogger = (req, _res, next) => {
  if (!WRITE_METHODS.has(req.method)) return next();

  setImmediate(async () => {
    try {
      const parts = req.path.replace(/^\/+/, "").split("/");
      const segment = parts[0] || "unknown";
      const moduleName = MODULE_MAP[segment] || segment;

      const recordId =
        parseInt(req.params?.id || req.params?.taskId || 0) || 0;

      await db.insert(auditLogs).values({
        table_name: segment,
        record_id: recordId,
        action:
          req.method === "POST"
            ? "INSERT"
            : req.method === "DELETE"
            ? "DELETE"
            : "UPDATE",
        changed_by: req.user?.id || null,
        module: moduleName,
        method: req.method,
        endpoint: req.originalUrl,
        ip_address: req.ip || null,
        user_agent: req.headers["user-agent"] || null,
      });
    } catch (_) {
      // Never let audit logging crash the app
    }
  });

  next();
};

export default auditLogger;