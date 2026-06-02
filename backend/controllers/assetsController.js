/**
 * controllers/assetsController.js
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { db } from '../db/index.js';
import { assets, employees } from '../db/schema/index.js';
import { and, count, desc, eq, sql } from 'drizzle-orm';

const getAll = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, status, employee_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereConditions = [eq(assets.companyId, req.user.company_id)];
    if (status) whereConditions.push(eq(assets.status, status));
    if (employee_id) whereConditions.push(eq(assets.assignedToId, parseInt(employee_id)));
    const whereClause = and(...whereConditions);

    const countRes = await db
      .select({ count: count() })
      .from(assets)
      .where(whereClause);

    const rows = await db
      .select({
        id: assets.id,
        asset_name: assets.assetName,
        asset_code: assets.assetCode,
        purchase_date: assets.purchaseDate,
        purchase_from: assets.purchaseFrom,
        manufacturer: assets.manufacturer,
        model: assets.model,
        status: assets.status,
        supplier: assets.supplier,
        condition: assets.condition,
        warranty: assets.warranty,
        price: assets.price,
        assigned_to_id: assets.assignedToId,
        description: assets.description,
        company_id: assets.companyId,
        created_at: assets.createdAt,
        updated_at: assets.updatedAt,
        assigned_to_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
      })
      .from(assets)
      .leftJoin(employees, eq(assets.assignedToId, employees.id))
      .where(whereClause)
      .orderBy(desc(assets.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    return res.json({
      success: true, data: rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(countRes[0].count) },
    });
  } catch (error) {
    console.error('❌ Error fetching assets:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch assets.' });
  }
});

const create = asyncHandler(async (req, res) => {
  try {
    const { assetName, assetCode, purchaseDate, purchaseFrom, manufacturer,
      model, supplier, condition, warranty, price, assignedToId, description } = req.body;

    const rows = await db
      .insert(assets)
      .values({
        assetName,
        assetCode,
        purchaseDate,
        purchaseFrom,
        manufacturer,
        model,
        supplier,
        condition,
        warranty,
        price: parseFloat(price),
        assignedToId: assignedToId || null,
        description,
        companyId: req.user.company_id,
      })
      .returning();

    return res.status(201).json({ success: true, message: 'Asset created.', data: rows[0] });
  } catch (error) {
    console.error('❌ Error creating asset:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create asset.' });
  }
});

const update = asyncHandler(async (req, res) => {
  try {
    const { assetName, assetCode, purchaseDate, purchaseFrom, manufacturer,
      model, supplier, condition, warranty, price, assignedToId, description, status } = req.body;

    const rows = await db
      .update(assets)
      .set({
        assetName,
        assetCode,
        purchaseDate,
        purchaseFrom,
        manufacturer,
        model,
        supplier,
        condition,
        warranty,
        price: parseFloat(price),
        assignedToId: assignedToId || null,
        description,
        status,
      })
      .where(and(eq(assets.id, parseInt(req.params.id)), eq(assets.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: 'Asset not found.' });
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error updating asset:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update asset.' });
  }
});

const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .delete(assets)
      .where(and(eq(assets.id, parseInt(req.params.id)), eq(assets.companyId, req.user.company_id)))
      .returning({ id: assets.id });
    if (!rows.length) return res.status(404).json({ success: false, message: 'Asset not found.' });
    return res.json({ success: true, message: 'Asset deleted.' });
  } catch (error) {
    console.error('❌ Error deleting asset:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete asset.' });
  }
});

export { getAll, create, update, remove };