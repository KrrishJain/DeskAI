/**
 * controllers/departmentsController.js
 * Full CRUD for departments.
 * departments.title in PHP = departments.name in our schema.
 */

import { db } from '../db/index.js';
import { eq, and, count } from 'drizzle-orm';
import { departments, designations, employees } from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /api/departments
const getAll = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id: departments.id,
        name: departments.name,
        created_at: departments.createdAt,
        designation_count: count(designations.id).as('designation_count'),
        employee_count: count(employees.id).as('employee_count'),
      })
      .from(departments)
      .leftJoin(designations, eq(designations.departmentId, departments.id))
      .leftJoin(
        employees,
        and(eq(employees.departmentId, departments.id), eq(employees.isActive, true))
      )
      .where(eq(departments.companyId, req.user.company_id))
      .groupBy(departments.id)
      .orderBy(departments.name);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error in getAll:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
});

// POST /api/departments
const create = asyncHandler(async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const rows = await db
      .insert(departments)
      .values({ name: name.trim(), companyId: req.user.company_id })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
});

// PUT /api/departments/:id
const update = asyncHandler(async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const rows = await db
      .update(departments)
      .set({ name: name.trim() })
      .where(and(eq(departments.id, parseInt(req.params.id)), eq(departments.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update department.' });
  }
});

// DELETE /api/departments/:id
const remove = asyncHandler(async (req, res) => {
  try {
    // Prevent deletion if employees are assigned
    const empCheck = await db
      .select({ count: count() })
      .from(employees)
      .where(
        and(
          eq(employees.departmentId, parseInt(req.params.id)),
          eq(employees.companyId, req.user.company_id),
          eq(employees.isActive, true)
        )
      );

    if (parseInt(empCheck[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete: active employees are assigned to this department.',
      });
    }

    const rows = await db
      .delete(departments)
      .where(and(eq(departments.id, parseInt(req.params.id)), eq(departments.companyId, req.user.company_id)))
      .returning({ id: departments.id, name: departments.name });

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    res.json({ success: true, message: `Department "${rows[0].name}" deleted.` });
  } catch (error) {
    console.error('❌ Error in remove:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete department.' });
  }
});

export { getAll, create, update, remove };