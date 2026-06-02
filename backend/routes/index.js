import { Router } from "express";

import authRoutes from "./auth.routes.js";
import employeesRoutes from "./employees.routes.js";
import organizationRoutes from "./organization.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import performanceRoutes from "./performance.routes.js";
import projectsRoutes from "./projects.routes.js";
import recruitmentRoutes from "./recruitment.routes.js";
import financeRoutes from "./finance.routes.js";
import supportRoutes from "./support.routes.js";
import adminRoutes from "./admin.routes.js";
import superAdminRoutes from "./superAdmin.routes.js";
import ticketRoutes from "./ticket.route.js";
const router = Router();

router.use(authRoutes);
router.use(employeesRoutes);
router.use(organizationRoutes);
router.use(attendanceRoutes);
router.use(performanceRoutes);
router.use(projectsRoutes);
router.use(recruitmentRoutes);
router.use(financeRoutes);
router.use(supportRoutes);
router.use(adminRoutes);
router.use(superAdminRoutes);
router.use(ticketRoutes);
export default router;