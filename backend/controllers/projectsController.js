/**
 * projectsController.js
 * All Drizzle column refs use camelCase (schema convention).
 * req.user properties use snake_case (auth middleware convention).
 */

import { db } from "../db/index.js";
import {
  projects,
  clients,
  employees,
  tasks,
  projectMembers,
} from "../db/schema/index.js";
import { eq, and, desc, sql } from "drizzle-orm";

// ── helpers ──────────────────────────────────────────────────────────────────

const VALID_PRIORITIES  = ["high", "medium", "low"];
const VALID_STATUSES    = ["active", "inactive", "completed"];
const VALID_TASK_STATUSES = ["todo", "doing", "done"];
const VALID_RATE_TYPES  = ["fixed", "hourly"];

/** Enrich a project row with members array. */
const attachMembers = async (projectId) => {
  const rows = await db
    .select({
      employeeId: projectMembers.employeeId,                              // ✅ camelCase
      name: sql`${employees.firstName} || ' ' || ${employees.lastName}`, // ✅ camelCase
      picture: employees.picture,
    })
    .from(projectMembers)
    .innerJoin(employees, eq(employees.id, projectMembers.employeeId))   // ✅ camelCase
    .where(eq(projectMembers.projectId, projectId))                      // ✅ camelCase
    .orderBy(employees.firstName);                                        // ✅ camelCase

  return rows;
};

// ── LIST  GET /api/projects ──────────────────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...projects,
        client_name:    clients.company,
        client_code:    clients.clientId,                                // ✅ camelCase
        leader_name:    sql`${employees.firstName} || ' ' || ${employees.lastName}`,
        leader_picture: employees.picture,
        total_tasks:     sql`vpp.total_tasks`,
        completed_tasks: sql`vpp.completed_tasks`,
        todo_tasks:      sql`vpp.todo_tasks`,
        doing_tasks:     sql`vpp.doing_tasks`,
        progress_pct:    sql`vpp.progress_pct`,
      })
      .from(projects)
      .leftJoin(clients,   eq(clients.id,   projects.clientId))          // ✅ camelCase
      .leftJoin(employees, eq(employees.id, projects.leaderId))          // ✅ camelCase
      .leftJoin(sql`v_project_progress vpp`, sql`vpp.project_id = ${projects.id}`)
      .where(eq(projects.companyId, req.user.company_id))                // ✅ schema camelCase, req.user snake_case
      .orderBy(desc(projects.createdAt));                                 // ✅ camelCase

    const enriched = await Promise.all(
      rows.map(async (proj) => ({ ...proj, members: await attachMembers(proj.id) }))
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("projectsController.getAll:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── DETAIL  GET /api/projects/:id ────────────────────────────────────────────
const getOne = async (req, res) => {
  const { id } = req.params;

  try {
    const projRows = await db
      .select({
        ...projects,
        client_name:    clients.company,
        client_code:    clients.clientId,                                // ✅
        client_email:   clients.email,
        leader_name:    sql`${employees.firstName} || ' ' || ${employees.lastName}`,
        leader_picture: employees.picture,
        total_tasks:     sql`vpp.total_tasks`,
        completed_tasks: sql`vpp.completed_tasks`,
        todo_tasks:      sql`vpp.todo_tasks`,
        doing_tasks:     sql`vpp.doing_tasks`,
        progress_pct:    sql`vpp.progress_pct`,
      })
      .from(projects)
      .leftJoin(clients,   eq(clients.id,   projects.clientId))          // ✅
      .leftJoin(employees, eq(employees.id, projects.leaderId))          // ✅
      .leftJoin(sql`v_project_progress vpp`, sql`vpp.project_id = ${projects.id}`)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user.company_id))); // ✅

    if (!projRows.length) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const project = projRows[0];
    project.members = await attachMembers(id);

    const taskRows = await db
      .select({
        ...tasks,
        assigned_name:    sql`${employees.firstName} || ' ' || ${employees.lastName}`,
        assigned_picture: employees.picture,
      })
      .from(tasks)
      .leftJoin(employees, eq(employees.id, tasks.assignedTo))           // ✅ camelCase
      .where(and(eq(tasks.projectId, id), eq(tasks.companyId, req.user.company_id))) // ✅
      .orderBy(tasks.status, tasks.createdAt);                            // ✅

    const kanban = { todo: [], doing: [], done: [] };
    taskRows.forEach((t) => { if (kanban[t.status]) kanban[t.status].push(t); });

    res.json({ success: true, data: { project, tasks: kanban } });
  } catch (err) {
    console.error("projectsController.getOne:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── CREATE  POST /api/projects ───────────────────────────────────────────────
const create = async (req, res) => {
  const {
    name, description, client_id, leader_id,
    start_date, end_date, rate, rate_type,
    priority, status, member_ids,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: "Project name is required" });
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          name:        name.trim(),
          description: description?.trim() || null,
          clientId:    client_id  ? parseInt(client_id)  : null,         // ✅ camelCase
          leaderId:    leader_id  ? parseInt(leader_id)  : null,         // ✅ camelCase
          startDate:   start_date || null,                               // ✅ camelCase
          endDate:     end_date   || null,                               // ✅ camelCase
          rate:        rate       || null,
          rateType:    VALID_RATE_TYPES.includes(rate_type)  ? rate_type  : "fixed",  // ✅
          priority:    VALID_PRIORITIES.includes(priority)   ? priority   : "medium",
          status:      VALID_STATUSES.includes(status)       ? status     : "active",
          companyId:   req.user.company_id,                              // ✅
        })
        .returning();

      // Add extra members
      if (Array.isArray(member_ids) && member_ids.length) {
        for (const empId of member_ids) {
          await tx
            .insert(projectMembers)
            .values({ projectId: project.id, employeeId: parseInt(empId) }) // ✅ camelCase
            .onConflictDoNothing();
        }
      }

      // Always add leader as a member
      if (leader_id) {
        await tx
          .insert(projectMembers)
          .values({ projectId: project.id, employeeId: parseInt(leader_id) }) // ✅ camelCase
          .onConflictDoNothing();
      }

      return project;
    });

    result.members = await attachMembers(result.id);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("projectsController.create:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── UPDATE  PUT /api/projects/:id ────────────────────────────────────────────
const update = async (req, res) => {
  const { id } = req.params;
  const {
    name, description, client_id, leader_id,
    start_date, end_date, rate, rate_type, priority, status,
  } = req.body;

  try {
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user.company_id))); // ✅

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const payload = {};
    if (name        !== undefined) payload.name        = name.trim();
    if (description !== undefined) payload.description = description?.trim() || null;
    if (client_id   !== undefined) payload.clientId    = client_id  ? parseInt(client_id)  : null; // ✅
    if (leader_id   !== undefined) payload.leaderId    = leader_id  ? parseInt(leader_id)  : null; // ✅
    if (start_date  !== undefined) payload.startDate   = start_date || null;                       // ✅
    if (end_date    !== undefined) payload.endDate     = end_date   || null;                       // ✅
    if (rate        !== undefined) payload.rate        = rate       || null;
    if (rate_type   !== undefined && VALID_RATE_TYPES.includes(rate_type))  payload.rateType  = rate_type;  // ✅
    if (priority    !== undefined && VALID_PRIORITIES.includes(priority))   payload.priority  = priority;
    if (status      !== undefined && VALID_STATUSES.includes(status))       payload.status    = status;

    const [updated] = await db
      .update(projects)
      .set(payload)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user.company_id))) // ✅
      .returning();

    updated.members = await attachMembers(id);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("projectsController.update:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── DELETE  DELETE /api/projects/:id ─────────────────────────────────────────
const remove = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user.company_id))); // ✅

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user.company_id))); // ✅

    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    console.error("projectsController.remove:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── MEMBERS ───────────────────────────────────────────────────────────────────

const addMember = async (req, res) => {
  const { id } = req.params;
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({ success: false, message: "employee_id required" });
  }

  try {
    await db
      .insert(projectMembers)
      .values({ projectId: parseInt(id), employeeId: parseInt(employee_id) }) // ✅ camelCase
      .onConflictDoNothing();

    res.json({ success: true, message: "Member added" });
  } catch (err) {
    console.error("projectsController.addMember:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const removeMember = async (req, res) => {
  const { id, empId } = req.params;

  try {
    await db
      .delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId,  parseInt(id)),    // ✅ camelCase
          eq(projectMembers.employeeId, parseInt(empId)), // ✅ camelCase
        )
      );

    res.json({ success: true, message: "Member removed" });
  } catch (err) {
    console.error("projectsController.removeMember:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── TASKS ─────────────────────────────────────────────────────────────────────

const getTasks = async (req, res) => {
  const { id } = req.params;
  const { status } = req.query;

  try {
    const conditions = [
      eq(tasks.projectId, id),                           // ✅ camelCase
      eq(tasks.companyId, req.user.company_id),          // ✅
    ];

    if (status && VALID_TASK_STATUSES.includes(status)) {
      conditions.push(eq(tasks.status, status));
    }

    const rows = await db
      .select({
        ...tasks,
        assigned_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`, // ✅
      })
      .from(tasks)
      .leftJoin(employees, eq(employees.id, tasks.assignedTo))           // ✅ camelCase
      .where(and(...conditions))
      .orderBy(tasks.createdAt);                                          // ✅ camelCase

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("projectsController.getTasks:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createTask = async (req, res) => {
  const { id: project_id } = req.params;
  const { title, description, status = "todo", assigned_to, due_date } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: "Task title is required" });
  }

  try {
    const [task] = await db
      .insert(tasks)
      .values({
        projectId:   parseInt(project_id),                               // ✅ ensure integer
        title:       title.trim(),
        description: description?.trim() || null,
        status:      VALID_TASK_STATUSES.includes(status) ? status : "todo",
        assignedTo:  assigned_to ? parseInt(assigned_to) : null,         // ✅ empty string → null
        createdBy:   null,                                               // req.user.id is users.id not employees.id
        dueDate:     due_date?.trim() || null,                           // ✅ empty string → null
        companyId:   req.user.company_id,
      })
      .returning();

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error("projectsController.createTask:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, assigned_to, due_date } = req.body;

  try {
    const payload = {};
    if (title       !== undefined) payload.title       = title.trim();
    if (description !== undefined) payload.description = description?.trim() || null;
    if (status      !== undefined && VALID_TASK_STATUSES.includes(status)) payload.status = status;
    if (assigned_to !== undefined) payload.assignedTo = assigned_to ? parseInt(assigned_to) : null; // ✅ empty string → null
    if (due_date    !== undefined) payload.dueDate    = due_date?.trim() || null;                   // ✅ empty string → null

    const [updated] = await db
      .update(tasks)
      .set(payload)
      .where(and(eq(tasks.id, taskId), eq(tasks.companyId, req.user.company_id))) // ✅
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("projectsController.updateTask:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.companyId, req.user.company_id))); // ✅

    res.json({ success: true, message: "Task deleted" });
  } catch (err) {
    console.error("projectsController.deleteTask:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  getAll, getOne, create, update, remove,
  addMember, removeMember,
  getTasks, createTask, updateTask, deleteTask,
};