/**
 * controllers/taxesController.js
 * All Drizzle column refs use camelCase (schema convention).
 */

import { db } from "../db/index.js";
import { taxes, invoices } from "../db/schema/index.js";
import { eq, and, asc, sql } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /api/taxes
const getAll = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id:         taxes.id,
        name:       taxes.name,
        percentage: taxes.percentage,
        status:     taxes.status,
        createdAt:  taxes.createdAt,           // ✅ camelCase
      })
      .from(taxes)
      .where(eq(taxes.companyId, req.user.company_id)) // ✅
      .orderBy(asc(taxes.name));

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Error in getAll:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch taxes." });
  }
});

// GET /api/taxes/active
const getActive = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id:         taxes.id,
        name:       taxes.name,
        percentage: taxes.percentage,
      })
      .from(taxes)
      .where(
        and(
          eq(taxes.status,    "active"),
          eq(taxes.companyId, req.user.company_id) // ✅
        )
      )
      .orderBy(asc(taxes.name));

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Error in getActive:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch active taxes." });
  }
});

// POST /api/taxes
const create = asyncHandler(async (req, res) => {
  try {
    const { name, percentage, status = "active" } = req.body;

    if (!name || percentage == null) {
      return res.status(400).json({ success: false, message: "name and percentage are required" });
    }
    if (percentage < 0 || percentage > 100) {
      return res.status(400).json({ success: false, message: "percentage must be 0–100" });
    }

    const rows = await db
      .insert(taxes)
      .values({
        name:      name.trim(),
        percentage: parseFloat(percentage),
        status,
        companyId: req.user.company_id, // ✅
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in create:", error.message);
    res.status(500).json({ success: false, message: "Failed to create tax." });
  }
});

// PUT /api/taxes/:id
const update = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { name, percentage, status } = req.body;

    const payload = {};
    if (name       != null) payload.name       = name.trim();
    if (percentage != null) payload.percentage = parseFloat(percentage);
    if (status     != null) payload.status     = status;

    if (!Object.keys(payload).length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const rows = await db
      .update(taxes)
      .set(payload)
      .where(
        and(
          eq(taxes.id,        id),
          eq(taxes.companyId, req.user.company_id) // ✅
        )
      )
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in update:", error.message);
    res.status(500).json({ success: false, message: "Failed to update tax." });
  }
});

// PATCH /api/taxes/:id/status
const toggleStatus = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .update(taxes)
      .set({
        status: sql`CASE WHEN ${taxes.status} = 'active' THEN 'inactive' ELSE 'active' END`,
      })
      .where(
        and(
          eq(taxes.id,        req.params.id),
          eq(taxes.companyId, req.user.company_id) // ✅
        )
      )
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in toggleStatus:", error.message);
    res.status(500).json({ success: false, message: "Failed to toggle tax status." });
  }
});

// DELETE /api/taxes/:id
const remove = asyncHandler(async (req, res) => {
  try {
    const used = await db
      .select({ count: sql`COUNT(*)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.taxId,     req.params.id),    // ✅
          eq(invoices.companyId, req.user.company_id) // ✅
        )
      );

    if (parseInt(used[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete: this tax is used by existing invoices",
      });
    }

    const rows = await db
      .delete(taxes)
      .where(
        and(
          eq(taxes.id,        req.params.id),
          eq(taxes.companyId, req.user.company_id) // ✅
        )
      )
      .returning({ id: taxes.id });

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Tax not found" });
    }

    res.json({ success: true, message: "Tax deleted" });
  } catch (error) {
    console.error("❌ Error in remove:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete tax." });
  }
});

export { getAll, getActive, create, update, toggleStatus, remove };