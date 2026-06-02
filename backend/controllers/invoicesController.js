/**
 * controllers/invoicesController.js - FIXED getById
 */

import { db } from '../db/index.js';
import { eq, and, gte, lte, sql, count } from 'drizzle-orm';
import { invoices, invoiceItems, clients, taxes, payments, users } from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

function calcTotals(items, taxPct, discountPct) {
  const subtotal = items.reduce((s, i) => s + parseFloat(i.unit_cost) * parseFloat(i.quantity), 0);
  const taxAmount = subtotal * (parseFloat(taxPct || 0) / 100);
  const discount = (subtotal + taxAmount) * (parseFloat(discountPct || 0) / 100);
  const grandTotal = subtotal + taxAmount - discount;
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax_amount: parseFloat(taxAmount.toFixed(2)),
    grand_total: parseFloat(grandTotal.toFixed(2)),
  };
}

const getAll = asyncHandler(async (req, res) => {
  try {
    const { status, client_id, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [eq(invoices.companyId, req.user.company_id)];
    if (status)    conditions.push(eq(invoices.status, status));
    if (client_id) conditions.push(eq(invoices.clientId, client_id));
    if (from)      conditions.push(gte(invoices.invoiceDate, from));
    if (to)        conditions.push(lte(invoices.invoiceDate, to));

    const whereClause = and(...conditions);

    const [countRes, rows] = await Promise.all([
      db.select({ count: count() }).from(invoices).where(whereClause),
      db.select({
          id:             invoices.id,
          invoice_number: invoices.invoiceNumber,
          invoice_date:   invoices.invoiceDate,
          due_date:       invoices.dueDate,
          subtotal:       invoices.subtotal,
          tax_amount:     invoices.taxAmount,
          discount_pct:   invoices.discountPct,
          grand_total:    invoices.grandTotal,
          status:         invoices.status,
          created_at:     invoices.createdAt,
          client_id:      clients.id,
          client_name:    sql`${clients.firstName} || ' ' || ${clients.lastName}`,
          client_company: clients.company,
          tax_name:       taxes.name,
          tax_percentage: taxes.percentage,
        })
        .from(invoices)
        .innerJoin(clients, eq(clients.id, invoices.clientId))
        .leftJoin(taxes, eq(taxes.id, invoices.taxId))
        .where(whereClause)
        .orderBy(sql`${invoices.createdAt} DESC`)
        .limit(parseInt(limit))
        .offset(offset),
    ]);

    res.json({ success: true, data: rows, total: parseInt(countRes[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('❌ Error in getAll:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices.' });
  }
});

const getById = asyncHandler(async (req, res) => {
  try {
    const inv = await db
      .select({
        id:                     invoices.id,
        invoiceNumber:          invoices.invoiceNumber,
        clientId:               invoices.clientId,
        projectId:              invoices.projectId,
        taxId:                  invoices.taxId,
        clientAddress:          invoices.clientAddress,
        billingAddress:         invoices.billingAddress,
        invoiceDate:            invoices.invoiceDate,
        dueDate:                invoices.dueDate,
        subtotal:               invoices.subtotal,
        taxAmount:              invoices.taxAmount,
        discountPct:            invoices.discountPct,
        grandTotal:             invoices.grandTotal,
        status:                 invoices.status,
        otherInfo:              invoices.otherInfo,
        createdAt:              invoices.createdAt,
        client_name:            sql`${clients.firstName} || ' ' || ${clients.lastName}`,
        client_company:         clients.company,
        client_email:           clients.email,
        client_address_default: clients.address,
        tax_name:               taxes.name,
        tax_percentage:         taxes.percentage,
      })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .leftJoin(taxes, eq(taxes.id, invoices.taxId))
      .where(and(eq(invoices.id, req.params.id), eq(invoices.companyId, req.user.company_id)));

    if (!inv.length) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const [items, paymentsRows] = await Promise.all([
      db.select({
          id:          invoiceItems.id,
          item_name:   invoiceItems.itemName,
          description: invoiceItems.description,
          unit_cost:   invoiceItems.unitCost,
          quantity:    invoiceItems.quantity,
          sort_order:  invoiceItems.sortOrder,
        })
        .from(invoiceItems)
        .where(and(eq(invoiceItems.invoiceId, req.params.id), eq(invoiceItems.companyId, req.user.company_id)))
        .orderBy(invoiceItems.sortOrder, invoiceItems.id),

      db.select({
          id:               payments.id,
          payment_type:     payments.paymentType,
          paid_date:        payments.paidDate,
          paid_amount:      payments.paidAmount,
          notes:            payments.notes,
          recorded_by_name: sql`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(payments)
        .leftJoin(users, eq(users.id, payments.recordedBy))
        .where(and(eq(payments.invoiceId, req.params.id), eq(payments.companyId, req.user.company_id)))
        .orderBy(sql`${payments.paidDate} DESC`),
    ]);

    const totalPaid = paymentsRows.reduce((s, p) => s + parseFloat(p.paid_amount), 0);

    res.json({
      success: true,
      data: {
        ...inv[0],
        items,
        payments: paymentsRows,
        total_paid:  parseFloat(totalPaid.toFixed(2)),
        balance_due: parseFloat((parseFloat(inv[0].grandTotal) - totalPaid).toFixed(2)),
      },
    });
  } catch (error) {
    console.error('❌ Error in getById:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch invoice details.' });
  }
});

const create = asyncHandler(async (req, res) => {
  try {
    const {
      client_id, project_id, tax_id,
      client_address, billing_address,
      invoice_date, due_date,
      discount_pct = 0, status = 'draft',
      other_info, items = [],
    } = req.body;

    if (!client_id || !invoice_date || !due_date)
      return res.status(400).json({ success: false, message: 'client_id, invoice_date and due_date are required' });
    if (!items.length)
      return res.status(400).json({ success: false, message: 'At least one line item is required' });

    let taxPct = 0;
    if (tax_id) {
      const taxRes = await db.select({ percentage: taxes.percentage }).from(taxes)
        .where(and(eq(taxes.id, tax_id), eq(taxes.status, 'active'), eq(taxes.companyId, req.user.company_id)));
      if (taxRes.length) taxPct = parseFloat(taxRes[0].percentage);
    }

    const { subtotal, tax_amount, grand_total } = calcTotals(items, taxPct, discount_pct);
    const invNumRes = await db.execute(sql`SELECT next_invoice_number() AS num`);
    const invNum = invNumRes.rows[0].num;

    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx.insert(invoices).values({
        invoiceNumber:  invNum,
        clientId:       client_id,
        projectId:      project_id || null,
        taxId:          tax_id || null,
        clientAddress:  client_address || null,
        billingAddress: billing_address || null,
        invoiceDate:    invoice_date,
        dueDate:        due_date,
        subtotal,
        taxAmount:      tax_amount,
        discountPct:    parseFloat(discount_pct),
        grandTotal:     grand_total,
        status,
        otherInfo:      other_info || null,
        createdBy:      req.user.id,
        companyId:      req.user.company_id,
      }).returning();

      await tx.insert(invoiceItems).values(
        items.map((it, i) => ({
          invoiceId:   invoice.id,
          itemName:    it.item_name,
          description: it.description || null,
          unitCost:    parseFloat(it.unit_cost),
          quantity:    parseFloat(it.quantity),
          sortOrder:   i,
          companyId:   req.user.company_id,
        }))
      );
      return invoice;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error in create:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create invoice.' });
  }
});

const update = asyncHandler(async (req, res) => {
  try {
    const {
      client_id, project_id, tax_id,
      client_address, billing_address,
      invoice_date, due_date,
      discount_pct, status, other_info, items,
    } = req.body;

    let totals = null;
    if (items) {
      let taxPct = 0;
      if (tax_id) {
        const taxRes = await db.select({ percentage: taxes.percentage }).from(taxes)
          .where(and(eq(taxes.id, tax_id), eq(taxes.companyId, req.user.company_id)));
        if (taxRes.length) taxPct = parseFloat(taxRes[0].percentage);
      }
      totals = calcTotals(items, taxPct, discount_pct || 0);
    }

    const result = await db.transaction(async (tx) => {
      const updateData = {};
      if (client_id !== undefined)      updateData.clientId        = client_id;
      if (project_id !== undefined)     updateData.projectId       = project_id ?? null;
      if (tax_id !== undefined)         updateData.taxId           = tax_id ?? null;
      if (client_address !== undefined) updateData.clientAddress   = client_address;
      if (billing_address !== undefined) updateData.billingAddress = billing_address;
      if (invoice_date !== undefined)   updateData.invoiceDate     = invoice_date;
      if (due_date !== undefined)       updateData.dueDate         = due_date;
      if (discount_pct != null)         updateData.discountPct     = parseFloat(discount_pct);
      if (status !== undefined)         updateData.status          = status;
      if (other_info !== undefined)     updateData.otherInfo       = other_info;
      if (totals) {
        updateData.subtotal   = totals.subtotal;
        updateData.taxAmount  = totals.tax_amount;
        updateData.grandTotal = totals.grand_total;
      }

      let inv = null;
      if (Object.keys(updateData).length) {
        const rows = await tx.update(invoices).set(updateData)
          .where(and(eq(invoices.id, req.params.id), eq(invoices.companyId, req.user.company_id)))
          .returning();
        if (!rows.length) throw Object.assign(new Error('Invoice not found'), { statusCode: 404 });
        inv = rows[0];
      }

      if (items) {
        await tx.delete(invoiceItems)
          .where(and(eq(invoiceItems.invoiceId, req.params.id), eq(invoiceItems.companyId, req.user.company_id)));
        await tx.insert(invoiceItems).values(
          items.map((it, i) => ({
            invoiceId:   req.params.id,
            itemName:    it.item_name,
            description: it.description || null,
            unitCost:    parseFloat(it.unit_cost),
            quantity:    parseFloat(it.quantity),
            sortOrder:   i,
            companyId:   req.user.company_id,
          }))
        );
      }
      return inv;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error in update:', error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message || 'Failed to update invoice.' });
  }
});

const remove = asyncHandler(async (req, res) => {
  try {
    const rows = await db.delete(invoices)
      .where(and(eq(invoices.id, req.params.id), eq(invoices.companyId, req.user.company_id)))
      .returning({ id: invoices.id, invoice_number: invoices.invoiceNumber });
    if (!rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: `Invoice ${rows[0].invoice_number} deleted` });
  } catch (error) {
    console.error('❌ Error in remove:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete invoice.' });
  }
});

const updateStatus = asyncHandler(async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['draft', 'sent', 'paid', 'partially_paid', 'cancelled'];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: `status must be one of: ${valid.join(', ')}` });
    const rows = await db.update(invoices).set({ status })
      .where(and(eq(invoices.id, req.params.id), eq(invoices.companyId, req.user.company_id)))
      .returning();
    if (!rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ Error in updateStatus:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update invoice status.' });
  }
});

export { getAll, getById, create, update, remove, updateStatus };