/**
 * App.jsx  — UPDATED
 * Real pages for all routes including Profile and Settings.
 * Wrapped with SettingsProvider for company-wide settings context.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Auth
import Login from './pages/Login';
import SubscriptionExpired from './pages/SubscriptionExpired';

import Dashboard from './pages/Dashboard';
import HRDashboard from './pages/HRDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Employees from './pages/Employees';
import EmployeeProfileView from './pages/EmployeeProfileView';
import Leaves from './pages/Leaves';
import Assets from './pages/Assets';
import Tickets from './pages/Tickets';
import TicketDetails from './pages/TicketDetails';
import JobsPage from './pages/Jobs';
import JobFormPage from './pages/JobFormPage';
import CandidatesPage from './pages/Candidates';
import ResumeUpload from './pages/ResumeUpload';

// HR Admin
import Departments from './pages/Departments';
import Designations from './pages/Designations';
import Holidays from './pages/Holidays';
import Overtime from './pages/Overtime';

// Clients & Projects
import Clients from './pages/Clients';
import Projects from './pages/Projects';

// Accounts
import Invoices from './pages/accounts/Invoices';
import CreateInvoice from './pages/accounts/CreateInvoice';
import Payments from './pages/accounts/Payments';
import Expenses from './pages/accounts/Expenses';
import ProvidentFund from './pages/accounts/ProvidentFund';
import Taxes from './pages/accounts/Taxes';

// Payroll (Payslip is a sub-view inside Payroll.jsx)
import Payroll from './pages/Payroll';

// Goals
import Goals from './pages/Goals';
import GoalTypes from './pages/GoalTypes';

// Training
import Training from './pages/Training';
import Trainers from './pages/Trainers';
import TrainingType from './pages/TrainingType';

// HR Lifecycle
import Promotions from './pages/Promotions';
import Resignations from './pages/Resignations';

// Attendance / Timesheet
import Timesheet from './pages/Timesheet';

// Profile & Settings
import Profile from './pages/Profile';
import Settings from './pages/Settings';

// ── Super Administration (God-Mode) ───────────────────────────────────────────
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// ── Administration (admin-only) ───────────────────────────────────────────────
import AdminUsers from './pages/AdminUsers';
import Documents from './pages/Documents';
import AuditLogs from './pages/AuditLogs';
import Chatbot from './pages/Chatbot';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SocketProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/subscription-expired" element={<SubscriptionExpired />} />
              
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="chatbot" element={<Chatbot />} />
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<ProtectedRoute roles={['admin', 'employee']}><Dashboard /></ProtectedRoute>} />
                <Route path="hr/dashboard" element={<ProtectedRoute roles={['hr']}><HRDashboard /></ProtectedRoute>} />
                <Route path="client/dashboard" element={<ProtectedRoute roles={['client']}><ClientDashboard /></ProtectedRoute>} />
                <Route path="employee-dashboard" element={<Navigate to="/dashboard" replace />} />

                {/* Employees */}
                <Route path="employees" element={<Employees />} />
                <Route path="employees/:id" element={<EmployeeProfileView />} />
                <Route path="leaves" element={<Leaves />} />
                <Route path="holidays" element={<Holidays />} />
                <Route path="departments" element={<Departments />} />
                <Route path="designations" element={<Designations />} />
                <Route path="overtime" element={<Overtime />} />

                {/* Tickets */}
                <Route path="tickets" element={<ProtectedRoute roles={['admin', 'hr', 'employee']}><Tickets /></ProtectedRoute>} />
                <Route path="tickets/:id" element={<ProtectedRoute roles={['admin', 'hr', 'employee']}><TicketDetails /></ProtectedRoute>} />

                {/* Recruitment / ATS */}
                <Route path="recruitment/jobs" element={<ProtectedRoute roles={['admin', 'hr']}><JobsPage /></ProtectedRoute>} />
                <Route path="recruitment/jobs/create" element={<ProtectedRoute roles={['admin', 'hr']}><JobFormPage /></ProtectedRoute>} />
                <Route path="recruitment/jobs/:id/edit" element={<ProtectedRoute roles={['admin', 'hr']}><JobFormPage /></ProtectedRoute>} />
                <Route path="recruitment/candidates" element={<ProtectedRoute roles={['admin', 'hr']}><CandidatesPage /></ProtectedRoute>} />
                <Route path="recruitment/upload" element={<ProtectedRoute roles={['admin', 'hr']}><ResumeUpload /></ProtectedRoute>} />
              
                {/* Clients & Projects */}
                <Route path="clients" element={<Clients />} />
                <Route path="projects" element={<Projects />} />

                {/* Accounts */}
                <Route path="invoices" element={<Invoices />} />
                <Route path="invoices/create" element={<CreateInvoice />} />
                <Route path="invoices/:id/edit" element={<CreateInvoice />} />
                <Route path="payments" element={<Payments />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="provident-fund" element={<ProvidentFund />} />
                <Route path="taxes" element={<Taxes />} />

                {/* Payroll */}
                <Route path="salary" element={<Payroll />} />
                <Route path="payroll-items" element={<Payroll />} />

                {/* Goals */}
                <Route path="goals" element={<Goals />} />
                <Route path="goal-types" element={<GoalTypes />} />

                {/* Training */}
                <Route path="training" element={<Training />} />
                <Route path="trainers" element={<Trainers />} />
                <Route path="training-types" element={<TrainingType />} />

                {/* HR Lifecycle */}
                <Route path="promotion" element={<Promotions />} />
                <Route path="resignation" element={<Resignations />} />

                {/* Attendance */}
                <Route path="attendance" element={<Timesheet />} />

                {/* Admin */}
                <Route path="assets" element={<Assets />} />
                <Route path="users" element={<ProtectedRoute roles={['admin']}><Assets /></ProtectedRoute>} />
                <Route path="audit-logs" element={<ProtectedRoute roles={['admin']}><Dashboard /></ProtectedRoute>} />

                {/* Profile & Settings */}
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Settings />} />

                {/* ── EMPLOYEE SELF-SERVICE ROUTES ────────────────────────
                    Employees are redirected here from the sidebar.
                    Admin/HR can also access these views.
                    Any truly unauthorized access is caught by ProtectedRoute. */}
                <Route path="my-leaves" element={<Leaves />} />
                <Route path="my-attendance" element={<Timesheet />} />
                <Route path="my-projects" element={<Projects />} />
                <Route path="my-goals" element={<Goals />} />
                <Route path="my-training" element={<Training />} />

                {/* ── Administration (admin-only) ─────────────────────── */}
                <Route path="admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
                <Route path="documents" element={<Documents />} />
                <Route path="admin/audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />

                {/* ── Platform Management (superadmin) ────────────────────── */}
                <Route path="super-admin" element={<ProtectedRoute roles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />

                {/* Catch-all: employees → dashboard, others → dashboard */}
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            <Toaster position="top-right"
              toastOptions={{
                style: { borderRadius: '12px', fontSize: '14px', boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)' },
                success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
              }}
            />
          </SocketProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
