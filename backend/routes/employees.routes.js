import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

import * as empCtrl from "../controllers/employeesController.js";
import * as leavesCtrl from "../controllers/leavesController.js";
import * as assetsCtrl from "../controllers/assetsController.js";
import * as documentsCtrl from "../controllers/documentsController.js";
import * as userCtrl from "../controllers/userController.js";

const router = Router();

/* Employees */
router.get("/dashboard/employee", authenticate, empCtrl.getStats);
router.get("/employees/stats/overview", authenticate, empCtrl.getStats);
router.get("/employees", authenticate, empCtrl.getAll);
router.get("/employees/:id", authenticate, empCtrl.getById);
router.post("/employees", authenticate, authorize("admin","hr"), empCtrl.create);
router.put("/employees/:id", authenticate, authorize("admin","hr"), empCtrl.update);
router.delete("/employees/:id", authenticate, authorize("admin"), empCtrl.remove);

/* Leaves */

router.get("/leaves", authenticate, leavesCtrl.getAll);
router.post("/leaves", authenticate, leavesCtrl.create);
router.put("/leaves/:id/status", authenticate, authorize("admin","hr"), leavesCtrl.updateStatus);
router.delete("/leaves/:id", authenticate, authorize("admin","hr"), leavesCtrl.remove);

/* Assets */

    router.get("/assets", authenticate, assetsCtrl.getAll);
    router.post("/assets", authenticate, authorize("admin","hr"), assetsCtrl.create);
    router.put("/assets/:id", authenticate, authorize("admin","hr"), assetsCtrl.update);
    router.delete("/assets/:id", authenticate, authorize("admin"), assetsCtrl.remove);

/* Documents */

router.get("/documents", authenticate, documentsCtrl.getAll);
router.post("/documents", authenticate, authorize("admin","hr"), documentsCtrl.create);
router.put("/documents/:id", authenticate, authorize("admin","hr"), documentsCtrl.update);
router.delete("/documents/:id", authenticate, authorize("admin"), documentsCtrl.remove);

/* User Profile */

router.get("/user/profile", authenticate, userCtrl.getMyProfile);
router.put("/user/profile", authenticate, userCtrl.updateMyProfile);
router.post("/user/avatar", authenticate, userCtrl.uploadAvatar);

export default router;