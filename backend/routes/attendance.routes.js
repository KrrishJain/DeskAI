import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";

import * as attendanceCtrl from "../controllers/attendanceController.js";
import * as overtimeCtrl from "../controllers/overtimeController.js";
import * as timesheetCtrl from "../controllers/timesheetController.js";

const router = Router();

/* Attendance */

router.get("/attendance", authenticate, attendanceCtrl.getAttendance);
router.post("/attendance/punch-in", authenticate, attendanceCtrl.punchIn);
router.put("/attendance/punch-out/:id", authenticate, attendanceCtrl.punchOut);
router.get("/attendance/today/:employeeId", authenticate, attendanceCtrl.getTodayAttendance);
router.delete("/attendance/:id", authenticate, attendanceCtrl.deleteAttendance);

/* Overtime */

router.get("/overtime", authenticate, overtimeCtrl.getAll);
router.post("/overtime", authenticate, authorize("admin","hr"), overtimeCtrl.create);
router.put("/overtime/:id", authenticate, authorize("admin","hr"), overtimeCtrl.update);
router.delete("/overtime/:id", authenticate, authorize("admin","hr"), overtimeCtrl.remove);

/* Timesheet */

router.get("/timesheet", authenticate, timesheetCtrl.getAll);
router.post("/timesheet", authenticate, timesheetCtrl.create);
router.put("/timesheet/:id", authenticate, timesheetCtrl.update);
router.delete("/timesheet/:id", authenticate, timesheetCtrl.remove);

export default router;