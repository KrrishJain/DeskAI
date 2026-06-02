import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import * as jobCtrl from "../controllers/jobController.js";
import * as candidateCtrl from "../controllers/candidatesController.js";

const router = Router();

router.get("/jobs", authenticate, jobCtrl.getJobs);
router.get("/jobs/:id", authenticate, jobCtrl.getJobById);
router.post("/jobs", authenticate, authorize("admin","hr"), jobCtrl.createJob);
router.put("/jobs/:id", authenticate, authorize("admin","hr"), jobCtrl.updateJob);
router.delete("/jobs/:id", authenticate, authorize("admin","hr"), jobCtrl.deleteJob);

router.get("/jobs/:id/candidates", authenticate, candidateCtrl.getCandidatesByJob);

export default router;