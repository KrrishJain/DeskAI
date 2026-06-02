import { db } from '../db/index.js';
import { clients, users, projects, employees, userRoles } from '../db/schema/index.js';
import { eq, and, or, sql, count } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/* ───────── HELPERS ───────── */

async function generateUsername(firstName, lastName) {
  const base = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`.replace(/\s+/g, '');
  let username = base;
  let attempt = 1;

  while (true) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`)
      .limit(1);

    if (!rows.length) return username;
    attempt++;
    username = `${base}.${attempt}`;
  }
}

const generateClientId = () => 'CLT-' + Math.floor(100000 + Math.random() * 900000);

// ✅ Only pick the columns that are safe to update, mapped to camelCase for Drizzle
const buildUpdatePayload = (body) => {
  const payload = {};

  if (body.first_name  !== undefined) payload.firstName  = body.first_name.trim();
  if (body.last_name   !== undefined) payload.lastName   = body.last_name.trim();
  if (body.username    !== undefined) payload.username   = body.username.trim();
  if (body.email       !== undefined) payload.email      = body.email.trim();
  if (body.phone       !== undefined) payload.phone      = body.phone || null;
  if (body.company     !== undefined) payload.company    = body.company.trim();
  if (body.address     !== undefined) payload.address    = body.address || null;

  if (body.company_bank_name    !== undefined) payload.companyBankName    = body.company_bank_name || null;
  if (body.swift_code           !== undefined) payload.swiftCode          = body.swift_code || null;
  if (body.account_holder_name  !== undefined) payload.accountHolderName  = body.account_holder_name || null;
  if (body.vat_number           !== undefined) payload.vatNumber          = body.vat_number || null;

  return payload;
};

/* ───────── GET ALL ───────── */

const getAll = async (req, res) => {
  try {
    const rows = await db
      .select({
        ...clients,
        project_count: count(projects.id).mapWith(Number),
      })
      .from(clients)
      .leftJoin(projects, eq(projects.clientId, clients.id))
      .where(eq(clients.companyId, req.user.company_id))
      .groupBy(clients.id)
      .orderBy(sql`${clients.createdAt} DESC`);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('❌ Error in getAll:', err.message);
    res.status(500).json({ success: false });
  }
};

/* ───────── GET ONE ───────── */

const getOne = async (req, res) => {
  try {
    const clientRows = await db
      .select()
      .from(clients)
      .where(
        and(
          eq(clients.id, req.params.id),
          eq(clients.companyId, req.user.company_id) // ✅
        )
      );

    if (!clientRows.length)
      return res.status(404).json({ success: false });

    const projectRows = await db
      .select({
        ...projects,
        leader_name: sql`${employees.firstName} || ' ' || ${employees.lastName}`,
      })
      .from(projects)
      .leftJoin(employees, eq(employees.id, projects.leaderId))
      .where(
        and(
          eq(projects.clientId, req.params.id),
          eq(projects.companyId, req.user.company_id) // ✅
        )
      );

    res.json({
      success: true,
      data: { client: clientRows[0], projects: projectRows },
    });
  } catch (err) {
    console.error('❌ Error in getOne:', err.message);
    res.status(500).json({ success: false });
  }
};

/* ───────── CREATE ───────── */

const create = async (req, res) => {
  try {
    const {
      first_name, last_name, username: providedUsername,
      email, password, phone, company, address,
      company_bank_name, swift_code, account_holder_name, vat_number,
    } = req.body;

    if (!first_name || !last_name || !email || !password || !company) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const result = await db.transaction(async (tx) => {
      const username =
        providedUsername?.trim() ||
        (await generateUsername(first_name, last_name));

      const [dupClient] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            or(eq(clients.email, email.trim()), eq(clients.username, username)),
            eq(clients.companyId, req.user.company_id)
          )
        )
        .limit(1);

      const [dupUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(or(eq(users.email, email.trim()), eq(users.username, username)))
        .limit(1);

      if (dupClient || dupUser) throw new Error('duplicate');

      const password_hash = await bcrypt.hash(password, 10);
      const clientId = generateClientId();

      const [role] = await tx
        .select({ id: userRoles.id })
        .from(userRoles)
        .where(eq(userRoles.role, 'client'))
        .limit(1);

      const [newUser] = await tx
        .insert(users)
        .values({
          firstName: first_name.trim(),
          lastName: last_name.trim(),
          username,
          email: email.trim(),
          passwordHash: password_hash,
          phone: phone || null,
          roleId: role?.id,
          companyId: req.user.company_id,
        })
        .returning({ id: users.id });

      const [newClient] = await tx
        .insert(clients)
        .values({
          clientId,
          firstName: first_name.trim(),
          lastName: last_name.trim(),
          username,
          email: email.trim(),
          passwordHash: password_hash,
          phone: phone || null,
          company: company.trim(),
          address: address || null,
          companyId: req.user.company_id,
          companyBankName: company_bank_name || null,
          swiftCode: swift_code || null,
          accountHolderName: account_holder_name || null,
          vatNumber: vat_number || null,
          userId: newUser.id,
        })
        .returning();

      return newClient;
    });

    res.status(201).json({ success: true, data: result });

  } catch (err) {
    console.error('❌ Error in create:', err.message);
    if (err.message === 'duplicate') {
      return res.status(409).json({ success: false, message: 'Email or username already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create client' });
  }
};

/* ───────── UPDATE ───────── */

const update = async (req, res) => {
  try {
    const payload = buildUpdatePayload(req.body); // ✅ safe camelCase payload, no timestamps

    if (!Object.keys(payload).length) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const rows = await db
      .update(clients)
      .set(payload)
      .where(
        and(
          eq(clients.id, req.params.id),
          eq(clients.companyId, req.user.company_id) // ✅
        )
      )
      .returning();

    if (!rows.length)
      return res.status(404).json({ success: false });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('❌ Error in update:', err.message);
    res.status(500).json({ success: false });
  }
};

/* ───────── DELETE ───────── */

const remove = async (req, res) => {
  try {
    const rows = await db
      .delete(clients)
      .where(
        and(
          eq(clients.id, req.params.id),
          eq(clients.companyId, req.user.company_id) // ✅
        )
      )
      .returning();

    if (!rows.length)
      return res.status(404).json({ success: false });

    res.json({ success: true });

  } catch (err) {
    console.error('❌ Error in remove:', err.message);
    res.status(500).json({ success: false });
  }
};

export { getAll, getOne, create, update, remove };