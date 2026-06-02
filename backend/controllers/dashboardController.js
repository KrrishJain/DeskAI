/**
 * controllers/dashboardController.js
 * Employee-specific dashboard data — all queries scoped to req.user.id.
 */

import { db } from '../db/index.js';
import { eq, and, ne, desc, sql, count, sum, countDistinct } from 'drizzle-orm';
import {
  employees, departments, designations, projectMembers, leaves,
  overtime, attendance, holidays, projects, resignations, promotions,
  salaries, trainings, clients, invoices, payments
} from '../db/schema/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/dashboard/employee
 * Returns all data needed by the Employee Dashboard in one round-trip.
 */
const getEmployeeDashboardData = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id; // users.id from JWT

    // ── 1. Resolve linked employee record ─────────────────────────
    const empRows = await db
      .select({
        employee_id: employees.id,
        first_name: employees.firstName,
        last_name: employees.lastName,
        picture: employees.picture,
        joining_date: employees.joiningDate,
        emp_code: employees.employeeId,
        department: departments.name,
        designation: designations.title,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(and(eq(employees.userId, userId), eq(employees.isActive, true)))
      .limit(1);

    // If the user is not linked to an employee record, fall back to user table data
    const emp = empRows[0] || null;
    const employeeId = emp?.employee_id;

    // ── 2. Stat counts ─────────────────────────────────────────────
    const statsPromise = employeeId
      ? Promise.all([
          db.select({ val: count() }).from(projectMembers).where(eq(projectMembers.employeeId, employeeId)),
          db.select({ val: count() }).from(leaves).where(and(eq(leaves.employeeId, employeeId), eq(leaves.status, 'pending'))),
          db.select({ val: sql`COALESCE(SUM(${leaves.days}), 0)` }).from(leaves).where(
            and(
              eq(leaves.employeeId, employeeId),
              eq(leaves.status, 'approved'),
              sql`EXTRACT(YEAR FROM ${leaves.startingAt}) = EXTRACT(YEAR FROM NOW())`
            )
          ),
          db.select({ val: count() }).from(overtime).where(
            and(
              eq(overtime.employeeId, employeeId),
              sql`EXTRACT(MONTH FROM ${overtime.overtimeDate}) = EXTRACT(MONTH FROM NOW())`
            )
          ),
        ]).then(([proj, pendLeaves, leaveDays, ot]) => ({
          rows: [{
            assigned_projects: proj[0].val,
            pending_leaves: pendLeaves[0].val,
            leave_taken_days: leaveDays[0].val,
            overtime_this_month: ot[0].val,
          }]
        }))
      : Promise.resolve({ rows: [{ assigned_projects: 0, pending_leaves: 0, leave_taken_days: 0, overtime_this_month: 0 }] });

    // ── 3. Recent attendance (last 5 logs) ────────────────────────
    const attendancePromise = employeeId
      ? db
          .select({
            id: attendance.id,
            clock_in: attendance.clockIn,
            clock_out: attendance.clockOut,
            work_hours: attendance.workHours,
            notes: attendance.notes,
          })
          .from(attendance)
          .where(eq(attendance.employeeId, employeeId))
          .orderBy(desc(attendance.clockIn))
          .limit(5)
          .then(rows => ({ rows }))
      : Promise.resolve({ rows: [] });

    // ── 4. Today's attendance status ──────────────────────────────
    const todayAttendancePromise = employeeId
      ? db
          .select({
            id: attendance.id,
            clock_in: attendance.clockIn,
            clock_out: attendance.clockOut,
            work_hours: attendance.workHours,
          })
          .from(attendance)
          .where(
            and(
              eq(attendance.employeeId, employeeId),
              sql`${attendance.clockIn}::date = CURRENT_DATE`
            )
          )
          .orderBy(desc(attendance.clockIn))
          .limit(1)
          .then(rows => ({ rows }))
      : Promise.resolve({ rows: [] });

    // ── 5. Upcoming holidays (next 3) ─────────────────────────────
    const holidaysPromise = db
      .select({
        id: holidays.id,
        name: holidays.name,
        holiday_date: holidays.holidayDate,
      })
      .from(holidays)
      .where(
        and(
          sql`${holidays.holidayDate} >= CURRENT_DATE`,
          eq(holidays.companyId, req.user.company_id)
        )
      )
      .orderBy(holidays.holidayDate)
      .limit(3)
      .then(rows => ({ rows }));

    // ── 6. My recent leaves ───────────────────────────────────────
    const myLeavesPromise = employeeId
      ? db
          .select({
            id: leaves.id,
            starting_at: leaves.startingAt,
            ending_on: leaves.endingOn,
            days: leaves.days,
            reason: leaves.reason,
            status: leaves.status,
          })
          .from(leaves)
          .where(eq(leaves.employeeId, employeeId))
          .orderBy(desc(leaves.createdAt))
          .limit(5)
          .then(rows => ({ rows }))
      : Promise.resolve({ rows: [] });

    // ── 7. My assigned projects ───────────────────────────────────
    const myProjectsPromise = employeeId
      ? db
          .select({
            id: projects.id,
            name: projects.name,
            status: projects.status,
            priority: projects.priority,
            start_date: projects.startDate,
            end_date: projects.endDate,
          })
          .from(projects)
          .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
          .where(eq(projectMembers.employeeId, employeeId))
          .orderBy(desc(projects.createdAt))
          .limit(5)
          .then(rows => ({ rows }))
      : Promise.resolve({ rows: [] });

    // ── Run all queries in parallel ────────────────────────────────
    const [statsRes, attendanceRes, todayRes, holidaysRes, myLeavesRes, myProjectsRes] =
      await Promise.all([statsPromise, attendancePromise, todayAttendancePromise, holidaysPromise, myLeavesPromise, myProjectsPromise]);

    return res.json({
      success: true,
      employee: emp,
      stats: statsRes.rows[0],
      todayAttendance: todayRes.rows[0] || null,
      recentAttendance: attendanceRes.rows,
      upcomingHolidays: holidaysRes.rows,
      myLeaves: myLeavesRes.rows,
      myProjects: myProjectsRes.rows,
    });
  } catch (error) {
    console.error('❌ Error in getEmployeeDashboardData:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch employee dashboard.' });
  }
});

/**
 * GET /api/dashboard/hr
 * Returns all data needed by the HR Dashboard.
 */
const getHRDashboardData = asyncHandler(async (req, res) => {
  try {
    const companyId = req.user.company_id;

    // ── 1. Stat counts ─────────────────────────────────────────────
    // For monthly_payroll we sum net_salary. If 'created_at' doesn't exist on payslips we just sum all or current month.
    // We'll just sum all for simplicity, or we can check the salaries table logic.
    const statsPromise = Promise.all([
      db.select({ val: count() }).from(leaves).where(and(eq(leaves.companyId, companyId), eq(leaves.status, 'pending'))),
      db.select({ val: sql`COALESCE(SUM(${salaries.netSalary}), 0)` }).from(salaries).where(
        and(
          eq(salaries.companyId, companyId),
          sql`EXTRACT(MONTH FROM ${salaries.createdAt}) = EXTRACT(MONTH FROM NOW())`
        )
      ),
      db.select({ val: count() }).from(trainings).where(and(eq(trainings.companyId, companyId), eq(trainings.status, 'active'))),
      db.select({ val: count() }).from(employees).where(and(eq(employees.companyId, companyId), eq(employees.isActive, true))),
      db.select({ val: countDistinct(attendance.employeeId) })
        .from(attendance)
        .innerJoin(employees, eq(attendance.employeeId, employees.id))
        .where(
          and(
            eq(employees.companyId, companyId),
            sql`${attendance.clockIn}::date = CURRENT_DATE`
          )
        ),
    ]).then(([pendLeaves, payroll, activeTrainings, activeEmps, clockedIn]) => ({
      rows: [{
        pending_leaves: pendLeaves[0].val,
        monthly_payroll: payroll[0].val,
        active_trainings: activeTrainings[0].val,
        active_employees: activeEmps[0].val,
        clocked_in_today: clockedIn[0].val,
      }]
    }));

    // ── 2. Action Center: Pending Resignations ────────────────────────
    const resigPromise = db
      .select({
        id: resignations.id,
        first_name: employees.firstName,
        last_name: employees.lastName,
        resignation_date: resignations.resignationDate,
        status: resignations.status,
        created_at: resignations.createdAt,
      })
      .from(resignations)
      .innerJoin(employees, eq(resignations.employeeId, employees.id))
      .where(and(eq(resignations.companyId, companyId), eq(resignations.status, 'pending')))
      .orderBy(desc(resignations.createdAt))
      .limit(5)
      .then(rows => ({ rows }));

    // ── 3. Action Center: Pending Promotions ────────────────────────
    const promPromise = db
      .select({
        id: promotions.id,
        first_name: employees.firstName,
        last_name: employees.lastName,
        new_designation: designations.title,
        status: promotions.status,
        created_at: promotions.createdAt,
      })
      .from(promotions)
      .innerJoin(employees, eq(promotions.employeeId, employees.id))
      .innerJoin(designations, eq(promotions.promotionDesignation, designations.id))
      .where(and(eq(promotions.companyId, companyId), eq(promotions.status, 'pending')))
      .orderBy(desc(promotions.createdAt))
      .limit(5)
      .then(rows => ({ rows }));

    const [statsRes, resigRes, promRes] = await Promise.all([statsPromise, resigPromise, promPromise]);

    const s = statsRes.rows[0] || {};
    const active = parseInt(s.active_employees) || 0;
    const clocked = parseInt(s.clocked_in_today) || 0;
    const attendancePct = active > 0 ? Math.round((clocked / active) * 100) : 0;

    return res.json({
      success: true,
      stats: {
        pendingLeaves: parseInt(s.pending_leaves) || 0,
        monthlyPayrollCost: parseFloat(s.monthly_payroll) || 0,
        activeTrainings: parseInt(s.active_trainings) || 0,
        attendancePct,
      },
      pendingResignations: resigRes.rows || [],
      pendingPromotions: promRes.rows || [],
    });
  } catch (error) {
    console.error('❌ Error in getHRDashboardData:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch HR dashboard.' });
  }
});

/**
 * GET /api/dashboard/client
 * Returns all data needed by the Client Dashboard.
 */
const getClientDashboardData = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;

    // 1. Resolve client record
    const clientRows = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.userId, userId), eq(clients.companyId, companyId)))
      .limit(1);

    if (!clientRows.length) {
      return res.json({
        success: true,
        data: {
          activeProjects: 0,
          outstandingInvoices: 0,
          lastPayment: 0,
          projects: [],
          invoices: [],
          updates: [],
        },
      });
    }

    const clientId = clientRows[0].id;

    // 2. Stats
    const statsPromise = Promise.all([
      db.select({ val: count() }).from(projects).where(
        and(
          eq(projects.clientId, clientId),
          ne(projects.status, 'Completed'),
          eq(projects.companyId, companyId)
        )
      ),
      db.select({ val: sql`COALESCE(SUM(${invoices.grandTotal}), 0)` }).from(invoices).where(
        and(
          eq(invoices.clientId, clientId),
          ne(invoices.status, 'Paid'),
          eq(invoices.companyId, companyId)
        )
      ),
    ]).then(([activeProj, outstandingInv]) => ({
      rows: [{
        active_projects: activeProj[0].val,
        outstanding_invoices: outstandingInv[0].val,
      }]
    }));

    // 3. Last payment
    const lastPaymentPromise = db
      .select({ amount: payments.amount })
      .from(payments)
      .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
      .where(and(eq(invoices.clientId, clientId), eq(payments.companyId, companyId)))
      .orderBy(desc(payments.createdAt))
      .limit(1)
      .then(rows => ({ rows }));

    // 4. Projects list
    const projectsPromise = db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        progress: sql`0`.as('progress'),
        dueDate: projects.endDate,
      })
      .from(projects)
      .where(and(eq(projects.clientId, clientId), eq(projects.companyId, companyId)))
      .orderBy(desc(projects.createdAt))
      .limit(5)
      .then(rows => ({ rows }));

    // 5. Invoices list
    const invoicesPromise = db
      .select({
        id: invoices.invoiceNumber,
        amount: invoices.grandTotal,
        status: invoices.status,
        date: invoices.invoiceDate,
      })
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), eq(invoices.companyId, companyId)))
      .orderBy(desc(invoices.createdAt))
      .limit(5)
      .then(rows => ({ rows }));

    const [statsRes, lastPaymentRes, projectsRes, invoicesRes] = await Promise.all([
      statsPromise, lastPaymentPromise, projectsPromise, invoicesPromise,
    ]);

    const s = statsRes.rows[0] || {};
    const actvProj = parseInt(s.active_projects) || 0;
    const outInv = parseFloat(s.outstanding_invoices) || 0;
    const lastP = parseFloat(lastPaymentRes.rows[0]?.amount) || 0;

    return res.json({
      success: true,
      data: {
        activeProjects: actvProj,
        outstandingInvoices: outInv,
        lastPayment: lastP,
        projects: projectsRes.rows || [],
        invoices: invoicesRes.rows || [],
        updates: [], // Mocked updates since no updates table exists
      },
    });
  } catch (error) {
    console.error('❌ Error in getClientDashboardData:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch client dashboard.' });
  }
});

export { getEmployeeDashboardData, getHRDashboardData, getClientDashboardData };