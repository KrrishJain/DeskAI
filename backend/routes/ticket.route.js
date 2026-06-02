import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

import {
  getCompanyEmployees,
  getTickets,
  getById,
  createTicket,
  update,
  updateTicketStatus,
  remove,
  getMessages,
  addMessage
} from "../controllers/ticketController.js";

const router = Router();

/* ───────── EMPLOYEE LIST ───────── */

router.get(
  "/tickets/employees/list",
  authenticate,
  authorize("admin", "hr", "employee"),
  getCompanyEmployees
);

/* ───────── TICKETS ───────── */

router.get("/tickets", authenticate, getTickets);

router.get("/tickets/:id", authenticate, getById);

router.post(
  "/tickets",
  authenticate,
  authorize("admin", "hr", "employee"),
  createTicket
);

router.put(
  "/tickets/:id",
  authenticate,
  authorize("admin", "hr", "employee"),
  update
);

router.put(
  "/tickets/:id/status",
  authenticate,
  authorize("admin", "hr", "employee"),
  updateTicketStatus
);

router.delete(
  "/tickets/:id",
  authenticate,
  authorize("admin", "hr", "employee"),
  remove
);

/* ───────── MESSAGES ───────── */

router.get(
  "/tickets/:ticketId/messages",
  authenticate,
  authorize("admin", "hr", "employee"),
  getMessages
);

router.post(
  "/tickets/:ticketId/messages",
  authenticate,
  authorize("admin", "hr", "employee"),
  addMessage
);

export default router;