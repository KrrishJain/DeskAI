import { Router } from "express";
import { authenticate } from "../middleware/auth.js";

import * as goalsCtrl from "../controllers/goalsController.js";
import * as trainingCtrl from "../controllers/trainingController.js";
import * as promotionCtrl from "../controllers/promotionController.js";
import * as resignationCtrl from "../controllers/resignationController.js";

const router = Router();

/* Goals */

router.get("/goals", authenticate, goalsCtrl.getAllGoals);
router.post("/goals", authenticate, goalsCtrl.createGoal);
router.get("/goals/:id", authenticate, goalsCtrl.getGoal);
router.put("/goals/:id", authenticate, goalsCtrl.updateGoal);
router.delete("/goals/:id", authenticate, goalsCtrl.deleteGoal);

/* Goal Types */

router.get("/goal-types", authenticate, goalsCtrl.getAllGoalTypes);
router.post("/goal-types", authenticate, goalsCtrl.createGoalType);
router.put("/goal-types/:id", authenticate, goalsCtrl.updateGoalType);
router.delete("/goal-types/:id", authenticate, goalsCtrl.deleteGoalType);

/* Training */

router.get("/training", authenticate, trainingCtrl.getAllTrainings);
router.post("/training", authenticate, trainingCtrl.createTraining);
router.get("/training/:id", authenticate, trainingCtrl.getTraining);
router.put("/training/:id", authenticate, trainingCtrl.updateTraining);
router.delete("/training/:id", authenticate, trainingCtrl.deleteTraining);
router.get("/training-types", authenticate, trainingCtrl.getAllTrainingTypes);
router.post("/training-types", authenticate, trainingCtrl.createTrainingType);
router.put("/training-types/:id", authenticate, trainingCtrl.updateTrainingType);
router.delete("/training-types/:id", authenticate, trainingCtrl.deleteTrainingType);

router.get("/trainers", authenticate, trainingCtrl.getAllTrainers);
router.post("/trainers", authenticate, trainingCtrl.createTrainer);
router.put("/trainers/:id", authenticate, trainingCtrl.updateTrainer);
router.delete("/trainers/:id", authenticate, trainingCtrl.deleteTrainer);

/* Promotions */

router.get("/promotions", authenticate, promotionCtrl.getAll);
router.get("/promotions/:id", authenticate, promotionCtrl.getOne);
router.post("/promotions", authenticate, promotionCtrl.create);
router.put("/promotions/:id", authenticate, promotionCtrl.update);
router.delete("/promotions/:id", authenticate, promotionCtrl.remove);

/* Resignations */

router.get("/resignations", authenticate, resignationCtrl.getAll);
router.post("/resignations", authenticate, resignationCtrl.create);
router.put("/resignations/:id", authenticate, resignationCtrl.update);
router.delete("/resignations/:id", authenticate, resignationCtrl.remove);

export default router;