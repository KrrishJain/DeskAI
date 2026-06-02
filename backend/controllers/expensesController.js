/**
 * controllers/expensesController.js
 */

import { db } from '../db/index.js';
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm';
import { expenses, employees } from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// GET /api/expenses
const getAll = asyncHandler(async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [eq(expenses.companyId, req.user.company_id)];
    if (status) conditions.push(eq(expenses.status, status));
    if (from)   conditions.push(gte(expenses.purchaseDate, from));
    if (to)     conditions.push(lte(expenses.purchaseDate, to));

    const whereClause = and(...conditions);

    const [countRes, rows] = await Promise.all([
      db.select({ count: count() }).from(expenses).where(whereClause),
      db.select({
          id:            expenses.id,
          item_name:     expenses.itemName,
          purchase_from: expenses.purchaseFrom,
          purchase_date: expenses.purchaseDate,
          purchased_by:  expenses.purchasedBy,
          amount:        expenses.amount,
          paid_by:       expenses.paidBy,
          status:        expenses.status,
          created_at:    expenses.createdAt,
          employee_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
          employee_code: employees.employeeId,
        })
        .from(expenses)
        .leftJoin(employees, eq(employees.id, expenses.purchasedBy))
        .where(whereClause)
        .orderBy(desc(expenses.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
    ]);

    res.json({
      success: true,
      data: rows,
      total: parseInt(countRes[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('❌ Error in getAll:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses.' });
  }
});

// GET /api/expenses/:id
const getById = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id:            expenses.id,
        item_name:     expenses.itemName,
        purchase_from: expenses.purchaseFrom,
        purchase_date: expenses.purchaseDate,
        purchased_by:  expenses.purchasedBy,
        amount:        expenses.amount,
        paid_by:       expenses.paidBy,
        status:        expenses.status,
        created_at:    expenses.createdAt,
        employee_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
        employee_code: employees.employeeId,
      })
      .from(expenses)
      .leftJoin(employees, eq(employees.id, expenses.purchasedBy))
      .where(and(eq(expenses.id, req.params.id), eq(expenses.companyId, req.user.company_id)));

    if (!rows.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in getById:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch expense.' });
  }
});

// POST /api/expenses
const create = asyncHandler(async (req, res) => {
  try {
    const { item_name, purchase_from, purchase_date, purchased_by, amount, paid_by, status = 'pending' } = req.body;

    if (!item_name || !purchase_from || !purchase_date || !purchased_by || !amount || !paid_by) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    const rows = await db
      .insert(expenses)
      .values({
        itemName:     item_name.trim(),
        purchaseFrom: purchase_from.trim(),
        purchaseDate: purchase_date,
        purchasedBy:  parseInt(purchased_by),
        amount:       parsedAmount,
        paidBy:       paid_by,
        status,
        createdBy:    req.user.id,
        companyId:    req.user.company_id,
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create expense.' });
  }
});

// PUT /api/expenses/:id
const update = asyncHandler(async (req, res) => {
  try {
    const { item_name, purchase_from, purchase_date, purchased_by, amount, paid_by, status } = req.body;

    const payload = {};
    if (item_name     !== undefined) payload.itemName     = item_name.trim();
    if (purchase_from !== undefined) payload.purchaseFrom = purchase_from.trim();
    if (purchase_date !== undefined) payload.purchaseDate = purchase_date;
    if (purchased_by  !== undefined) payload.purchasedBy  = parseInt(purchased_by);
    if (amount        !== undefined) payload.amount       = parseFloat(amount);
    if (paid_by       !== undefined) payload.paidBy       = paid_by;
    if (status        !== undefined) payload.status       = status;

    if (!Object.keys(payload).length) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const rows = await db
      .update(expenses)
      .set(payload)
      .where(and(eq(expenses.id, req.params.id), eq(expenses.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update expense.' });
  }
});

// PATCH /api/expenses/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const rows = await db
      .update(expenses)
      .set({ status })
      .where(and(eq(expenses.id, req.params.id), eq(expenses.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in updateStatus:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update expense status.' });
  }
});

// DELETE /api/expenses/:id
const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .delete(expenses)
      .where(and(eq(expenses.id, req.params.id), eq(expenses.companyId, req.user.company_id)))
      .returning({ id: expenses.id });

    if (!rows.length) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    console.error('❌ Error in remove:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete expense.' });
  }
});

export { getAll, getById, create, update, updateStatus, remove };