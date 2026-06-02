/**
 * controllers/employeesController.js
 * Full CRUD for employee management.
 *
 * KEY FEATURE: Creating an employee also creates a linked users row
 * so the employee can log in to the system immediately.
 */

import bcrypt from "bcrypt";
import { db } from "../db/index.js";
import { eq, and, or, ilike, count, sql } from "drizzle-orm";
import { desc } from "drizzle-orm";
import {
  employees,
  users,
  departments,
  designations,
  userRoles,
  clients,
  projects,
  leaves,
  assets,
} from "../db/schema/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// Helper: generate a unique username like "john.doe" or "john.doe.2"
async function generateUsername(firstName, lastName) {
  const base =
    `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`.replace(
      /\s+/g,
      "",
    );
  let username = base;
  let attempt = 1;
  while (true) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`)
      .limit(1);
    if (!rows.length) return username;
    attempt++;
    username = `${base}.${attempt}`;
  }
}

/**
 * GET /api/employees
 */
const getAll = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      department_id,
      designation_id,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const companyId = req.user?.company_id
    const conditions = [
      eq(employees.isActive, true),
      eq(employees.companyId, companyId),
    ];

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(employees.firstName, term),
          ilike(employees.lastName, term),
          ilike(employees.employeeId, term)
        )
      );
    }

    if (department_id) {
      conditions.push(eq(employees.departmentId, parseInt(department_id)));
    }

    if (designation_id) {
      conditions.push(eq(employees.designationId, parseInt(designation_id)));
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ count: count().as("count") })
      .from(employees)
      .where(whereClause);

    const rows = await db
  .select({
    id: employees.id,
    first_name: employees.firstName,
    last_name: employees.lastName,
    employee_id: employees.employeeId,
    email: employees.email,        // ✅ now works
    phone: employees.phone,
    picture: employees.picture,
    joining_date: employees.joiningDate,
    is_active: employees.isActive,
    created_at: employees.createdAt,
    user_id: employees.userId,     // ✅ now works

    department: departments.name,
    department_id: departments.id,

    designation: designations.title,
    designation_id: designations.id,
  })
  .from(employees)
  .leftJoin(departments, eq(employees.departmentId, departments.id))
  .leftJoin(designations, eq(employees.designationId, designations.id))
  .where(whereClause)
  .orderBy(desc(employees.createdAt))
  .limit(parseInt(limit))
  .offset(offset);

    const total = parseInt(countResult[0]?.count || 0);

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
    console.error("❌ ERROR IN getAll employees:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch employees." });
  }
});

/**
 * GET /api/employees/:id
 */
const getById = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id: employees.id,
        first_name: employees.firstName,
        last_name: employees.lastName,
        employee_id: employees.employeeId,
        email: employees.email,
        phone: employees.phone,
        picture: employees.picture,
        joining_date: employees.joiningDate,
        is_active: employees.isActive,
        created_at: employees.createdAt,
        updated_at: employees.updatedAt,
        user_id: employees.userId,
        bank_name: employees.bankName,
        account_number: employees.accountNumber,
        ifsc_code: employees.ifscCode,
        branch_name: employees.branchName,
        department: departments.name,
        department_id: departments.id,
        designation: designations.title,
        designation_id: designations.id,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(
        and(
          eq(employees.id, parseInt(req.params.id)),
          eq(employees.companyId, req.user.company_id),
        ),
      );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found." });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error in getById:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch employee." });
  }
});

/**
 * POST /api/employees
 * Creates an employee AND a linked users login record in a single transaction.
 *
 * Body: { firstName, lastName, email, password, employeeId,
 *         phone, departmentId, designationId, joiningDate }
 */
const create = asyncHandler(async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      username: providedUsername,
      email,
      password,
      employeeId,
      phone,
      departmentId,
      designationId,
      joiningDate,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "firstName, lastName, email and password are required.",
        });
    }

    const dupCheck = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.email, email.trim()),
          eq(employees.companyId, req.user.company_id),
        ),
      );

    if (dupCheck.length > 0) {
      return res
        .status(409)
        .json({
          success: false,
          message: "An employee with this email already exists.",
        });
    }

    const result = await db.transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(password, 12);
      const username =
        providedUsername?.trim() ||
        (await generateUsername(firstName, lastName));

      const roleRows = await tx
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(eq(userRoles.role, "employee"))
        .limit(1);
      const roleId = roleRows[0]?.id || 3;

      const userRows = await tx
        .insert(users)
        .values({
          firstName,
          lastName,
          username,
          email,
          passwordHash,
          phone: phone || null,
          roleId,
          companyId: req.user.company_id || 1,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            firstName,
            lastName,
          },
        })
        .returning({ id: users.id });
      const userId = userRows[0].id;

      const empId =
        employeeId || `EMP-${Date.now().toString(36).toUpperCase()}`;

      const empRows = await tx
        .insert(employees)
        .values({
          firstName,
          lastName,
          email,
          passwordHash,
          employeeId: empId,
          phone: phone || null,
          departmentId: departmentId ? parseInt(departmentId) : null,
          designationId: designationId ? parseInt(designationId) : null,
          joiningDate: joiningDate || new Date(),
          userId,
          companyId: req.user.company_id || 1,
          bankName: bankName || null,
          accountNumber: accountNumber || null,
          ifscCode: ifscCode || null,
          branchName: branchName || null,
        })
        .returning({
          id: employees.id,
          employee_id: employees.employeeId,
          first_name: employees.firstName,
          last_name: employees.lastName,
          email: employees.email,
          user_id: employees.userId,
        });

      return { employee: empRows[0], username };
    });

    return res.status(201).json({
      success: true,
      message: `Employee created. Login username: "${result.username}".`,
      data: result.employee,
      loginUsername: result.username,
    });
  } catch (error) {
    console.error("❌ Error in create:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create employee." });
  }
});

/**
 * PUT /api/employees/:id
 */
const update = asyncHandler(async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      departmentId,
      designationId,
      joiningDate,
      bankName,
      accountNumber,
      ifscCode,
      branchName,
    } = req.body;

    const empId = parseInt(req.params.id);

    const rows = await db
      .update(employees)
      .set({
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        designationId: designationId ? parseInt(designationId) : null,
        joiningDate,
        bankName: bankName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        branchName: branchName || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(employees.id, empId),
          eq(employees.companyId, req.user.company_id),
          eq(employees.isActive, true),
        ),
      )
      .returning({
        id: employees.id,
        first_name: employees.firstName,
        last_name: employees.lastName,
        email: employees.email,
        user_id: employees.userId,
      });

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found." });
    }

    if (rows[0].user_id) {
      await db
        .update(users)
        .set({
          firstName,
          lastName,
          phone: phone || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, rows[0].user_id));
    }

    return res.json({
      success: true,
      message: "Employee updated.",
      data: rows[0],
    });
  } catch (error) {
    console.error("❌ Error in update:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update employee." });
  }
});

/**
 * DELETE /api/employees/:id  —  soft delete
 */
const remove = asyncHandler(async (req, res) => {
  try {
    const empId = parseInt(req.params.id);

    const rows = await db
      .update(employees)
      .set({ isActive: false })
      .where(
        and(
          eq(employees.id, empId),
          eq(employees.companyId, req.user.company_id),
        ),
      )
      .returning({ id: employees.id, user_id: employees.userId });

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found." });
    }

    if (rows[0].user_id) {
      await db
        .update(users)
        .set({ isActive: false })
        .where(eq(users.id, rows[0].user_id));
    }

    return res.json({ success: true, message: "Employee deactivated." });
  } catch (error) {
    console.error("❌ Error in remove:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to deactivate employee." });
  }
});

/**
 * GET /api/employees/stats/overview
 */
const getStats = asyncHandler(async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const [
      totalEmployees,
      newThisMonth,
      totalClients,
      activeProjects,
      pendingLeaves,
      totalAssets,
    ] = await Promise.all([
      db.select({ val: count() }).from(employees)
        .where(and(eq(employees.isActive, true), eq(employees.companyId, companyId))),

      db.select({ val: count() }).from(employees)
        .where(and(
          eq(employees.isActive, true),
          eq(employees.companyId, companyId),
          sql`${employees.joiningDate} >= NOW() - INTERVAL '30 days'`
        )),

      db.select({ val: count() }).from(clients)
        .where(eq(clients.companyId, companyId)),

      db.select({ val: count() }).from(projects)
        .where(and(eq(projects.status, "active"), eq(projects.companyId, companyId))),

      db.select({ val: count() }).from(leaves)
        .where(and(eq(leaves.status, "pending"), eq(leaves.companyId, companyId))),

      db.select({ val: count() }).from(assets)
        .where(eq(assets.companyId, companyId)),
    ]);

    return res.json({
      success: true,
      data: {
        total_employees: totalEmployees[0].val,
        new_this_month: newThisMonth[0].val,
        total_clients: totalClients[0].val,
        active_projects: activeProjects[0].val,
        pending_leaves: pendingLeaves[0].val,
        total_assets: totalAssets[0].val,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee stats.",
    });
  }
});

const getEmployeeDashboard = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const emp = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.userId, userId))
      .limit(1);

    if (!emp.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employeeId = emp[0].id;

    const pendingLeaves = await db
      .select({ val: count() })
      .from(leaves)
      .where(
        and(
          eq(leaves.employeeId, employeeId),
          eq(leaves.status, "pending")
        )
      );

    return res.json({
      success: true,
      data: {
        assigned_projects: 0,
        pending_leaves: pendingLeaves[0]?.val || 0,
      },
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard.",
    });
  }
});

export { getAll, getById, create, update, remove, getStats };
