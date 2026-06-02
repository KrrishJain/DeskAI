/**
 * controllers/overtimeController.js
 * Full CRUD for overtime records.
 * PHP fields mapped: Employee → employee_id (FK), OverTime_Date → overtime_date,
 * Hours → hours, Type → type, Description → description
 */

import { db } from "../db/index.js";
import { overtime, employees, departments } from "../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /api/overtime  – all records with employee name joined + monthly stats
const getAll = asyncHandler(async (req, res) => {
  try {
    const { employee_id, month, year } = req.query;

    const conditions = [];

    if (req.user?.company_id) {
      conditions.push(eq(overtime.companyId, req.user.company_id));
    }

    if (employee_id) {
      conditions.push(eq(overtime.employeeId, parseInt(employee_id)));
    }

    if (year) {
      conditions.push(
        sql`EXTRACT(YEAR FROM ${overtime.overtimeDate}) = ${parseInt(year)}`
      );
    }

    if (month) {
      conditions.push(
        sql`EXTRACT(MONTH FROM ${overtime.overtimeDate}) = ${parseInt(month)}`
      );
    }

    const rows = await db
      .select({
        id: overtime.id,
        overtime_date: overtime.overtimeDate,
        hours: overtime.hours,
        type: overtime.type,
        description: overtime.description,
        created_at: overtime.createdAt,
        employee_id: overtime.employeeId,

        first_name: employees.firstName,
        last_name: employees.lastName,
        emp_code: employees.employeeId,
        picture: employees.picture,

        department: departments.name,
      })
      .from(overtime)
      .innerJoin(employees, eq(overtime.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${overtime.overtimeDate} DESC`);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const stats = await db
      .select({
        overtime_employees: sql`COUNT(DISTINCT ${overtime.employeeId})`,
        overtime_hours: sql`COALESCE(SUM(${overtime.hours}),0)`,
      })
      .from(overtime)
      .where(
        and(
          eq(overtime.companyId, req.user.company_id),
          sql`EXTRACT(YEAR FROM ${overtime.overtimeDate}) = ${currentYear}`,
          sql`EXTRACT(MONTH FROM ${overtime.overtimeDate}) = ${currentMonth}`
        )
      );

    const stat = stats[0] || {};

    res.json({
      success: true,
      data: rows,
      stats: {
        overtime_employees: parseInt(stat.overtime_employees || 0),
        overtime_hours: parseFloat(stat.overtime_hours || 0),
      },
    });
  } catch (error) {
    console.error("❌ Error in getAll:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch overtime records.",
    });
  }
});

const create = asyncHandler(async (req, res) => {
  try {
    const { employee_id, overtime_date, hours, type, description } = req.body;

    if (!employee_id)
      return res.status(400).json({ success: false, message: "Employee is required." });

    if (!overtime_date)
      return res.status(400).json({ success: false, message: "Overtime date is required." });

    if (!hours)
      return res.status(400).json({ success: false, message: "Hours is required." });

    if (!type?.trim())
      return res.status(400).json({ success: false, message: "Overtime type is required." });

    const rows = await db
      .insert(overtime)
      .values({
        employeeId: parseInt(employee_id),        // ✅
        overtimeDate: overtime_date,              // ✅
        hours: parseFloat(hours),
        type: type.trim(),
        description: description || null,
        companyId: req.user.company_id,           // ✅
      })
      .returning();

    const full = await db
      .select({
        id: overtime.id,
        employee_id: overtime.employeeId,         // ✅
        overtime_date: overtime.overtimeDate,     // ✅
        hours: overtime.hours,
        type: overtime.type,
        description: overtime.description,
        created_at: overtime.createdAt,           // ✅

        first_name: employees.firstName,          // ✅
        last_name: employees.lastName,            // ✅
        emp_code: employees.employeeId,           // ✅
        department: departments.name,
      })
      .from(overtime)
      .innerJoin(employees, eq(overtime.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(overtime.id, rows[0].id),
          eq(overtime.companyId, req.user.company_id)
        )
      );

    res.status(201).json({ success: true, data: full[0] });

  } catch (error) {
    console.error("❌ Error in create:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create overtime record.",
    });
  }
});

// PUT /api/overtime/:id
const update = asyncHandler(async (req, res) => {
  try {
    const { employee_id, overtime_date, hours, type, description } = req.body;

    if (!employee_id)
      return res.status(400).json({ success: false, message: "Employee is required." });

    if (!overtime_date)
      return res.status(400).json({ success: false, message: "Overtime date is required." });

    if (!hours)
      return res.status(400).json({ success: false, message: "Hours is required." });

    if (!type?.trim())
      return res.status(400).json({ success: false, message: "Overtime type is required." });

    const rows = await db
      .update(overtime)
      .set({
        employeeId: parseInt(employee_id),     // ✅
        overtimeDate: overtime_date,           // ✅
        hours: parseFloat(hours),
        type: type.trim(),
        description: description || null,
      })
      .where(
        and(
          eq(overtime.id, parseInt(req.params.id)),
          eq(overtime.companyId, req.user.company_id) // ✅
        )
      )
      .returning();

    if (!rows.length)
      return res.status(404).json({
        success: false,
        message: "Overtime record not found.",
      });

    const full = await db
      .select({
        id: overtime.id,
        employee_id: overtime.employeeId,         // ✅
        overtime_date: overtime.overtimeDate,     // ✅
        hours: overtime.hours,
        type: overtime.type,
        description: overtime.description,
        created_at: overtime.createdAt,           // ✅

        first_name: employees.firstName,          // ✅
        last_name: employees.lastName,            // ✅
        emp_code: employees.employeeId,           // ✅
        department: departments.name,
      })
      .from(overtime)
      .innerJoin(employees, eq(overtime.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(
        and(
          eq(overtime.id, rows[0].id),
          eq(overtime.companyId, req.user.company_id) // ✅
        )
      );

    res.json({ success: true, data: full[0] });

  } catch (error) {
    console.error("❌ Error in update:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update overtime record.",
    });
  }
});

// DELETE /api/overtime/:id
const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .delete(overtime)
      .where(
        and(
          eq(overtime.id, parseInt(req.params.id)),
          eq(overtime.companyId, req.user.company_id) // ✅ fixed
        )
      )
      .returning({ id: overtime.id });

    if (!rows.length)
      return res.status(404).json({
        success: false,
        message: "Overtime record not found.",
      });

    res.json({
      success: true,
      message: "Overtime record deleted.",
    });

  } catch (error) {
    console.error("❌ Error in remove:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete overtime record.",
    });
  }
});
export { getAll, create, update, remove };
