/**
 * controllers/settingsController.js
 */

import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import { db } from "../db/index.js";
import { companies, globalSettings } from "../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Multer config for company logo ──────────────────────────────────────────
const logoDir = path.join(__dirname, "..", "uploads", "logos");
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `company_${req.user.company_id || 1}_${Date.now()}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  },
}).single("logo");

const getCompanyId = (req) => req.user.company_id || 1;

// ─── GET /api/settings ────────────────────────────────────────────────────────
const getSettings = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const companyRows = await db
      .select({
        id: companies.id,
        name: companies.name,
        logo_url: companies.logo_url,
        currency_symbol: companies.currency_symbol,
        address: companies.address,
        timezone: companies.timezone,
        contact_person: companies.contact_person,
        email: companies.email,
        phone: companies.phone,
        mobile: companies.mobile,
        fax: companies.fax,
        website: companies.website,
      })
      .from(companies)
      .where(eq(companies.id, companyId));

    if (!companyRows.length) {
      return res.status(404).json({ success: false, message: "Company not found." });
    }

    const settingsRows = await db
      .select({
        key: globalSettings.key,
        value: globalSettings.value,
      })
      .from(globalSettings)
      .where(eq(globalSettings.company_id, companyId));

    const settingsMap = {};
    settingsRows.forEach(({ key, value }) => {
      settingsMap[key] = value;
    });

    return res.json({
      success: true,
      company: companyRows[0],
      settings: settingsMap,
    });
  } catch (error) {
    console.error("❌ Error in getSettings:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch settings." });
  }
});

// ─── PUT /api/settings ────────────────────────────────────────────────────────
const updateSettings = asyncHandler(async (req, res) => {
  try {
    const companyId = getCompanyId(req);

    const {
      name,
      currency_symbol,
      address,
      timezone,
      contact_person,
      email,
      phone,
      mobile,
      fax,
      website,
      ...kvPairs
    } = req.body;

    const companyFields = {
      name,
      currency_symbol,
      address,
      timezone,
      contact_person,
      email,
      phone,
      mobile,
      fax,
      website,
    };

    const updateData = {};
    for (const [key, value] of Object.entries(companyFields)) {
      if (value !== undefined) updateData[key] = value === "" ? null : value;
    }

    if (Object.keys(updateData).length) {
      await db
        .update(companies)
        .set(updateData)
        .where(eq(companies.id, companyId));
    }

    const settingKeys = [
      "theme_sidebar_color",
      "theme_accent_color",
      "invoice_prefix",
      "invoice_tax_percent",
      "invoice_footer_notes",
      "salary_tax_percent",
      "salary_pf_rate",
      "salary_payslip_prefix",
    ];

    for (const key of settingKeys) {
      if (kvPairs[key] !== undefined) {
        await db.execute(sql`
          INSERT INTO global_settings (company_id, key, value)
          VALUES (${companyId}, ${key}, ${kvPairs[key]})
          ON CONFLICT (company_id, key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `);
      }
    }

    return res.json({ success: true, message: "Settings saved." });
  } catch (error) {
    console.error("❌ Error in updateSettings:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update settings." });
  }
});

// ─── POST /api/settings/logo ──────────────────────────────────────────────────
const uploadCompanyLogo = (req, res, next) => {
  logoUpload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    try {
      const companyId = getCompanyId(req);
      const logoUrl = `/uploads/logos/${req.file.filename}`;

      await db
        .update(companies)
        .set({ logo_url: logoUrl })
        .where(eq(companies.id, companyId));

      return res.json({
        success: true,
        message: "Logo updated.",
        logo_url: logoUrl,
      });
    } catch (dbErr) {
      return next(dbErr);
    }
  });
};

export { getSettings, updateSettings, uploadCompanyLogo };