import { db } from "../db/index.js";
import {
  users,
  userRoles,
  employees,
  tickets,
  ticketParticipants,
  ticketMessages
} from "../db/schema/index.js";
import { eq, and, or, asc, desc, sql, exists } from "drizzle-orm";

export const getCompanyEmployees = async (req, res) => {
  try {
    console.log("👉 getCompanyEmployees called");

    const companyId = req.user.companyId;
    console.log("Company ID:", companyId);

    if (!companyId) {
      console.log("❌ No company_id in req.user");
      return res.status(400).json({
        success: false,
        message: "Company not found in user",
      });
    }

    const rows = await db
      .select({
        id: users.id,
        employee_id: employees.employeeId,
        first_name: users.firstName,
        last_name: users.lastName,
        email: users.email,
        full_name: sql`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.id, users.roleId))
      .leftJoin(
        employees,
        and(
          eq(employees.userId, users.id),
          eq(employees.companyId, users.companyId)
        )
      )
      .where(
        and(
          eq(users.companyId, companyId),
          eq(users.isActive, true),
          eq(userRoles.role, "employee")
        )
      )
      .orderBy(asc(users.firstName), asc(users.lastName));

    console.log("✅ Employees fetched:", rows.length);

    return res.json({
      success: true,
      data: rows,
    });

  } catch (err) {
    console.error("❌ Error in getCompanyEmployees:");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* GET ALL TICKETS */
export const getTickets = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const conditions = [
      eq(tickets.companyId, companyId),
      or(
        eq(tickets.createdBy, userId),
        eq(tickets.assignedTo, userId),
        exists(
          db.select().from(ticketParticipants).where(
            and(
              eq(ticketParticipants.ticketId, tickets.id),
              eq(ticketParticipants.companyId, tickets.companyId),
              eq(ticketParticipants.employeeId, userId)
            )
          )
        )
      )
    ];

    if (status) conditions.push(eq(tickets.status, status));
    if (priority) conditions.push(eq(tickets.priority, priority));

    const rows = await db
      .select({
        ...tickets,
        created_by_name: sql`cu.first_name || ' ' || cu.last_name`,
        assigned_to_name: sql`au.first_name || ' ' || au.last_name`
      })
      .from(tickets)
      .leftJoin(
        sql`users cu`,
        sql`cu.id = ${tickets.createdBy} AND cu.company_id = ${tickets.companyId}`
      )
      .leftJoin(
        sql`users au`,
        sql`au.id = ${tickets.assignedTo} AND au.company_id = ${tickets.companyId}`
      )
      .where(and(...conditions))
      .orderBy(desc(tickets.createdAt));

    return res.json({ success: true, data: rows });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

/* GET BY ID */
export const getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;
    const id = parseInt(req.params.id);

    const rows = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.id, id),
          eq(tickets.companyId, companyId),
          or(
            eq(tickets.createdBy, userId),
            eq(tickets.assignedTo, userId),
            exists(
              db.select().from(ticketParticipants).where(
                and(
                  eq(ticketParticipants.ticketId, tickets.id),
                  eq(ticketParticipants.companyId, tickets.companyId),
                  eq(ticketParticipants.employeeId, userId)
                )
              )
            )
          )
        )
      );

    if (!rows.length) return res.status(404).json({ success: false });

    return res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

/* CREATE */
export const createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    const { subject, description, priority = "medium", assigned_to } = req.body;

    const rows = await db.insert(tickets).values({
      companyId,
      ticketNo: "TKT-" + Math.random().toString(36).slice(2, 7).toUpperCase(),
      subject,
      description,
      priority,
      status: "open",
      createdBy: userId,
      assignedTo: assigned_to || null
    }).returning();

    return res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

/* UPDATE */
export const update = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const rows = await db
      .update(tickets)
      .set(req.body)
      .where(
        and(
          eq(tickets.id, parseInt(req.params.id)),
          eq(tickets.companyId, companyId)
        )
      )
      .returning();

    if (!rows.length) return res.status(404).json({ success: false });

    return res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

/* STATUS */
export const updateTicketStatus = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const rows = await db
      .update(tickets)
      .set({ status: req.body.status })
      .where(
        and(
          eq(tickets.id, parseInt(req.params.id)),
          eq(tickets.companyId, companyId)
        )
      )
      .returning();

    if (!rows.length) return res.status(404).json({ success: false });

    return res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

/* DELETE */
export const remove = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const rows = await db
      .delete(tickets)
      .where(
        and(
          eq(tickets.id, parseInt(req.params.id)),
          eq(tickets.companyId, companyId)
        )
      )
      .returning();

    if (!rows.length) return res.status(404).json({ success: false });

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

/* GET MESSAGES */
export const getMessages = async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const rows = await db
      .select({
        ...ticketMessages,
        sender_name: sql`${users.first_name} || ' ' || ${users.last_name}`
      })
      .from(ticketMessages)
      .innerJoin(
        users,
        and(
          eq(users.id, ticketMessages.senderId),
          eq(users.companyId, ticketMessages.companyId)
        )
      )
      .where(
        and(
          eq(ticketMessages.ticketId, parseInt(req.params.ticketId)),
          eq(ticketMessages.companyId, companyId)
        )
      )
      .orderBy(asc(ticketMessages.createdAt));

    return res.json({ success: true, data: rows });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};

/* ADD MESSAGE */
export const addMessage = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const userId = req.user.id;

    const rows = await db.insert(ticketMessages).values({
      companyId,
      ticketId: parseInt(req.params.ticketId),
      senderId: userId,
      message: req.body.message
    }).returning();

    return res.json({ success: true, data: rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
};