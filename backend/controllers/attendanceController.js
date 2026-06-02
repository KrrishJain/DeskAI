/**
 * controllers/attendanceController.js  — FINAL MERGED VERSION
 *
 * Combines TWO separate concerns that were split across two files:
 *
 *  1. Clock-In / Clock-Out  (original session — IP tracking, geo-fencing)
 *     Used by routes/index.js:
 *       POST /api/attendance/clock-in
 *       PUT  /api/attendance/clock-out
 *       GET  /api/attendance
 *       GET  /api/attendance/status/:employeeId
 *
 *  2. Timesheet + Punch-In/Out  (advanced modules session)
 *     Used by advancedModulesRoutes.js:
 *       GET/POST/PUT/DELETE /api/timesheet
 *       POST   /api/attendance/punch-in
 *       PUT    /api/attendance/punch-out/:id
 *       GET    /api/attendance/today/:employeeId
 *       DELETE /api/attendance/:id
 *
 * KEEP THIS ONE FILE. Delete attendanceController1.js.
 */

import { db } from '../db/index.js';
import { attendance } from '../db/schema/index.js';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/errorHandler.js';

// ─────────────────────────────────────────────────────────────────────────────
// GEO-FENCE CONFIG  (for clock-in)
// ─────────────────────────────────────────────────────────────────────────────
const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT || '0');
const OFFICE_LNG = parseFloat(process.env.OFFICE_LNG || '0');
const OFFICE_RADIUS_KM = parseFloat(process.env.OFFICE_RADIUS_KM || '0.5');

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// =============================================================================
// SECTION 1 — CLOCK-IN / CLOCK-OUT  (original session)
// Used by routes/index.js
// =============================================================================

/**
 * POST /api/attendance/clock-in
 * Body: { employeeId, lat?, lng? }
 */
const clockIn = asyncHandler(async (req, res) => {
  try {
    const { employeeId, lat, lng } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'];

    // Prevent double clock-in
    const existing = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, parseInt(employeeId)),
          eq(attendance.companyId, req.user.company_id),
          isNull(attendance.clockOut),
          sql`${attendance.clockIn}::date = CURRENT_DATE`
        )
      );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Already clocked in. Please clock out first.' });
    }

    // Geo-fence check (only if office coordinates configured and lat/lng provided)
    if (OFFICE_LAT && OFFICE_LNG && lat && lng) {
      const dist = haversineDistance(parseFloat(lat), parseFloat(lng), OFFICE_LAT, OFFICE_LNG);
      if (dist > OFFICE_RADIUS_KM) {
        return res.status(403).json({
          success: false,
          message: `You are ${dist.toFixed(2)}km from the office. Must be within ${OFFICE_RADIUS_KM}km to clock in.`,
        });
      }
    }

    const rows = await db
      .insert(attendance)
      .values({
        employeeId: parseInt(employeeId),
        clockIn: sql`now()`,
        clockInIp: ip,
        clockInLat: lat || null,
        clockInLng: lng || null,
        companyId: req.user.company_id,
      })
      .returning();
    return res.status(201).json({ success: true, message: 'Clocked in successfully.', data: rows[0] });
  } catch (error) {
    console.error('❌ Error in clockIn:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to clock in.' });
  }
});

/**
 * PUT /api/attendance/clock-out
 * Body: { employeeId, lat?, lng? }
 */
const clockOut = asyncHandler(async (req, res) => {
  try {
    const { employeeId, lat, lng } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'];

    const rows = await db
      .update(attendance)
      .set({
        clockOut: sql`now()`,
        clockOutIp: ip,
        clockOutLat: lat || null,
        clockOutLng: lng || null,
      })
      .where(
        and(
          eq(attendance.employeeId, parseInt(employeeId)),
          eq(attendance.companyId, req.user.company_id),
          isNull(attendance.clockOut),
          sql`${attendance.clockIn}::date = CURRENT_DATE`
        )
      )
      .returning();
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'No active clock-in found for today.' });
    }
    return res.json({ success: true, message: 'Clocked out successfully.', data: rows[0] });
  } catch (error) {
    console.error('❌ Error in clockOut:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to clock out.' });
  }
});

/**
 * GET /api/attendance
 * Query params: employee_id, date, page, limit
 * NOTE: advancedModulesRoutes also registers GET /api/attendance with a
 *       different version (month filter). The routes/index.js one runs first
 *       since it's mounted first — both are kept for backward compatibility.
 */
const getAttendance = asyncHandler(async (req, res) => {
  try {
    const { employee_id, date, month, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [sql`a.company_id = ${req.user.company_id}`];
    if (employee_id) conditions.push(sql`a.employee_id = ${parseInt(employee_id)}`);
    if (date) conditions.push(sql`a.clock_in::date = ${date}`);
    if (month) conditions.push(sql`TO_CHAR(a.work_date,'YYYY-MM') = ${month}`);

    const whereClause = conditions.length
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    const result = await db.execute(sql`
      SELECT a.*, e.first_name, e.last_name, e.employee_id AS emp_code,
              e.first_name || ' ' || e.last_name AS employee_name, e.designation,
              CASE WHEN a.punch_out IS NOT NULL
                THEN ROUND(EXTRACT(EPOCH FROM (a.punch_out - a.punch_in)) / 3600.0, 2)
                ELSE NULL END AS hours_worked
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       ${whereClause}
       ORDER BY COALESCE(a.clock_in, a.punch_in) DESC
       LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);
    const rows = result.rows;
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error in getAttendance:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance.' });
  }
});

/**
 * GET /api/attendance/status/:employeeId
 * Check if employee is currently clocked in.
 */
const getStatus = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id: attendance.id,
        clock_in: attendance.clockIn,
        clock_in_ip: attendance.clockInIp,
      })
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, parseInt(req.params.employeeId)),
          eq(attendance.companyId, req.user.company_id),
          isNull(attendance.clockOut),
          sql`${attendance.clockIn}::date = CURRENT_DATE`
        )
      );
    return res.json({ success: true, isClockedIn: rows.length > 0, record: rows[0] || null });
  } catch (error) {
    console.error('❌ Error in getStatus:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch status.' });
  }
});

// =============================================================================
// SECTION 2 — TIMESHEET  (advanced modules session)
// Used by advancedModulesRoutes.js
// =============================================================================

/**
 * GET /api/timesheet
 * Query: ?employee_id=  ?month=YYYY-MM
 */
const getTimesheet = asyncHandler(async (req, res) => {
  try {
    const { employee_id, month } = req.query;
    const conditions = [sql`t.company_id = ${req.user.company_id}`];
    if (employee_id) conditions.push(sql`t.employee_id = ${employee_id}`);
    if (month) conditions.push(sql`TO_CHAR(t.work_date,'YYYY-MM') = ${month}`);
    const whereClause = conditions.length
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

    const result = await db.execute(sql`
      SELECT t.*,
        e.first_name || ' ' || e.last_name AS employee_name,
        e.employee_id AS emp_code, e.designation, e.picture,
        p.name AS project_name
      FROM timesheet t
      JOIN employees e ON e.id = t.employee_id
      LEFT JOIN projects p ON p.id = t.project_id
      ${whereClause}
      ORDER BY t.work_date DESC, e.first_name
    `);
    const rows = result.rows;
    const withTotals = rows.map(r => ({
      ...r,
      hours_remaining: Math.max(0, parseFloat(r.assigned_hours) - parseFloat(r.hours_logged)),
      completion_pct: r.assigned_hours > 0
        ? Math.round((r.hours_logged / r.assigned_hours) * 100) : 0,
    }));
    return res.json({ success: true, data: withTotals });
  } catch (err) {
    console.error('❌ Error in getTimesheet:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch timesheet.' });
  }
});

/**
 * POST /api/timesheet
 * Body: { employee_id, project_id?, work_date, assigned_hours?, hours_logged?, description? }
 */
const createTimesheet = asyncHandler(async (req, res) => {
  try {
    const { employee_id, project_id, work_date, assigned_hours = 8, hours_logged = 0, description } = req.body;
    if (!employee_id || !work_date)
      return res.status(400).json({ success: false, message: 'employee_id and work_date are required' });
    
    const result = await db.execute(sql`
      INSERT INTO timesheet (employee_id, project_id, work_date, assigned_hours, hours_logged, description, company_id)
      VALUES (${employee_id}, ${project_id || null}, ${work_date}, ${assigned_hours}, ${hours_logged}, ${description || null}, ${req.user.company_id})
      ON CONFLICT (employee_id, project_id, work_date)
      DO UPDATE SET hours_logged = EXCLUDED.hours_logged, description = EXCLUDED.description
      RETURNING *
    `);
    const rows = result.rows;
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ Error in createTimesheet:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create timesheet.' });
  }
});

/**
 * PUT /api/timesheet/:id
 */
const updateTimesheet = asyncHandler(async (req, res) => {
  try {
    const { project_id, work_date, assigned_hours, hours_logged, description } = req.body;
    const rows = await db
      .update(sql`timesheet`)
      .set({
        project_id: sql`COALESCE(${project_id}, project_id)`,
        work_date: sql`COALESCE(${work_date}, work_date)`,
        assigned_hours: sql`COALESCE(${assigned_hours}, assigned_hours)`,
        hours_logged: sql`COALESCE(${hours_logged}, hours_logged)`,
        description: sql`COALESCE(${description}, description)`,
      })
      .where(sql`id = ${req.params.id} AND company_id = ${req.user.company_id}`)
      .returning();
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ Error in updateTimesheet:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update timesheet.' });
  }
});

/**
 * DELETE /api/timesheet/:id
 */
const deleteTimesheet = asyncHandler(async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM timesheet WHERE id = ${req.params.id} AND company_id = ${req.user.company_id}`);
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('❌ Error in deleteTimesheet:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete timesheet.' });
  }
});

// =============================================================================
// SECTION 3 — PUNCH-IN / PUNCH-OUT  (advanced modules — timesheet-style)
// Used by advancedModulesRoutes.js
// Different from clockIn/clockOut: uses work_date + punch_in/punch_out columns
// =============================================================================

/**
 * POST /api/attendance/punch-in
 * Body: { employee_id }
 */
const punchIn = asyncHandler(async (req, res) => {
  try {
    const { employee_id } = req.body;
    if (!employee_id)
      return res.status(400).json({ success: false, message: 'employee_id required' });
    const today = new Date().toISOString().split('T')[0];
    
    const result = await db.execute(sql`
      INSERT INTO attendance (employee_id, work_date, punch_in, status, company_id)
      VALUES (${employee_id}, ${today}, NOW(), 'present', ${req.user.company_id})
      ON CONFLICT (employee_id, work_date) DO UPDATE SET punch_in = NOW()
      RETURNING *
    `);
    const rows = result.rows;
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ Error in punchIn:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to punch in.' });
  }
});

/**
 * PUT /api/attendance/punch-out/:id
 */
const punchOut = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .update(attendance)
      .set({ punchOut: sql`now()` })
      .where(and(eq(attendance.id, parseInt(req.params.id)), eq(attendance.companyId, req.user.company_id)))
      .returning();
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ Error in punchOut:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to punch out.' });
  }
});

/**
 * GET /api/attendance/today/:employeeId
 */
const getTodayAttendance = asyncHandler(async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const rows = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.employeeId, parseInt(req.params.employeeId)),
          eq(attendance.workDate, today),
          eq(attendance.companyId, req.user.company_id)
        )
      );
    return res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('❌ Error in getTodayAttendance:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch today\'s attendance.' });
  }
});

/**
 * DELETE /api/attendance/:id
 */
const deleteAttendance = asyncHandler(async (req, res) => {
  try {
    await db
      .delete(attendance)
      .where(and(eq(attendance.id, parseInt(req.params.id)), eq(attendance.companyId, req.user.company_id)));
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('❌ Error in deleteAttendance:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete attendance.' });
  }
});

// =============================================================================
// EXPORTS  — all functions from both sessions
// =============================================================================
export {
  clockIn,
  clockOut,
  getAttendance,
  getStatus,
  getTimesheet,
  createTimesheet,
  updateTimesheet,
  deleteTimesheet,
  punchIn,
  punchOut,
  getTodayAttendance,
  deleteAttendance,
};