/**
 * middleware/auth.js
 */

import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users, userRoles } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.smarthr_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      res.clearCookie("smarthr_token");
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    // Ensure token contains id
    if (!decoded || !decoded.id) {
      res.clearCookie("smarthr_token");
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const userId = Number(decoded.id);
    const result = await db
      .select({
        id: users.id,
        username: users.username,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        picture: users.picture,
        company_id: users.companyId,
        role: userRoles.role,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.roleId, userRoles.id))
      .where(
        and(
          eq(users.id, userId),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!result.length) {
      res.clearCookie("smarthr_token");
      return res.status(401).json({
        success: false,
        message: "User not found or deactivated.",
      });
    }

    req.user = result[0];

    next();
  } catch (err) {
    console.error("[Auth Middleware ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
};

export { authenticate, authorize };