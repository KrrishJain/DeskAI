import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import * as superAdminCtrl from "../controllers/superAdminController.js";

const router = Router();

router.get(
  "/super-admin/companies",
  authenticate,
  authorize("superadmin"),
  superAdminCtrl.getCompanies
);

router.post(
  "/super-admin/companies",
  authenticate,
  authorize("superadmin"),
  superAdminCtrl.createCompanyWithAdmin
);

router.put(
  "/super-admin/companies/:id/status",
  authenticate,
  authorize("superadmin"),
  superAdminCtrl.toggleCompanyStatus
);

router.put(
  "/super-admin/companies/:id/subscription",
  authenticate,
  authorize("superadmin"),
  superAdminCtrl.updateSubscription
);

router.delete(
  "/super-admin/companies/:id",
  authenticate,
  authorize("superadmin"),
  superAdminCtrl.deleteCompany
);

export default router;