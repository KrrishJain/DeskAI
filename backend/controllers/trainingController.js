import { db } from "../db/index.js";
import {
  trainingTypes,
  trainers,
  trainings,
  employees
} from "../db/schema/index.js";
import { eq, and, asc, desc, sql } from "drizzle-orm";

/* ───────────── TRAINING TYPES ───────────── */

const getAllTrainingTypes = async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(trainingTypes)
      .where(eq(trainingTypes.companyId, req.user.company_id))
      .orderBy(asc(trainingTypes.typeName));

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTrainingType = async (req, res) => {
  try {
    const { type_name, description, status = "active" } = req.body;

    if (!type_name) {
      return res.status(400).json({ success: false, message: "type_name required" });
    }

    const rows = await db
      .insert(trainingTypes)
      .values({
        typeName: type_name,
        description: description || null,
        status,
        companyId: req.user.company_id
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTrainingType = async (req, res) => {
  try {
    const { type_name, description, status } = req.body;

    const rows = await db
      .update(trainingTypes)
      .set({
        typeName: type_name ?? sql`${trainingTypes.typeName}`,
        description: description ?? sql`${trainingTypes.description}`,
        status: status ?? sql`${trainingTypes.status}`
      })
      .where(
        and(
          eq(trainingTypes.id, req.params.id),
          eq(trainingTypes.companyId, req.user.company_id)
        )
      )
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteTrainingType = async (req, res) => {
  try {
    await db
      .delete(trainingTypes)
      .where(
        and(
          eq(trainingTypes.id, req.params.id),
          eq(trainingTypes.companyId, req.user.company_id)
        )
      );

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ───────────── TRAINERS ───────────── */

const getAllTrainers = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...trainers,
        employee_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`
      })
      .from(trainers)
      .leftJoin(employees, eq(employees.id, trainers.employeeId))
      .where(eq(trainers.companyId, req.user.company_id))
      .orderBy(asc(trainers.name));

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTrainer = async (req, res) => {
  try {
    const { employee_id, name, phone, email, description, status = "active" } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "name required" });
    }

    const rows = await db
      .insert(trainers)
      .values({
        employeeId: employee_id || null,
        name,
        phone: phone || null,
        email: email || null,
        description: description || null,
        status,
        companyId: req.user.company_id
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTrainer = async (req, res) => {
  try {
    const { employee_id, name, phone, email, description, status } = req.body;

    const rows = await db
      .update(trainers)
      .set({
        employeeId: employee_id ?? sql`${trainers.employeeId}`,
        name: name ?? sql`${trainers.name}`,
        phone: phone ?? sql`${trainers.phone}`,
        email: email ?? sql`${trainers.email}`,
        description: description ?? sql`${trainers.description}`,
        status: status ?? sql`${trainers.status}`
      })
      .where(
        and(
          eq(trainers.id, req.params.id),
          eq(trainers.companyId, req.user.company_id)
        )
      )
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteTrainer = async (req, res) => {
  try {
    await db
      .delete(trainers)
      .where(
        and(
          eq(trainers.id, req.params.id),
          eq(trainers.companyId, req.user.company_id)
        )
      );

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ───────────── TRAININGS ───────────── */

const getAllTrainings = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...trainings,
        training_type: trainingTypes.typeName,
        trainer_name: trainers.name,
        employee_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`
      })
      .from(trainings)
      .leftJoin(trainingTypes, eq(trainingTypes.id, trainings.trainingTypeId))
      .leftJoin(trainers, eq(trainers.id, trainings.trainerId))
      .leftJoin(employees, eq(employees.id, trainings.employeeId))
      .where(eq(trainings.companyId, req.user.company_id))
      .orderBy(desc(trainings.startDate));

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTraining = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...trainings,
        type_name: trainingTypes.typeName,
        trainer_name: trainers.name,
        employee_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`
      })
      .from(trainings)
      .leftJoin(trainingTypes, eq(trainingTypes.id, trainings.trainingTypeId))
      .leftJoin(trainers, eq(trainers.id, trainings.trainerId))
      .leftJoin(employees, eq(employees.id, trainings.employeeId))
      .where(
        and(
          eq(trainings.id, req.params.id),
          eq(trainings.companyId, req.user.company_id)
        )
      );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createTraining = async (req, res) => {
  try {
    const {
      training_type_id,
      trainer_id,
      employee_id,
      training_cost,
      start_date,
      end_date,
      description,
      status = "active"
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: "employee_id required" });
    }

    const rows = await db
      .insert(trainings)
      .values({
        trainingTypeId: training_type_id || null,
        trainerId: trainer_id || null,
        employeeId: employee_id,
        trainingCost: training_cost || null,
        startDate: start_date || null,
        endDate: end_date || null,
        description: description || null,
        status,
        companyId: req.user.company_id
      })
      .returning();

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateTraining = async (req, res) => {
  try {
    const {
      training_type_id,
      trainer_id,
      employee_id,
      training_cost,
      start_date,
      end_date,
      description,
      status
    } = req.body;

    const rows = await db
      .update(trainings)
      .set({
        trainingTypeId: training_type_id ?? sql`${trainings.trainingTypeId}`,
        trainerId: trainer_id ?? sql`${trainings.trainerId}`,
        employeeId: employee_id ?? sql`${trainings.employeeId}`,
        trainingCost: training_cost ?? sql`${trainings.trainingCost}`,
        startDate: start_date ?? sql`${trainings.startDate}`,
        endDate: end_date ?? sql`${trainings.endDate}`,
        description: description ?? sql`${trainings.description}`,
        status: status ?? sql`${trainings.status}`
      })
      .where(
        and(
          eq(trainings.id, req.params.id),
          eq(trainings.companyId, req.user.company_id)
        )
      )
      .returning();

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteTraining = async (req, res) => {
  try {
    await db
      .delete(trainings)
      .where(
        and(
          eq(trainings.id, req.params.id),
          eq(trainings.companyId, req.user.company_id)
        )
      );

    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export {
  getAllTrainingTypes,
  createTrainingType,
  updateTrainingType,
  deleteTrainingType,
  getAllTrainers,
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getAllTrainings,
  getTraining,
  createTraining,
  updateTraining,
  deleteTraining
};