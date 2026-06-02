/**
 * controllers/designationsController.js
 * Full CRUD for designations.
 * Each designation MUST belong to a department (FK: department_id).
 * The Add Designation modal populates its department dropdown from GET /api/departments.
 */

import { db } from '../db/index.js';
import { eq, and, asc, count } from 'drizzle-orm';
import { designations, departments, employees } from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /api/designations  (optionally filtered by ?department_id=X)
const getAll = asyncHandler(async (req, res) => {
  try {
    const { department_id } = req.query;

    const conditions = [eq(designations.companyId, req.user.company_id)];
    if (department_id) {
      conditions.push(eq(designations.departmentId, parseInt(department_id)));
    }

    const rows = await db
      .select({
        id: designations.id,
        title: designations.title,
        department_id: designations.departmentId,
        created_at: designations.createdAt,
        department: departments.name,
        employee_count: count(employees.id),
      })
      .from(designations)
      .leftJoin(departments, eq(departments.id, designations.departmentId))
      .leftJoin(
        employees,
        and(eq(employees.designationId, designations.id), eq(employees.isActive, true))
      )
      .where(and(...conditions))
      .groupBy(designations.id, departments.name)
      .orderBy(asc(departments.name), asc(designations.title));

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error in getAll:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch designations.' });
  }
});

// POST /api/designations
const create = asyncHandler(async (req, res) => {
  try {
    const { title, department_id } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Designation title is required.' });
    }
    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    // Validate department exists
    const deptCheck = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, parseInt(department_id)), eq(departments.companyId, req.user.company_id)));

    if (!deptCheck.length) {
      return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }

    const inserted = await db
      .insert(designations)
      .values({
        title: title.trim(),
        departmentId: parseInt(department_id),
        companyId: req.user.company_id,
      })
      .returning({ id: designations.id, title: designations.title, departmentId: designations.departmentId });

    // Return with department name joined
    const full = await db
      .select({ ...designations, department: departments.name })
      .from(designations)
      .innerJoin(departments, eq(departments.id, designations.departmentId))
      .where(eq(designations.id, inserted[0].id));

    res.status(201).json({ success: true, data: full[0] });
  } catch (error) {
    console.error('❌ Error in create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create designation.' });
  }
});

// PUT /api/designations/:id
const update = asyncHandler(async (req, res) => {
  try {
    const { title, department_id } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Designation title is required.' });
    }
    if (!department_id) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    // Validate department exists for this company
    const deptCheck = await db
      .select({ id: departments.id })
      .from(departments)
      .where(and(eq(departments.id, parseInt(department_id)), eq(departments.companyId, req.user.company_id)));

    if (!deptCheck.length) {
      return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }

    const updated = await db
      .update(designations)
      .set({ title: title.trim(), departmentId: parseInt(department_id) })
      .where(and(eq(designations.id, parseInt(req.params.id)), eq(designations.companyId, req.user.company_id)))
      .returning({ id: designations.id, title: designations.title, departmentId: designations.departmentId });

    if (!updated.length) {
      return res.status(404).json({ success: false, message: 'Designation not found.' });
    }

    // Return with department name joined
    const full = await db
      .select({ ...designations, department: departments.name })
      .from(designations)
      .innerJoin(departments, eq(departments.id, designations.departmentId))
      .where(eq(designations.id, updated[0].id));

    res.json({ success: true, data: full[0] });
  } catch (error) {
    console.error('❌ Error in update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update designation.' });
  }
});

// DELETE /api/designations/:id
const remove = asyncHandler(async (req, res) => {
  try {
    // Guard: cannot delete if employees hold this designation
    const empCheck = await db
      .select({ count: count() })
      .from(employees)
      .where(
        and(
          eq(employees.designationId, parseInt(req.params.id)),
          eq(employees.companyId, req.user.company_id),
          eq(employees.isActive, true)
        )
      );

    if (parseInt(empCheck[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete: active employees hold this designation.',
      });
    }

    const rows = await db
      .delete(designations)
      .where(and(eq(designations.id, parseInt(req.params.id)), eq(designations.companyId, req.user.company_id)))
      .returning({ id: designations.id, title: designations.title });

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Designation not found.' });
    }

    res.json({ success: true, message: `Designation "${rows[0].title}" deleted.` });
  } catch (error) {
    console.error('❌ Error in remove:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete designation.' });
  }
});

export { getAll, create, update, remove };