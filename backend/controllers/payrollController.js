/**
 * payrollController.js
 *
 * ALL schemas use camelCase JS property names (Drizzle maps them to snake_case SQL):
 *   salaries       → employeeId, salaryMonth, companyId, othersEarn, leaveDeduction,
 *                    profTax, labourWelfare, othersDed, payslipNo, paidOn, createdAt
 *   salarySettings → settingKey, companyId, updatedAt
 *   payrollAdditions / payrollDeductions → companyId, unitAmount, unitCalc, createdAt
 */

import { db } from "../db/index.js";
import {
  salaries,
  employees,
  payrollAdditions,
  payrollDeductions,
  salarySettings,
} from "../db/schema/index.js";
import { eq, and, desc, sql } from "drizzle-orm";

// ── helpers ────────────────────────────────────────────────────────────────

/** Auto-generate payslip number: PAY-000001 */
const generatePayslipNo = async (tx) => {
  const res = await tx.select({ cnt: sql`COUNT(*)` }).from(salaries);
  const next = parseInt(res[0].cnt, 10) + 1;
  return "PAY-" + String(next).padStart(6, "0");
};



// ── SALARY LIST ────────────────────────────────────────────────────────────

const getAll = async (req, res) => {
  try {
    const rows = await db
      .select({
        id:             salaries.id,
        employeeId:     salaries.employeeId,
        salaryMonth:    salaries.salaryMonth,
        companyId:      salaries.companyId,
        basic:          salaries.basic,
        da:             salaries.da,
        hra:            salaries.hra,
        conveyance:     salaries.conveyance,
        allowance:      salaries.allowance,
        medical:        salaries.medical,
        othersEarn:     salaries.othersEarn,
        tds:            salaries.tds,
        esi:            salaries.esi,
        pf:             salaries.pf,
        leaveDeduction: salaries.leaveDeduction,
        profTax:        salaries.profTax,
        labourWelfare:  salaries.labourWelfare,
        othersDed:      salaries.othersDed,
        payslipNo:      salaries.payslipNo,
        status:         salaries.status,
        paidOn:         salaries.paidOn,
        notes:          salaries.notes,
        createdAt:      salaries.createdAt,
        employee_name:  sql`employees.first_name || ' ' || employees.last_name`,
        emp_code:       employees.employeeId,
        picture:        employees.picture,
      })
      .from(salaries)
      .innerJoin(employees, eq(employees.id, salaries.employeeId))
      .where(eq(salaries.companyId, req.user.company_id))
      .orderBy(desc(salaries.salaryMonth), employees.firstName);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("payrollController.getAll:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── SINGLE SALARY / PAYSLIP DATA ──────────────────────────────────────────

const getOne = async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db
      .select({
        id:             salaries.id,
        employeeId:     salaries.employeeId,
        salaryMonth:    salaries.salaryMonth,
        companyId:      salaries.companyId,
        basic:          salaries.basic,
        da:             salaries.da,
        hra:            salaries.hra,
        conveyance:     salaries.conveyance,
        allowance:      salaries.allowance,
        medical:        salaries.medical,
        othersEarn:     salaries.othersEarn,
        tds:            salaries.tds,
        esi:            salaries.esi,
        pf:             salaries.pf,
        leaveDeduction: salaries.leaveDeduction,
        profTax:        salaries.profTax,
        labourWelfare:  salaries.labourWelfare,
        othersDed:      salaries.othersDed,
        payslipNo:      salaries.payslipNo,
        status:         salaries.status,
        paidOn:         salaries.paidOn,
        notes:          salaries.notes,
        createdAt:      salaries.createdAt,
        employee_name:  sql`employees.first_name || ' ' || employees.last_name`,
        emp_code:       employees.employeeId,
        picture:        employees.picture,
        joining_date:   employees.joiningDate,
        designation_id: employees.designationId,
        bank_name:      employees.bankName,
        account_number: employees.accountNumber,
        ifsc_code:      employees.ifscCode,
        branch_name:    employees.branchName,
      })
      .from(salaries)
      .innerJoin(employees, eq(employees.id, salaries.employeeId))
      .where(and(eq(salaries.id, id), eq(salaries.companyId, req.user.company_id)));

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Salary record not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("payrollController.getOne:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── CREATE SALARY ─────────────────────────────────────────────────────────

const create = async (req, res) => {
  const {
    employee_id, salary_month,
    basic = 0, da = 0, hra = 0, conveyance = 0, allowance = 0, medical = 0, others_earn = 0,
    tds = 0, esi = 0, pf = 0, leave_deduction = 0, prof_tax = 0, labour_welfare = 0, others_ded = 0,
    notes,
  } = req.body;

  if (!employee_id || !salary_month) {
    return res.status(400).json({ success: false, message: "employee_id and salary_month are required" });
  }

  const salaryMonthDate = salary_month.length === 7 ? `${salary_month}-01` : salary_month;

  try {
    const result = await db.transaction(async (tx) => {
      const payslipNo = await generatePayslipNo(tx);

      const rows = await tx
        .insert(salaries)
        .values({
          employeeId:     employee_id,
          salaryMonth:    salaryMonthDate,
          payslipNo,
          basic,
          da,
          hra,
          conveyance,
          allowance,
          medical,
          othersEarn:     others_earn,
          tds,
          esi,
          pf,
          leaveDeduction: leave_deduction,
          profTax:        prof_tax,
          labourWelfare:  labour_welfare,
          othersDed:      others_ded,
          notes:          notes || null,
          companyId:      req.user.company_id,
        })
        .returning();

      return rows[0];
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ success: false, message: "Salary for this employee & month already exists" });
    }
    console.error("payrollController.create:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── UPDATE SALARY ─────────────────────────────────────────────────────────

const update = async (req, res) => {
  const { id } = req.params;

  // Map incoming snake_case body keys → camelCase schema keys
  const fieldMap = {
    basic:           "basic",
    da:              "da",
    hra:             "hra",
    conveyance:      "conveyance",
    allowance:       "allowance",
    medical:         "medical",
    others_earn:     "othersEarn",
    tds:             "tds",
    esi:             "esi",
    pf:              "pf",
    leave_deduction: "leaveDeduction",
    prof_tax:        "profTax",
    labour_welfare:  "labourWelfare",
    others_ded:      "othersDed",
    notes:           "notes",
  };

  const updateData = {};
  for (const [bodyKey, schemaKey] of Object.entries(fieldMap)) {
    if (req.body[bodyKey] !== undefined) updateData[schemaKey] = req.body[bodyKey];
  }

  if (!Object.keys(updateData).length) {
    return res.status(400).json({ success: false, message: "No fields to update" });
  }

  try {
    const rows = await db
      .update(salaries)
      .set(updateData)
      .where(and(eq(salaries.id, id), eq(salaries.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("payrollController.update:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── MARK PAID ─────────────────────────────────────────────────────────────

const markPaid = async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await db
      .update(salaries)
      .set({ status: "paid", paidOn: sql`CURRENT_DATE` })
      .where(and(eq(salaries.id, id), eq(salaries.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("payrollController.markPaid:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── DELETE SALARY ─────────────────────────────────────────────────────────

const remove = async (req, res) => {
  try {
    await db
      .delete(salaries)
      .where(and(eq(salaries.id, req.params.id), eq(salaries.companyId, req.user.company_id)));

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("payrollController.remove:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYROLL ITEMS — Additions
// ═══════════════════════════════════════════════════════════════════════════

const getAdditions = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(payrollAdditions)
      .where(eq(payrollAdditions.companyId, req.user.company_id))
      .orderBy(payrollAdditions.id);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("payrollController.getAdditions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createAddition = async (req, res) => {
  try {
    const { name, category = "monthly", unit_amount = 0, unit_calc = false, assignee = "none" } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const rows = await db
      .insert(payrollAdditions)
      .values({
        name,
        category,
        unitAmount: unit_amount,
        unitCalc:   unit_calc,
        assignee,
        companyId:  req.user.company_id,
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("payrollController.createAddition:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateAddition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit_amount, unit_calc, assignee } = req.body;

    const updateData = {};
    if (name !== undefined)        updateData.name       = name;
    if (category !== undefined)    updateData.category   = category;
    if (unit_amount !== undefined) updateData.unitAmount = unit_amount;
    if (unit_calc !== undefined)   updateData.unitCalc   = unit_calc;
    if (assignee !== undefined)    updateData.assignee   = assignee;

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const rows = await db
      .update(payrollAdditions)
      .set(updateData)
      .where(and(eq(payrollAdditions.id, id), eq(payrollAdditions.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("payrollController.updateAddition:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteAddition = async (req, res) => {
  try {
    await db
      .delete(payrollAdditions)
      .where(and(eq(payrollAdditions.id, req.params.id), eq(payrollAdditions.companyId, req.user.company_id)));

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("payrollController.deleteAddition:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYROLL ITEMS — Deductions
// ═══════════════════════════════════════════════════════════════════════════

const getDeductions = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(payrollDeductions)
      .where(eq(payrollDeductions.companyId, req.user.company_id))
      .orderBy(payrollDeductions.id);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("payrollController.getDeductions:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createDeduction = async (req, res) => {
  try {
    const { name, category = "monthly", unit_amount = 0, unit_calc = false, assignee = "none" } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "name is required" });

    const rows = await db
      .insert(payrollDeductions)
      .values({
        name,
        category,
        unitAmount: unit_amount,
        unitCalc:   unit_calc,
        assignee,
        companyId:  req.user.company_id,
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("payrollController.createDeduction:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateDeduction = async (req, res) => {
  try {
    const { name, category, unit_amount, unit_calc, assignee } = req.body;

    const updateData = {};
    if (name !== undefined)        updateData.name       = name;
    if (category !== undefined)    updateData.category   = category;
    if (unit_amount !== undefined) updateData.unitAmount = unit_amount;
    if (unit_calc !== undefined)   updateData.unitCalc   = unit_calc;
    if (assignee !== undefined)    updateData.assignee   = assignee;

    if (!Object.keys(updateData).length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const rows = await db
      .update(payrollDeductions)
      .set(updateData)
      .where(and(eq(payrollDeductions.id, req.params.id), eq(payrollDeductions.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("payrollController.updateDeduction:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteDeduction = async (req, res) => {
  try {
    await db
      .delete(payrollDeductions)
      .where(and(eq(payrollDeductions.id, req.params.id), eq(payrollDeductions.companyId, req.user.company_id)));

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("payrollController.deleteDeduction:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SALARY SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

const getSettings = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(salarySettings)
      .where(eq(salarySettings.companyId, req.user.company_id))
      .orderBy(salarySettings.id);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("payrollController.getSettings:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateSettings = async (req, res) => {
  const items = req.body;

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ success: false, message: "Expected array of settings" });
  }

  try {
    await db.transaction(async (tx) => {
      for (const { setting_key, value, enabled } of items) {
        await tx.execute(sql`
          INSERT INTO salary_settings (setting_key, value, enabled, company_id)
          VALUES (${setting_key}, ${value}, ${enabled}, ${req.user.company_id})
          ON CONFLICT (setting_key, company_id)
          DO UPDATE SET value = ${value}, enabled = ${enabled}, updated_at = NOW()
        `);
      }
    });

    res.json({ success: true, message: "Settings saved" });
  } catch (err) {
    console.error("payrollController.updateSettings:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getAll, getOne, create, update, markPaid, remove,
  getAdditions, createAddition, updateAddition, deleteAddition,
  getDeductions, createDeduction, updateDeduction, deleteDeduction,
  getSettings, updateSettings,
};