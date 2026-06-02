/**
 * controllers/superAdminController.js
 */

import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import {
  companies,
  users,
  employees,
  userRoles,
  globalSettings,
} from "../db/schema/index.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

const SALT_ROUNDS = 12;

// ── GET /api/super-admin/companies ──────────────────────────────────────────
const getCompanies = asyncHandler(async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        c.id, c.name, c.is_active, c.created_at,
        c.subscription_start, c.subscription_end, c.status, c.admin_username,
        u.email AS admin_email,
        u.first_name || ' ' || u.last_name AS admin_name,
        (SELECT COUNT(*) FROM employees e WHERE e.company_id = c.id AND e.is_active = TRUE) as employee_count
      FROM companies c
      LEFT JOIN (
        SELECT DISTINCT ON (company_id) company_id, first_name, last_name, email
        FROM users u
        JOIN user_roles r ON r.id = u.role_id
        WHERE r.role = 'admin'
        ORDER BY company_id, u.created_at ASC
      ) u ON u.company_id = c.id
      ORDER BY c.created_at DESC
    `);

    return res.json({ success: true, data: rows.rows });
  } catch (error) {
    console.error("❌ Error in getCompanies:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch companies." });
  }
});

// ── POST /api/super-admin/companies ─────────────────────────────────────────
const createCompanyWithAdmin = asyncHandler(async (req, res) => {
  const {
    name,
    admin_username,
    admin_email,
    password,
    subscription_start,
    subscription_end,
  } = req.body;

  if (!name || !admin_email || !password) {
    return res.status(400).json({
      success: false,
      message: "Company Name, Admin Email, and Password are required.",
    });
  }

  const dupCheck = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, admin_email.trim()))
    .limit(1);

  if (dupCheck.length) {
    return res.status(409).json({
      success: false,
      message: "Admin email is already in use by an existing user.",
    });
  }

  const roleCheck = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(eq(userRoles.role, "admin"))
    .limit(1);

  if (!roleCheck.length) {
    return res.status(500).json({
      success: false,
      message: "Admin role is not configured in the database.",
    });
  }

  const adminRoleId = roleCheck[0].id;

  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  const safeName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const username =
    admin_username?.trim() ||
    `admin_${safeName}_${Math.floor(Math.random() * 1000)}`;

  const start =
    subscription_start || new Date().toISOString().split("T")[0];

  const end =
    subscription_end ||
    new Date(
      new Date().setFullYear(new Date().getFullYear() + 1)
    )
      .toISOString()
      .split("T")[0];

  await db.transaction(async (tx) => {
    const compRes = await tx
      .insert(companies)
      .values({
        name: name.trim(),
        isActive: true,
        subscriptionStart: start,
        subscriptionEnd: end,
        status: "active",
        adminUsername: username,
      })
      .returning({ id: companies.id });

    const newCompanyId = compRes[0].id;

    await tx.insert(users).values({
      firstName: "Admin",
      lastName: "User",
      username,
      email: admin_email.trim(),
      passwordHash: hash,
      roleId: adminRoleId,
      companyId: newCompanyId,
      isActive: true,
    });
  });

  return res.status(201).json({
    success: true,
    message: "Company and Admin created successfully.",
  });
});
// ── PUT /api/super-admin/companies/:id/status ───────────────────────────────
const toggleCompanyStatus = asyncHandler(async (req, res) => {
  const companyId = parseInt(req.params.id);
  const { is_active } = req.body;

  if (typeof is_active !== "boolean") {
    return res
      .status(400)
      .json({ success: false, message: "is_active must be a boolean." });
  }

  await db.transaction(async (tx) => {
    const compStatus = is_active ? "active" : "expired";

    const compRes = await tx
      .update(companies)
      .set({ isActive: is_active, status: compStatus }) // ✅ fixed
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });

    if (!compRes.length) {
      throw Object.assign(new Error("Company not found."), { status: 404 });
    }

    await tx
      .update(users)
      .set({ isActive: is_active, updatedAt: sql`NOW()` }) // ✅ fixed
      .where(eq(users.companyId, companyId)); // ✅ fixed

    await tx
      .update(employees)
      .set({ isActive: is_active, updatedAt: sql`NOW()` }) // ✅ fixed
      .where(eq(employees.companyId, companyId)); // ✅ fixed
  });

  return res.json({
    success: true,
    message: `Company ${is_active ? "activated" : "deactivated"}.`,
  });
});

// ── PUT /api/super-admin/companies/:id/subscription ─────────────────────────
const updateSubscription = asyncHandler(async (req, res) => {
  const companyId = parseInt(req.params.id);
  const { subscription_start, subscription_end, password } = req.body;

  await db.transaction(async (tx) => {
    if (subscription_start && subscription_end) {
      await tx
        .update(companies)
        .set({
          subscriptionStart: subscription_start,
          subscriptionEnd: subscription_end,
        })
        .where(eq(companies.id, companyId));
    }

    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);

      const adminRes = await tx
        .select({ id: users.id })
        .from(users)
        .innerJoin(userRoles, eq(users.roleId, userRoles.id))
        .where(
          and(
            eq(users.companyId, companyId),
            eq(userRoles.role, "admin")
          )
        )
        .limit(1);

      if (adminRes.length) {
        await tx
          .update(users)
          .set({ passwordHash: hash, updatedAt: sql`NOW()` })
          .where(eq(users.id, adminRes[0].id));
      }
    }
  });

  return res.json({
    success: true,
    message: "Subscription details updated.",
  });
});
// ── DELETE /api/super-admin/companies/:id ───────────────────────────────────
const deleteCompany = asyncHandler(async (req, res) => {
  const companyId = parseInt(req.params.id);

  if (companyId === 1) {
    return res.status(403).json({
      success: false,
      message: "Cannot delete the master tenant.",
    });
  }

  await db.transaction(async (tx) => {
    await tx.delete(employees).where(eq(employees.companyId, companyId));
    await tx.delete(users).where(eq(users.companyId, companyId));
    await tx
      .delete(globalSettings)
      .where(eq(globalSettings.companyId, companyId));

    const compRes = await tx
      .delete(companies)
      .where(eq(companies.id, companyId))
      .returning({ id: companies.id });

    if (!compRes.length) {
      throw Object.assign(new Error("Company not found."), { status: 404 });
    }
  });

  return res.json({
    success: true,
    message: "Company and all associated users deleted.",
  });
});

export {
  getCompanies,
  createCompanyWithAdmin,
  toggleCompanyStatus,
  updateSubscription,
  deleteCompany,
};