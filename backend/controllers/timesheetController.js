/**
 * controllers/timesheetController.js
 */

import { db } from "../db/index.js";
import {
  timesheet,
  employees,
  designations,
  projects
} from "../db/schema/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

/**
 * GET /api/timesheet
 */
const getAll = asyncHandler(async (req, res) => {
  try {
    const { employee_id, month } = req.query;
    const role = req.user.role;
    const userId = req.user.id;

    const conditions = [eq(timesheet.company_id, req.user.company_id)];

    if (role === "employee") {
      conditions.push(eq(employees.user_id, userId));
    } else if (employee_id) {
      conditions.push(eq(timesheet.employee_id, parseInt(employee_id)));
    }

    if (month) {
      conditions.push(sql`TO_CHAR(${timesheet.work_date}, 'YYYY-MM') = ${month}`);
    }

    const rows = await db
      .select({
        id: timesheet.id,
        employee_id: timesheet.employee_id,
        project_id: timesheet.project_id,
        work_date: timesheet.work_date,
        assigned_hours: timesheet.assigned_hours,
        hours_logged: timesheet.hours_logged,
        description: timesheet.description,
        created_at: timesheet.created_at,
        employee_name: sql`${employees.first_name} || ' ' || ${employees.last_name}`,
        designation: designations.title,
        project_name: projects.name,
        completion_pct: sql`
          CASE WHEN ${timesheet.assigned_hours} > 0
          THEN ROUND((${timesheet.hours_logged} / ${timesheet.assigned_hours}) * 100)
          ELSE 0 END
        `
      })
      .from(timesheet)
      .innerJoin(employees, eq(employees.id, timesheet.employee_id))
      .leftJoin(designations, eq(designations.id, employees.designation_id))
      .leftJoin(projects, eq(projects.id, timesheet.project_id))
      .where(and(...conditions))
      .orderBy(desc(timesheet.work_date), desc(timesheet.created_at));

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Error in getAll:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch timesheet entries." });
  }
});

/**
 * POST /api/timesheet
 */
const create = asyncHandler(async (req, res) => {
  try {
    const {
      employee_id,
      project_id,
      work_date,
      assigned_hours,
      hours_logged,
      description
    } = req.body;

    if (!employee_id || !work_date) {
      return res.status(400).json({
        success: false,
        message: "employee_id and work_date are required."
      });
    }

    const rows = await db
      .insert(timesheet)
      .values({
        employee_id: parseInt(employee_id),
        project_id: project_id ? parseInt(project_id) : null,
        work_date,
        assigned_hours: assigned_hours ?? 8,
        hours_logged: hours_logged ?? 0,
        description: description || null,
        company_id: req.user.company_id
      })
      .onConflictDoUpdate({
        target: [timesheet.employee_id, timesheet.project_id, timesheet.work_date],
        set: {
          hours_logged: sql`EXCLUDED.hours_logged`,
          assigned_hours: sql`EXCLUDED.assigned_hours`,
          description: sql`EXCLUDED.description`
        }
      })
      .returning();

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in create:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create timesheet entry." });
  }
});

/**
 * PUT /api/timesheet/:id
 */
const update = asyncHandler(async (req, res) => {
  try {
    const { project_id, work_date, assigned_hours, hours_logged, description } = req.body;
    const id = parseInt(req.params.id);

    const rows = await db
      .update(timesheet)
      .set({
        project_id: project_id ? parseInt(project_id) : null,
        work_date,
        assigned_hours: assigned_hours ?? 8,
        hours_logged: hours_logged ?? 0,
        description: description || null
      })
      .where(and(eq(timesheet.id, id), eq(timesheet.company_id, req.user.company_id)))
      .returning();

    if (!rows.length)
      return res.status(404).json({ success: false, message: "Entry not found." });

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in update:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update timesheet entry." });
  }
});

/**
 * DELETE /api/timesheet/:id
 */
const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .delete(timesheet)
      .where(
        and(eq(timesheet.id, parseInt(req.params.id)), eq(timesheet.company_id, req.user.company_id))
      )
      .returning({ id: timesheet.id });

    if (!rows.length)
      return res.status(404).json({ success: false, message: "Entry not found." });

    return res.json({ success: true, message: "Deleted." });
  } catch (error) {
    console.error("❌ Error in remove:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete timesheet entry." });
  }
});

export { getAll, create, update, remove };