/**
 * controllers/paymentsController.js
 * Records payments against invoices.
 * After each payment, recalculates invoice status:
 *   paid_amount >= grand_total → 'paid'
 *   0 < paid_amount < grand_total → 'partially_paid'
 */

import { db } from "../db/index.js";
import { payments, invoices, clients } from "../db/schema/index.js";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { asyncHandler } from "../middleware/errorHandler.js";

// GET /api/payments
const getAll = asyncHandler(async (req, res) => {
  try {
    const { invoice_id, from, to, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];

    if (req.user?.company_id) {
      conditions.push(eq(payments.companyId, req.user.company_id));
    }

    if (invoice_id) conditions.push(eq(payments.invoiceId, parseInt(invoice_id)));
    if (from) conditions.push(gte(payments.paidDate, from));
    if (to) conditions.push(lte(payments.paidDate, to));

    const whereClause =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    const [{ count }] = await db
      .select({ count: sql`COUNT(*)` })
      .from(payments)
      .where(whereClause);

    const total = parseInt(count);

    const rows = await db
      .select({
        id: payments.id,
        payment_type: payments.paymentType,
        paid_date: payments.paidDate,
        paid_amount: payments.paidAmount,
        notes: payments.notes,
        created_at: payments.createdAt,
        invoice_number: invoices.invoiceNumber,
        invoice_total: invoices.grandTotal,
        invoice_status: invoices.status,
        client_name: sql`${clients.firstName} || ' ' || ${clients.lastName}`,
        client_company: clients.company,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(whereClause)
      .orderBy(desc(payments.paidDate), desc(payments.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    res.json({
      success: true,
      data: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("❌ Error in getAll:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch payments." });
  }
});

// POST /api/payments
const create = asyncHandler(async (req, res) => {
  try {
    const { invoice_id, payment_type, paid_date, paid_amount, notes } = req.body;

    if (!invoice_id || !payment_type || !paid_date || !paid_amount) {
      return res.status(400).json({
        success: false,
        message: "invoice_id, payment_type, paid_date and paid_amount are required",
      });
    }
    if (parseFloat(paid_amount) <= 0) {
      return res.status(400).json({ success: false, message: "paid_amount must be positive" });
    }

    const result = await db.transaction(async (tx) => {
      // ✅ fetch invoice using camelCase
      const invRows = await tx
        .select({
          id: invoices.id,
          grandTotal: invoices.grandTotal,
          status: invoices.status,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, parseInt(invoice_id)),
            eq(invoices.companyId, req.user.company_id)  // ✅
          )
        );

      if (!invRows.length) throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
      if (invRows[0].status === "cancelled") {
        throw Object.assign(new Error("Cannot add payment to a cancelled invoice"), { statusCode: 400 });
      }

      // ✅ insert using camelCase
      const payRows = await tx
        .insert(payments)
        .values({
          invoiceId: parseInt(invoice_id),     // ✅
          paymentType: payment_type,           // ✅
          paidDate: paid_date,                 // ✅
          paidAmount: parseFloat(paid_amount), // ✅
          notes: notes || null,
          recordedBy: req.user.id,             // ✅
          companyId: req.user.company_id,      // ✅
        })
        .returning();

      // ✅ sum query using camelCase
      const sumRows = await tx
        .select({ totalPaid: sql`COALESCE(SUM(${payments.paidAmount}), 0)` })
        .from(payments)
        .where(
          and(
            eq(payments.invoiceId, parseInt(invoice_id)),  // ✅
            eq(payments.companyId, req.user.company_id)    // ✅
          )
        );

      const totalPaid = parseFloat(sumRows[0].totalPaid);
      const grandTotal = parseFloat(invRows[0].grandTotal); // ✅

      let newStatus = "partially_paid";
      if (totalPaid >= grandTotal) newStatus = "paid";

      // ✅ update invoice using camelCase
      await tx
        .update(invoices)
        .set({ status: newStatus })
        .where(
          and(
            eq(invoices.id, parseInt(invoice_id)),
            eq(invoices.companyId, req.user.company_id)  // ✅
          )
        );

      return { payment: payRows[0], invoice_status: newStatus, total_paid: totalPaid };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("❌ Error in create:", error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message || "Failed to create payment." });
  }
});

// DELETE /api/payments/:id
const remove = asyncHandler(async (req, res) => {
  try {
    await db.transaction(async (tx) => {
      // ✅ delete using camelCase
      const payRows = await tx
        .delete(payments)
        .where(
          and(
            eq(payments.id, parseInt(req.params.id)),
            eq(payments.companyId, req.user.company_id)  // ✅
          )
        )
        .returning({ invoiceId: payments.invoiceId });   // ✅

      if (!payRows.length) throw Object.assign(new Error("Payment not found"), { statusCode: 404 });

      const invoiceId = payRows[0].invoiceId;  // ✅

      // ✅ fetch invoice using camelCase
      const invRows = await tx
        .select({ grandTotal: invoices.grandTotal })     // ✅
        .from(invoices)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.companyId, req.user.company_id)  // ✅
          )
        );

      // ✅ sum remaining payments using camelCase
      const sumRows = await tx
        .select({ totalPaid: sql`COALESCE(SUM(${payments.paidAmount}), 0)` })  // ✅
        .from(payments)
        .where(
          and(
            eq(payments.invoiceId, invoiceId),           // ✅
            eq(payments.companyId, req.user.company_id)  // ✅
          )
        );

      const totalPaid = parseFloat(sumRows[0].totalPaid);    // ✅
      const grandTotal = parseFloat(invRows[0].grandTotal);  // ✅

      let newStatus = "sent";
      if (totalPaid > 0 && totalPaid < grandTotal) newStatus = "partially_paid";
      else if (totalPaid >= grandTotal) newStatus = "paid";

      await tx
        .update(invoices)
        .set({ status: newStatus })
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.companyId, req.user.company_id)  // ✅
          )
        );
    });

    res.json({ success: true, message: "Payment deleted and invoice status updated" });
  } catch (error) {
    console.error("❌ Error in remove:", error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error.message || "Failed to delete payment." });
  }
});

export { getAll, create, remove };