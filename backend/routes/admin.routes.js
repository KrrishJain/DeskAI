import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import * as adminCtrl from "../controllers/adminController.js";

const router = Router();

router.get("/admin/users", authenticate, authorize("admin"), adminCtrl.getUsers);
router.post("/admin/users", authenticate, authorize("admin"), adminCtrl.createUser);
router.put("/admin/users/:id", authenticate, authorize("admin"), adminCtrl.updateUser);
router.delete("/admin/users/:id", authenticate, authorize("admin"), adminCtrl.deleteUser);

export default router;