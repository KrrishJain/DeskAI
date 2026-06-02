/**
 * controllers/leavesController.js
 */

import { db } from '../db/index.js';
import { eq, and, desc, count } from 'drizzle-orm';
import { leaves, employees, departments } from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const getAll = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, employee_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [eq(leaves.companyId, req.user.company_id)];
    if (status)      conditions.push(eq(leaves.status, status));
    if (employee_id) conditions.push(eq(leaves.employeeId, parseInt(employee_id)));

    const whereClause = and(...conditions);

    const [countRes, rows] = await Promise.all([
      db.select({ count: count() }).from(leaves).where(whereClause),
      db
        .select({
          ...leaves,
          first_name: employees.firstName,
          last_name: employees.lastName,
          employee_id: employees.employeeId,
          picture: employees.picture,
          department: departments.name,
        })
        .from(leaves)
        .innerJoin(employees, eq(employees.id, leaves.employeeId))
        .leftJoin(departments, eq(departments.id, employees.departmentId))
        .where(whereClause)
        .orderBy(desc(leaves.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
    ]);

    const total = parseInt(countRes[0].count);
    return res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('❌ Error in getAll:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch leaves.' });
  }
});

const create = asyncHandler(async (req, res) => {
  try {
    const { employeeId, startingAt, endingOn, days, reason } = req.body;
    if (!employeeId || !startingAt || !endingOn || !days || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const rows = await db
      .insert(leaves)
      .values({
        employeeId: parseInt(employeeId),
        startingAt,
        endingOn,
        days: parseInt(days),
        reason,
        companyId: req.user.company_id,
      })
      .returning();

    return res.status(201).json({ success: true, message: 'Leave request submitted.', data: rows[0] });
  } catch (error) {
    console.error('❌ Error in create:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create leave request.' });
  }
});

const updateStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const rows = await db
      .update(leaves)
      .set({ status, reviewedBy: req.user.id })
      .where(and(eq(leaves.id, parseInt(req.params.id)), eq(leaves.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found.' });
    return res.json({ success: true, message: `Leave ${status}.`, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in updateStatus:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update leave status.' });
  }
});

const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .delete(leaves)
      .where(and(eq(leaves.id, parseInt(req.params.id)), eq(leaves.companyId, req.user.company_id)))
      .returning({ id: leaves.id });

    if (!rows.length) return res.status(404).json({ success: false, message: 'Leave not found.' });
    return res.json({ success: true, message: 'Leave deleted.' });
  } catch (error) {
    console.error('❌ Error in remove:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete leave.' });
  }
});

export { getAll, create, updateStatus, remove };