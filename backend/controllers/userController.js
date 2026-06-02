/**
 * controllers/userController.js
 */

import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { db } from "../db/index.js";
import { users, userRoles, companies } from "../db/schema/index.js";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Multer config for avatar uploads ────────────────────────────────────────
const avatarDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed (jpg, png, webp, gif)."));
  },
}).single("avatar");

// ─── GET /api/user/profile ────────────────────────────────────────────────────
const getMyProfile = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        first_name: users.first_name,
        last_name: users.last_name,
        email: users.email,
        phone: users.phone,
        address: users.address,
        picture: users.picture,
        company_id: users.company_id,
        date_of_birth: users.date_of_birth,
        gender: users.gender,
        nationality: users.nationality,
        marital_status: users.marital_status,
        created_at: users.created_at,
        role: userRoles.role,
        company_name: companies.name,
        currency_symbol: companies.currency_symbol,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.role_id, userRoles.id))
      .leftJoin(companies, eq(users.company_id, companies.id))
      .where(eq(users.id, req.user.id));

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("❌ Error in getMyProfile:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch profile." });
  }
});

// ─── PUT /api/user/profile ────────────────────────────────────────────────────
const updateMyProfile = asyncHandler(async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      address,
      date_of_birth,
      gender,
      nationality,
      marital_status,
    } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required.",
      });
    }

    const rows = await db
      .update(users)
      .set({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email || null,
        phone: phone || null,
        address: address || null,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        nationality: nationality || null,
        marital_status: marital_status || null,
        updated_at: sql`NOW()`,
      })
      .where(eq(users.id, req.user.id))
      .returning({
        id: users.id,
        first_name: users.first_name,
        last_name: users.last_name,
        email: users.email,
        phone: users.phone,
        address: users.address,
        date_of_birth: users.date_of_birth,
        gender: users.gender,
        nationality: users.nationality,
        marital_status: users.marital_status,
        picture: users.picture,
      });

    return res.json({
      success: true,
      message: "Profile updated.",
      user: rows[0],
    });
  } catch (error) {
    console.error("❌ Error in updateMyProfile:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// ─── POST /api/user/avatar ────────────────────────────────────────────────────
const uploadAvatar = (req, res, next) => {
  avatarUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    try {
      const picturePath = `/uploads/avatars/${req.file.filename}`;

      const rows = await db
        .update(users)
        .set({
          picture: picturePath,
          updated_at: sql`NOW()`,
        })
        .where(eq(users.id, req.user.id))
        .returning({ picture: users.picture });

      return res.json({
        success: true,
        message: "Avatar updated.",
        picture: rows[0].picture,
      });
    } catch (dbErr) {
      return next(dbErr);
    }
  });
};

export { getMyProfile, updateMyProfile, uploadAvatar };