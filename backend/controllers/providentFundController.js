/**
 * controllers/providentFundController.js
 * Fixed: removed ...spread, fixed all camelCase refs
 */

import { db } from "../db/index.js";
import { providentFund, employees, salaryStructures } from "../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /api/provident-fund
const getAll = asyncHandler(async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (!req.user?.company_id) {
      return res.status(401).json({ success: false, message: "Invalid user context" });
    }

    const conditions = [eq(providentFund.companyId, req.user.company_id)];
    if (status) conditions.push(eq(providentFund.status, status));

    const countRes = await db
      .select({ count: sql`COUNT(*)` })
      .from(providentFund)
      .where(and(...conditions));

    const total = parseInt(countRes[0].count);

    const rows = await db
      .select({
        id:               providentFund.id,
        employeeId:       providentFund.employeeId,
        pfType:           providentFund.pfType,
        employeeShareAmt: providentFund.employeeShareAmt,
        orgShareAmt:      providentFund.orgShareAmt,
        employeeSharePct: providentFund.employeeSharePct,
        orgSharePct:      providentFund.orgSharePct,
        description:      providentFund.description,
        status:           providentFund.status,
        createdAt:        providentFund.createdAt,
        updatedAt:        providentFund.updatedAt,
        employee_name:    sql`${employees.firstName} || ' ' || ${employees.lastName}`, // ✅ camelCase
        employee_code:    employees.employeeId,                                         // ✅ camelCase
        resolved_employee_share: sql`
          CASE
            WHEN ${providentFund.pfType} = 'fixed_amount'
            THEN ${providentFund.employeeShareAmt}
            ELSE ROUND(COALESCE(${salaryStructures.basic},0) * ${providentFund.employeeSharePct} / 100,2)
          END
        `,
        resolved_org_share: sql`
          CASE
            WHEN ${providentFund.pfType} = 'fixed_amount'
            THEN ${providentFund.orgShareAmt}
            ELSE ROUND(COALESCE(${salaryStructures.basic},0) * ${providentFund.orgSharePct} / 100,2)
          END
        `,
      })
      .from(providentFund)
      .innerJoin(employees, eq(employees.id, providentFund.employeeId))
      .leftJoin(salaryStructures, eq(salaryStructures.employeeId, providentFund.employeeId)) // ✅ camelCase
      .where(and(...conditions))
      .orderBy(employees.firstName, employees.lastName)                                       // ✅ camelCase
      .limit(parseInt(limit))
      .offset(offset);

    res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("❌ Error in getAll:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch provident fund records." });
  }
});

// GET /api/provident-fund/:id
const getById = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id:               providentFund.id,
        employeeId:       providentFund.employeeId,
        pfType:           providentFund.pfType,
        employeeShareAmt: providentFund.employeeShareAmt,
        orgShareAmt:      providentFund.orgShareAmt,
        employeeSharePct: providentFund.employeeSharePct,
        orgSharePct:      providentFund.orgSharePct,
        description:      providentFund.description,
        status:           providentFund.status,
        createdAt:        providentFund.createdAt,
        employee_name:    sql`${employees.firstName} || ' ' || ${employees.lastName}`, // ✅
        employee_code:    employees.employeeId,                                         // ✅
      })
      .from(providentFund)
      .innerJoin(employees, eq(employees.id, providentFund.employeeId))
      .where(and(eq(providentFund.id, req.params.id), eq(providentFund.companyId, req.user.company_id)));

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Provident fund record not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in getById:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch provident fund record." });
  }
});

// POST /api/provident-fund
const create = asyncHandler(async (req, res) => {
  try {
    const {
      employee_id, pf_type,
      employee_share_amt = 0, org_share_amt = 0,
      employee_share_pct = 0, org_share_pct = 0,
      description, status = "pending",
    } = req.body;

    if (!employee_id || !pf_type) {
      return res.status(400).json({ success: false, message: "employee_id and pf_type are required" });
    }
    if (!["fixed_amount", "percentage_of_basic"].includes(pf_type)) {
      return res.status(400).json({ success: false, message: "pf_type must be fixed_amount or percentage_of_basic" });
    }

    const rows = await db
      .insert(providentFund)
      .values({
        employeeId:       parseInt(employee_id),
        pfType:           pf_type,
        employeeShareAmt: parseFloat(employee_share_amt),
        orgShareAmt:      parseFloat(org_share_amt),
        employeeSharePct: parseFloat(employee_share_pct),
        orgSharePct:      parseFloat(org_share_pct),
        description:      description || null,
        status,
        companyId:        req.user.company_id,
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in create:", error.message);
    res.status(500).json({ success: false, message: "Failed to create provident fund record." });
  }
});

// PUT /api/provident-fund/:id
const update = asyncHandler(async (req, res) => {
  try {
    const {
      employee_id, pf_type,
      employee_share_amt, org_share_amt,
      employee_share_pct, org_share_pct,
      description, status,
    } = req.body;

    const payload = {};
    if (employee_id        != null) payload.employeeId       = parseInt(employee_id);
    if (pf_type            != null) payload.pfType           = pf_type;
    if (employee_share_amt != null) payload.employeeShareAmt = parseFloat(employee_share_amt);
    if (org_share_amt      != null) payload.orgShareAmt      = parseFloat(org_share_amt);
    if (employee_share_pct != null) payload.employeeSharePct = parseFloat(employee_share_pct);
    if (org_share_pct      != null) payload.orgSharePct      = parseFloat(org_share_pct);
    if (description        != null) payload.description      = description;
    if (status             != null) payload.status           = status;

    if (!Object.keys(payload).length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const rows = await db
      .update(providentFund)
      .set(payload)
      .where(and(eq(providentFund.id, req.params.id), eq(providentFund.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in update:", error.message);
    res.status(500).json({ success: false, message: "Failed to update provident fund record." });
  }
});

// PATCH /api/provident-fund/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be pending or approved" });
    }

    const rows = await db
      .update(providentFund)
      .set({ status })
      .where(and(eq(providentFund.id, req.params.id), eq(providentFund.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in updateStatus:", error.message);
    res.status(500).json({ success: false, message: "Failed to update provident fund status." });
  }
});

// DELETE /api/provident-fund/:id
const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .delete(providentFund)
      .where(and(eq(providentFund.id, req.params.id), eq(providentFund.companyId, req.user.company_id)))
      .returning({ id: providentFund.id });

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, message: "Provident fund record deleted" });
  } catch (error) {
    console.error("❌ Error in remove:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete provident fund record." });
  }
});

export { getAll, getById, create, update, updateStatus, remove };