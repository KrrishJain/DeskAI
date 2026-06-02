/**
 * resignationController.js
 */

import { db } from "../db/index.js";
import { resignations, employees } from "../db/schema/index.js";
import { eq, and, desc, sql } from "drizzle-orm";

const getAll = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...resignations,
        employee_name: sql`${employees.first_name} || ' ' || ${employees.last_name}`,
        emp_code: employees.employee_id,
        picture: employees.picture,
        approved_by_name: sql`ab.first_name || ' ' || ab.last_name`,
      })
      .from(resignations)
      .innerJoin(employees, eq(employees.id, resignations.employee_id))
      .leftJoin(sql`employees ab`, sql`ab.id = ${resignations.approved_by}`)
      .where(eq(resignations.company_id, req.user.company_id))
      .orderBy(desc(resignations.created_at));

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getOne = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...resignations,
        employee_name: sql`${employees.first_name} || ' ' || ${employees.last_name}`,
        emp_code: employees.employee_id,
      })
      .from(resignations)
      .innerJoin(employees, eq(employees.id, resignations.employee_id))
      .where(
        and(
          eq(resignations.id, req.params.id),
          eq(resignations.company_id, req.user.company_id)
        )
      );

    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("resignationController.getOne:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const create = async (req, res) => {
  const { employee_id, notice_date, resignation_date, reason } = req.body;

  if (!employee_id || !notice_date || !resignation_date) {
    return res
      .status(400)
      .json({
        success: false,
        message: "employee_id, notice_date, resignation_date required",
      });
  }

  if (new Date(resignation_date) <= new Date(notice_date)) {
    return res
      .status(400)
      .json({
        success: false,
        message: "resignation_date must be after notice_date",
      });
  }

  try {
    const rows = await db
      .insert(resignations)
      .values({
        employee_id,
        notice_date,
        resignation_date,
        reason: reason || null,
        company_id: req.user.company_id,
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const update = async (req, res) => {
  const { notice_date, resignation_date, reason } = req.body;

  try {
    const rows = await db
      .update(resignations)
      .set({
        notice_date: notice_date ?? undefined,
        resignation_date: resignation_date ?? undefined,
        reason: reason ?? undefined,
      })
      .where(
        and(
          eq(resignations.id, req.params.id),
          eq(resignations.company_id, req.user.company_id)
        )
      )
      .returning();

    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const approve = async (req, res) => {
  try {
    const rows = await db
      .update(resignations)
      .set({
        status: "approved",
        approved_by: req.user?.id || null,
      })
      .where(
        and(
          eq(resignations.id, req.params.id),
          eq(resignations.company_id, req.user.company_id)
        )
      )
      .returning();

    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("resignationController.approve:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const reject = async (req, res) => {
  try {
    const rows = await db
      .update(resignations)
      .set({
        status: "rejected",
        approved_by: req.user?.id || null,
      })
      .where(
        and(
          eq(resignations.id, req.params.id),
          eq(resignations.company_id, req.user.company_id)
        )
      )
      .returning();

    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("resignationController.reject:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const remove = async (req, res) => {
  try {
    await db
      .delete(resignations)
      .where(
        and(
          eq(resignations.id, req.params.id),
          eq(resignations.company_id, req.user.company_id)
        )
      );

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("resignationController.remove:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export { getAll, getOne, create, update, approve, reject, remove };