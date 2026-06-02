/**
 * controllers/authController.js
 * Handles login, logout, and session management.
 * Supports legacy usernames: Vendetta, Barry
 * Updated: includes company_id in JWT and user responses for multi-tenancy.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { users, userRoles } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { asyncHandler } from '../middleware/errorHandler.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
const login = asyncHandler(async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        password_hash: users.passwordHash,
        picture: users.picture,
        phone: users.phone,
        is_active: users.isActive,
        company_id: users.companyId,
        role: userRoles.role,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(sql`LOWER(${users.username}) = LOWER(${username.trim()})`);

    if (!rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact HR.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }

    // Issue JWT — include company_id so controller middleware can scope queries
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      company_id: user.company_id || 1,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '8h',
      issuer: 'smarthr-api',
      audience: 'smarthr-client',
    });

    res.cookie('smarthr_token', token, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        picture: user.picture,
        phone: user.phone,
        role: user.role,
        company_id: user.company_id || 1,
      },
    });
  } catch (error) {
    console.error('❌ Error in login:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to login.' });
  }
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (_req, res) => {
  try {
    res.clearCookie('smarthr_token', { path: '/' });
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('❌ Error in logout:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to logout.' });
  }
});

/**
 * GET /api/auth/me
 */
const getProfile = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        picture: users.picture,
        phone: users.phone,
        address: users.address,
        created_at: users.createdAt,
        company_id: users.companyId,
        role: userRoles.role,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(eq(users.id, req.user.id));

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const u = rows[0];
    return res.status(200).json({
      success: true,
      user: {
        ...u,
        firstName: u.first_name,
        lastName: u.last_name,
        company_id: u.company_id || 1,
      },
    });
  } catch (error) {
    console.error('❌ Error in getProfile:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
});

/**
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current and new passwords are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters.' });
    }

    const rows = await db
      .select({ password_hash: users.passwordHash })
      .from(users)
      .where(eq(users.id, req.user.id));
    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, req.user.id));
    res.clearCookie('smarthr_token', { path: '/' });

    return res.status(200).json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (error) {
    console.error('❌ Error in changePassword:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

export { login, logout, getProfile, changePassword };