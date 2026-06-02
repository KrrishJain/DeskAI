/**
 * controllers/adminController.js
 * System user management — Admin only.
 * Operations: list, create, update (role/status/password), deactivate.
 *
 * Schema:
 *   users: id, first_name, last_name, username, email, password_hash,
 *          phone, address, picture, role_id, is_active, created_at, updated_at
 *   user_roles: id, role (enum: admin | hr | employee)
 *   employees: id, user_id (FK to users), first_name, last_name
 */

import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { users, userRoles, employees, auditLogs } from '../db/schema/index.js';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

// ── GET /api/admin/users ──────────────────────────────────────────────────────
const getUsers = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        picture: users.picture,
        is_active: users.isActive,
        created_at: users.createdAt,
        role: userRoles.role,
        employee_id: employees.id,
        employee_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
      })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.id, users.roleId))
      .leftJoin(employees, sql`employees.user_id = ${users.id}`)
      .where(eq(users.companyId, req.user.company_id))
      .orderBy(desc(users.createdAt));
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// ── POST /api/admin/users ─────────────────────────────────────────────────────
const createUser = asyncHandler(async (req, res) => {
  try {
    const { first_name, last_name, username, email, password, role = 'employee' } = req.body;

    if (!first_name?.trim() || !username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, username, email, and password are required.',
      });
    }

    // Resolve role_id
    const roleRes = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .where(eq(userRoles.role, role))
      .limit(1);
    if (!roleRes.length) {
      return res.status(400).json({ success: false, message: `Invalid role: ${role}.` });
    }
    const roleId = roleRes[0].id;

    // Uniqueness check
    const dup = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          or(eq(users.username, username.trim()), eq(users.email, email.trim())),
          eq(users.companyId, req.user.company_id)
        )
      )
      .limit(1);
    if (dup.length) {
      return res.status(409).json({ success: false, message: 'Username or email already taken.' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const rows = await db
      .insert(users)
      .values({
        firstName: first_name.trim(),
        lastName: last_name?.trim() || '',
        username: username.trim(),
        email: email.trim(),
        passwordHash: hash,
        roleId,
        isActive: true,
        companyId: req.user.company_id,
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        first_name: users.firstName,
        last_name: users.lastName,
        is_active: users.isActive,
        created_at: users.createdAt,
      });

    return res.status(201).json({ success: true, data: { ...rows[0], role } });
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// ── PUT /api/admin/users/:id ──────────────────────────────────────────────────
const updateUser = asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { first_name, last_name, email, role, is_active, password } = req.body;

    // Update users table fields
    await db
      .update(users)
      .set({
        firstName: first_name ? first_name : undefined,
        lastName: last_name ? last_name : undefined,
        email: email ? email : undefined,
        isActive: is_active != null ? is_active : undefined,
        updatedAt: sql`now()`,
      })
      .where(and(eq(users.id, id), eq(users.companyId, req.user.company_id)));

    // Update role if provided
    if (role) {
      const roleRes = await db
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(eq(userRoles.role, role))
        .limit(1);
      if (roleRes.length) {
        await db
          .update(users)
          .set({ roleId: roleRes[0].id })
          .where(and(eq(users.id, id), eq(users.companyId, req.user.company_id)));
      }
    }

    // Reset password if provided
    if (password) {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      await db
        .update(users)
        .set({ passwordHash: hash })
        .where(and(eq(users.id, id), eq(users.companyId, req.user.company_id)));
    }

    return res.json({ success: true, message: 'User updated.' });
  } catch (error) {
    console.error('❌ Error updating user:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
const deleteUser = asyncHandler(async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    await db
      .update(users)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(and(eq(users.id, id), eq(users.companyId, req.user.company_id)));
    return res.json({ success: true, message: 'User deactivated.' });
  } catch (error) {
    console.error('❌ Error deleting user:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to deactivate user.' });
  }
});

// ── GET /api/admin/audit-logs ─────────────────────────────────────────────────
const getAuditLogs = asyncHandler(async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;

    // Check if module column exists (it should after migration 006)
    let hasModuleCol = true;
    try {
      const moduleCheck = await db.execute(sql`
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'module'
        LIMIT 1
      `);
      hasModuleCol = moduleCheck.rows.length > 0;
    } catch (error) {
      console.warn('⚠ Module column not found in audit_logs');
      hasModuleCol = false;
    }

    let rows;
    if (hasModuleCol) {
      const result = await db.execute(sql`
        SELECT
          al.id, al.module, al.method, al.endpoint, al.action,
          al.record_id, al.ip_address, al.created_at,
          u.username, u.first_name, u.last_name
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.changed_by
        WHERE al.company_id = ${req.user.company_id}
        ORDER BY al.created_at DESC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `);
      rows = result.rows;
    } else {
      // Fallback if migration hasn't run yet
      rows = await db
        .select({
          id: auditLogs.id,
          module: auditLogs.tableName,
          action: auditLogs.action,
          record_id: auditLogs.recordId,
          ip_address: auditLogs.ipAddress,
          created_at: auditLogs.createdAt,
          username: users.username,
          first_name: users.firstName,
          last_name: users.lastName,
        })
        .from(auditLogs)
        .leftJoin(users, eq(users.id, auditLogs.changedBy))
        .where(eq(auditLogs.companyId, req.user.company_id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));
    }

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ Error fetching audit logs:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
});

export { getUsers, createUser, updateUser, deleteUser, getAuditLogs };
