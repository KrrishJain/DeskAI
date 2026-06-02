import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

import * as deptCtrl from "../controllers/departmentsController.js";
import * as desigCtrl from "../controllers/designationsController.js";
import * as holCtrl from "../controllers/holidaysController.js";
import * as settingsCtrl from "../controllers/settingsController.js";

const router = Router();

/* Departments */

router.get("/departments", authenticate, deptCtrl.getAll);
router.post("/departments", authenticate, authorize("admin","hr"), deptCtrl.create);
router.put("/departments/:id", authenticate, authorize("admin","hr"), deptCtrl.update);
router.delete("/departments/:id", authenticate, authorize("admin"), deptCtrl.remove);

/* Designations */

router.get("/designations", authenticate, desigCtrl.getAll);
router.post("/designations", authenticate, authorize("admin","hr"), desigCtrl.create);
router.put("/designations/:id", authenticate, authorize("admin","hr"), desigCtrl.update);
router.delete("/designations/:id", authenticate, authorize("admin"), desigCtrl.remove);

/* Holidays */

router.get("/holidays", authenticate, holCtrl.getAll);
router.post("/holidays", authenticate, authorize("admin","hr"), holCtrl.create);
router.put("/holidays/:id", authenticate, authorize("admin","hr"), holCtrl.update);
router.delete("/holidays/:id", authenticate, authorize("admin","hr"), holCtrl.remove);

/* Settings */

router.get("/settings", authenticate, settingsCtrl.getSettings);
router.put("/settings", authenticate, authorize("admin"), settingsCtrl.updateSettings);
router.post("/settings/logo", authenticate, authorize("admin"), settingsCtrl.uploadCompanyLogo);

export default router;