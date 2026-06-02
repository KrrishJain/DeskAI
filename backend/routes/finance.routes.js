import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

import * as taxesCtrl from "../controllers/taxesController.js";
import * as invoicesCtrl from "../controllers/invoicesController.js";
import * as paymentsCtrl from "../controllers/paymentsController.js";
import * as expensesCtrl from "../controllers/expensesController.js";
import * as pfCtrl from "../controllers/providentFundController.js";
import * as payrollCtrl from "../controllers/payrollController.js";

const router = Router();

/* Taxes */
router.get("/taxes",                authenticate,                          taxesCtrl.getAll);
router.get("/taxes/active",         authenticate,                          taxesCtrl.getActive);
router.post("/taxes",               authenticate, authorize("admin","hr"), taxesCtrl.create);
router.put("/taxes/:id",            authenticate, authorize("admin","hr"), taxesCtrl.update);
router.patch("/taxes/:id/status",   authenticate, authorize("admin","hr"), taxesCtrl.toggleStatus);
router.delete("/taxes/:id",         authenticate, authorize("admin","hr"), taxesCtrl.remove);

/* Invoices */
router.get("/invoices",              authenticate,                          invoicesCtrl.getAll);
router.get("/invoices/:id",          authenticate,                          invoicesCtrl.getById);
router.post("/invoices",             authenticate, authorize("admin","hr"), invoicesCtrl.create);
router.put("/invoices/:id",          authenticate, authorize("admin","hr"), invoicesCtrl.update);
router.patch("/invoices/:id/status", authenticate, authorize("admin","hr"), invoicesCtrl.updateStatus);
router.delete("/invoices/:id",       authenticate, authorize("admin","hr"), invoicesCtrl.remove);
/* Payments */

router.get("/payments", authenticate, paymentsCtrl.getAll);
router.post("/payments", authenticate, authorize("admin","hr"), paymentsCtrl.create);

/* Expenses */

router.get("/expenses",              authenticate, expensesCtrl.getAll);
router.get("/expenses/:id",          authenticate, expensesCtrl.getById);
router.post("/expenses",             authenticate, expensesCtrl.create);
router.put("/expenses/:id",          authenticate, expensesCtrl.update);
router.patch("/expenses/:id/status", authenticate, expensesCtrl.updateStatus);
router.delete("/expenses/:id",       authenticate, expensesCtrl.remove);

router.post("/expenses", authenticate, authorize("admin","hr"), expensesCtrl.create);

router.put("/expenses/:id", authenticate, authorize("admin","hr"), expensesCtrl.update);

router.patch(
  "/expenses/:id/status",
  authenticate,
  authorize("admin","hr"),
  expensesCtrl.updateStatus
);

router.delete(
  "/expenses/:id",
  authenticate,
  authorize("admin","hr"),
  expensesCtrl.remove
);

/* Provident Fund */

router.get("/provident-fund", authenticate, pfCtrl.getAll);
router.get("/provident-fund/:id", authenticate, pfCtrl.getById);
router.post("/provident-fund", authenticate, pfCtrl.create);
router.put("/provident-fund/:id", authenticate, pfCtrl.update);
router.patch("/provident-fund/:id/status", authenticate, pfCtrl.updateStatus);
router.delete("/provident-fund/:id", authenticate, pfCtrl.remove);

/* Payroll */

// ── Salary ─────────────────────────────────────────────────────────────────
router.get("/payroll",              authenticate, payrollCtrl.getAll);
router.get("/payroll/:id",          authenticate, payrollCtrl.getOne);
router.post("/payroll",             authenticate, payrollCtrl.create);
router.put("/payroll/:id",          authenticate, payrollCtrl.update);
router.patch("/payroll/:id/paid",   authenticate, payrollCtrl.markPaid);
router.delete("/payroll/:id",       authenticate, payrollCtrl.remove);
 
// ── Payroll Additions ──────────────────────────────────────────────────────
router.get("/payroll/additions",           authenticate, payrollCtrl.getAdditions);
router.post("/payroll/additions",          authenticate, payrollCtrl.createAddition);
router.put("/payroll/additions/:id",       authenticate, payrollCtrl.updateAddition);
router.delete("/payroll/additions/:id",    authenticate, payrollCtrl.deleteAddition);
 
// ── Payroll Deductions ─────────────────────────────────────────────────────
router.get("/payroll/deductions",          authenticate, payrollCtrl.getDeductions);
router.post("/payroll/deductions",         authenticate, payrollCtrl.createDeduction);
router.put("/payroll/deductions/:id",      authenticate, payrollCtrl.updateDeduction);
router.delete("/payroll/deductions/:id",   authenticate, payrollCtrl.deleteDeduction);
 
// ── Salary Settings ────────────────────────────────────────────────────────
router.get("/settings",             authenticate, payrollCtrl.getSettings);
router.post("/settings",            authenticate, payrollCtrl.updateSettings);
 

export default router;