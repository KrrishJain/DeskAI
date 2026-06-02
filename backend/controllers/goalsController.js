import { db } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { goals, goalTypes } from '../db/schema/index.js';

/* ───────────── GOAL TYPES ───────────── */

const getAllGoalTypes = async (req, res) => {
  try {
    const rows = await db
      .select({
        id: goalTypes.id,
        type_name: goalTypes.type,
        description: goalTypes.description,
        status: goalTypes.status,
        created_at: goalTypes.createdAt,
      })
      .from(goalTypes)
      .where(eq(goalTypes.companyId, req.user.company_id))
      .orderBy(goalTypes.type);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createGoalType = async (req, res) => {
  try {
    const { type_name, description, status = 'active' } = req.body;

    if (!type_name) {
      return res.status(400).json({ success: false, message: 'type_name required' });
    }

    const rows = await db
      .insert(goalTypes)
      .values({
        type: type_name,
        description: description || null,
        status,
        companyId: req.user.company_id,
      })
      .returning({
        id: goalTypes.id,
        type_name: goalTypes.type,
        description: goalTypes.description,
        status: goalTypes.status,
        created_at: goalTypes.createdAt,
      });

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateGoalType = async (req, res) => {
  try {
    const { id } = req.params;
    const { type_name, description, status } = req.body;

    const updateData = {};
    if (type_name !== undefined) updateData.type = type_name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;

    const rows = await db
      .update(goalTypes)
      .set(updateData)
      .where(and(eq(goalTypes.id, id), eq(goalTypes.companyId, req.user.company_id)))
      .returning({
        id: goalTypes.id,
        type_name: goalTypes.type,
        description: goalTypes.description,
        status: goalTypes.status,
        created_at: goalTypes.createdAt,
      });

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteGoalType = async (req, res) => {
  try {
    await db
      .delete(goalTypes)
      .where(and(eq(goalTypes.id, req.params.id), eq(goalTypes.companyId, req.user.company_id)));

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ───────────── GOALS ───────────── */

const getAllGoals = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...goals,
        type_name: goalTypes.type,
      })
      .from(goals)
      .leftJoin(goalTypes, eq(goalTypes.id, goals.goalTypeId))
      .where(eq(goals.companyId, req.user.company_id))
      .orderBy(goals.createdAt);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getGoal = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...goals,
        type_name: goalTypes.type,
      })
      .from(goals)
      .leftJoin(goalTypes, eq(goalTypes.id, goals.goalTypeId))
      .where(and(eq(goals.id, req.params.id), eq(goals.companyId, req.user.company_id)));

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createGoal = async (req, res) => {
  try {
    const {
      goal_type_id,
      subject,
      target,
      start_date,
      end_date,
      description,
      status = 'active',
      progress = 0,
      assigned_to,
    } = req.body;

    // required fields (based on schema)
    if (!subject || !target || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'subject, target, start_date, end_date are required',
      });
    }

    const pct = Math.min(100, Math.max(0, parseInt(progress, 10) || 0));

    const rows = await db
      .insert(goals)
      .values({
        goalTypeId: goal_type_id || null,
        subject,
        target,
        startDate: start_date,
        endDate: end_date,
        description: description || null,
        status,
        progress: pct,
        assignedTo: assigned_to || null,
        companyId: req.user.company_id,
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      goal_type_id,
      subject,
      target,
      start_date,
      end_date,
      description,
      status,
      progress,
      assigned_to,
    } = req.body;

    const updateData = {};

    if (goal_type_id !== undefined) updateData.goalTypeId = goal_type_id;
    if (subject !== undefined) updateData.subject = subject;
    if (target !== undefined) updateData.target = target;
    if (start_date !== undefined) updateData.startDate = start_date;
    if (end_date !== undefined) updateData.endDate = end_date;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (assigned_to !== undefined) updateData.assignedTo = assigned_to;

    if (progress !== undefined) {
      updateData.progress = Math.min(100, Math.max(0, parseInt(progress, 10)));
    }

    updateData.updatedAt = new Date();

    const rows = await db
      .update(goals)
      .set(updateData)
      .where(and(eq(goals.id, id), eq(goals.companyId, req.user.company_id)))
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteGoal = async (req, res) => {
  try {
    await db
      .delete(goals)
      .where(and(eq(goals.id, req.params.id), eq(goals.companyId, req.user.company_id)));

    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export {
  getAllGoalTypes,
  createGoalType,
  updateGoalType,
  deleteGoalType,
  getAllGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
};