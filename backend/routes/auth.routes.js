import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as authCtrl from "../controllers/authController.js";

const router = Router();

router.post("/auth/login", authCtrl.login);
router.post("/auth/logout", authenticate, authCtrl.logout);
router.get("/auth/me", authenticate, authCtrl.getProfile);
router.put("/auth/change-password", authenticate, authCtrl.changePassword);

export default router;