/**
 * middleware/checkSubscription.js
 */

import { db } from "../db/index.js";
import { companies } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

const checkSubscription = async (req, res, next) => {
  try {
    if (req.user?.role === "superadmin") {
      return next();
    }

    const companyId = req.user?.company_id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "No company attached to user.",
      });
    }

    const rows = await db
      .select({
        status: companies.status,
        subscription_end: companies.subscriptionEnd,
        is_active: companies.isActive,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!rows.length) {
      return res.status(403).json({
        success: false,
        message: "Invalid company record.",
      });
    }

    const company = rows[0];

    if (!company.is_active || company.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "Your company account is suspended or inactive. Please contact support.",
      });
    }

    if (company.subscription_end) {
      const endMs = new Date(company.subscription_end).getTime();
      const nowMs = new Date().setHours(0, 0, 0, 0);

      if (endMs < nowMs) {
        return res.status(403).json({
          success: false,
          message:
            "Your company subscription has expired. Access is on hold. Please contact the Super Admin to renew.",
          errorType: "subscription_expired",
        });
      }
    }

    next();
  } catch (err) {
    console.error("[Subscription Check]", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error calculating subscription.",
    });
  }
};

export default checkSubscription;