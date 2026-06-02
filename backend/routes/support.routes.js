import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import * as ticketCtrl from "../controllers/ticketController.js";

const router = Router();

router.get("/tickets", authenticate, ticketCtrl.getTickets);
router.get("/tickets/:id", authenticate, ticketCtrl.getById);
router.post("/tickets", authenticate, ticketCtrl.createTicket);
router.put("/tickets/:id", authenticate, ticketCtrl.update);

router.get("/tickets/:ticketId/messages", authenticate, ticketCtrl.getMessages);
router.post("/tickets/:ticketId/messages", authenticate, ticketCtrl.addMessage);

export default router;