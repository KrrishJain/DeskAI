import { Router } from "express";
import { authenticate } from "../middleware/auth.js";

import * as clientsCtrl from "../controllers/clientsController.js";
import * as projectsCtrl from "../controllers/projectsController.js";

const router = Router();

/* Clients */

router.get("/clients", authenticate, clientsCtrl.getAll);
router.get("/clients/:id", authenticate, clientsCtrl.getOne);
router.post("/clients", authenticate, clientsCtrl.create);
router.put("/clients/:id", authenticate, clientsCtrl.update);
router.delete("/clients/:id", authenticate, clientsCtrl.remove);

/* Projects */

router.get("/projects", authenticate, projectsCtrl.getAll);
router.get("/projects/:id", authenticate, projectsCtrl.getOne);
router.post("/projects", authenticate, projectsCtrl.create);
router.put("/projects/:id", authenticate, projectsCtrl.update);
router.delete("/projects/:id", authenticate, projectsCtrl.remove);

/* Tasks */

router.get("/projects/:id/tasks", authenticate, projectsCtrl.getTasks);
router.post("/projects/:id/tasks", authenticate, projectsCtrl.createTask);
router.put("/projects/:projectId/tasks/:taskId", authenticate, projectsCtrl.updateTask);
router.delete("/projects/:projectId/tasks/:taskId", authenticate, projectsCtrl.deleteTask);

export default router;