/**
 * promotionController.js
 */

import { db } from "../db/index.js";
import { promotions, employees, departments } from "../db/schema/index.js";
import { eq, and, desc, sql } from "drizzle-orm";

// ── LIST ────────────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...promotions,
        employee_name: sql`${employees.first_name} || ' ' || ${employees.last_name}`,
        emp_code: employees.employee_id,
        picture: employees.picture,
        department_name: departments.name,
      })
      .from(promotions)
      .innerJoin(employees, eq(employees.id, promotions.employee_id))
      .leftJoin(departments, eq(departments.id, promotions.department_id))
      .where(eq(promotions.company_id, req.user.company_id))
      .orderBy(desc(promotions.promotion_date));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("promotionController.getAll:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── SINGLE ──────────────────────────────────────────────────────────────────

const getOne = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...promotions,
        employee_name: sql`${employees.first_name} || ' ' || ${employees.last_name}`,
        emp_code: employees.employee_id,
        picture: employees.picture,
        department_name: departments.name,
      })
      .from(promotions)
      .innerJoin(employees, eq(employees.id, promotions.employee_id))
      .leftJoin(departments, eq(departments.id, promotions.department_id))
      .where(
        and(
          eq(promotions.id, req.params.id),
          eq(promotions.company_id, req.user.company_id)
        )
      );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("promotionController.getOne:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── CREATE — with DB Transaction ─────────────────────────────────────────────

const create = async (req, res) => {
  const {
    employee_id,
    department_id,
    promoted_from,
    promoted_to,
    promotion_date,
    auto_update_desig = true,
    remarks,
  } = req.body;

  if (!employee_id || !promoted_to || !promotion_date) {
    return res.status(400).json({
      success: false,
      message: "employee_id, promoted_to, and promotion_date are required",
    });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const empRes = await tx
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.id, employee_id),
            eq(employees.company_id, req.user.company_id)
          )
        );

      if (!empRes.length) {
        throw Object.assign(new Error("Employee not found"), { statusCode: 404 });
      }

      const fromDesignation = promoted_from || null;

      const rows = await tx
        .insert(promotions)
        .values({
          employee_id,
          department_id: department_id || null,
          promoted_from: fromDesignation,
          promoted_to,
          promotion_date,
          auto_update_desig,
          remarks: remarks || null,
          company_id: req.user.company_id,
        })
        .returning();

      return rows[0];
    });

    res.status(201).json({
      success: true,
      data: result,
      message: auto_update_desig
        ? `Promotion created. Employee designation updated to "${promoted_to}".`
        : "Promotion created. Employee designation was NOT auto-updated.",
    });
  } catch (err) {
    console.error(
      "promotionController.create (TRANSACTION ROLLED BACK):",
      err
    );

    const status = err.statusCode || 500;

    res.status(status).json({
      success: false,
      message:
        status === 404
          ? err.message
          : "Transaction failed — no changes were saved",
    });
  }
};

// ── UPDATE ──────────────────────────────────────────────────────────────────

const update = async (req, res) => {
  const { id } = req.params;
  const { department_id, promoted_from, promoted_to, promotion_date, remarks } =
    req.body;

  try {
    const rows = await db
      .update(promotions)
      .set({
        department_id: department_id ?? undefined,
        promoted_from: promoted_from ?? undefined,
        promoted_to: promoted_to ?? undefined,
        promotion_date: promotion_date ?? undefined,
        remarks: remarks ?? undefined,
      })
      .where(
        and(eq(promotions.id, id), eq(promotions.company_id, req.user.company_id))
      )
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── DELETE ──────────────────────────────────────────────────────────────────

const remove = async (req, res) => {
  try {
    await db
      .delete(promotions)
      .where(
        and(
          eq(promotions.id, req.params.id),
          eq(promotions.company_id, req.user.company_id)
        )
      );

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("promotionController.remove:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getAll, getOne, create, update, remove };