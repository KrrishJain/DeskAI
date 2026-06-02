/**
 * controllers/holidaysController.js
 * CRUD for the holidays table.
 * Default GET filters by current year (mirrors holidays.php behaviour).
 * Pass ?year=all to get every holiday across all years.
 */

import { db } from '../db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { holidays } from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/holidays?year=2025   (defaults to current year)
const getAll = asyncHandler(async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = new Date().getFullYear();
    const targetYear = year === 'all' ? null : parseInt(year || currentYear);

    const conditions = [eq(holidays.companyId, req.user.company_id)];
    if (targetYear) {
      conditions.push(sql`EXTRACT(YEAR FROM ${holidays.holidayDate}) = ${targetYear}`);
    }

    const rows = await db
      .select()
      .from(holidays)
      .where(and(...conditions))
      .orderBy(holidays.holidayDate);

    const enriched = rows.map(h => ({
      ...h,
      day_of_week: DAYS[new Date(h.holidayDate).getDay()],
    }));

    res.json({ success: true, data: enriched, year: targetYear || 'all' });
  } catch (error) {
    console.error('❌ Error in getAll:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch holidays.' });
  }
});

// POST /api/holidays
const create = asyncHandler(async (req, res) => {
  try {
    const { name, holiday_date } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Holiday name is required.' });
    }
    if (!holiday_date) {
      return res.status(400).json({ success: false, message: 'Holiday date is required.' });
    }

    const rows = await db
      .insert(holidays)
      .values({ name: name.trim(), holidayDate: holiday_date, companyId: req.user.company_id })
      .returning();

    const row = rows[0];
    res.status(201).json({
      success: true,
      data: { ...row, day_of_week: DAYS[new Date(row.holidayDate).getDay()] },
    });
  } catch (error) {
    console.error('❌ Error in create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create holiday.' });
  }
});

// PUT /api/holidays/:id
const update = asyncHandler(async (req, res) => {
  try {
    const { name, holiday_date } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Holiday name is required.' });
    }
    if (!holiday_date) {
      return res.status(400).json({ success: false, message: 'Holiday date is required.' });
    }

    const rows = await db
      .update(holidays)
      .set({ name: name.trim(), holidayDate: holiday_date })
      .where(and(eq(holidays.id, parseInt(req.params.id)), eq(holidays.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }

    const row = rows[0];
    res.json({
      success: true,
      data: { ...row, day_of_week: DAYS[new Date(row.holidayDate).getDay()] },
    });
  } catch (error) {
    console.error('❌ Error in update:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update holiday.' });
  }
});

// DELETE /api/holidays/:id
const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db
      .delete(holidays)
      .where(and(eq(holidays.id, parseInt(req.params.id)), eq(holidays.companyId, req.user.company_id)))
      .returning({ id: holidays.id, name: holidays.name });

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Holiday not found.' });
    }
    res.json({ success: true, message: `Holiday "${rows[0].name}" deleted.` });
  } catch (error) {
    console.error('❌ Error in remove:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete holiday.' });
  }
});

export { getAll, create, update, remove };