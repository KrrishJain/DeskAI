# SmartHR â€” PERN Stack HRMS v2.0

A production-ready rebuild of the legacy SmartHR PHP system, migrated to the PERN stack (PostgreSQL, Express, React, Node.js) with modern UI and enhanced features.

---

## Architecture Overview

```
smarthr/
â”œâ”€â”€ backend/                    # Express.js API Server
â”‚   â”œâ”€â”€ controllers/            # Route handler logic
â”‚   â”‚   â”œâ”€â”€ authController.js   # JWT login/logout/me
â”‚   â”‚   â”œâ”€â”€ employeesController.js
â”‚   â”‚   â”œâ”€â”€ leavesController.js
â”‚   â”‚   â”œâ”€â”€ assetsController.js
â”‚   â”‚   â””â”€â”€ attendanceController.js
â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â”œâ”€â”€ pool.js             # pg-pool (Neon DB optimized)
â”‚   â”‚   â”œâ”€â”€ init.sql            # Full PostgreSQL schema
â”‚   â”‚   â”œâ”€â”€ migrate.js          # Schema runner
â”‚   â”‚   â””â”€â”€ seed.js             # Admin user seeder
â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”œâ”€â”€ auth.js             # JWT + role-based auth
â”‚   â”‚   â””â”€â”€ errorHandler.js     # Centralized error handling
â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â””â”€â”€ index.js            # All API routes
â”‚   â”œâ”€â”€ .env.example
â”‚   â”œâ”€â”€ package.json
â”‚   â””â”€â”€ server.js               # Express + Socket.io entry
â”‚
â””â”€â”€ frontend/                   # React + Vite + Tailwind
    â”œâ”€â”€ src/
    â”‚   â”œâ”€â”€ components/
    â”‚   â”‚   â”œâ”€â”€ layout/
    â”‚   â”‚   â”‚   â”œâ”€â”€ AppLayout.jsx      # Shell with sidebar + header
    â”‚   â”‚   â”‚   â”œâ”€â”€ Sidebar.jsx        # Full navigation (mirrors sidebar.php)
    â”‚   â”‚   â”‚   â”œâ”€â”€ Header.jsx         # With notifications + user menu
    â”‚   â”‚   â”‚   â””â”€â”€ ProtectedRoute.jsx
    â”‚   â”‚   â”œâ”€â”€ ui/
    â”‚   â”‚   â”‚   â”œâ”€â”€ DataTable.jsx      # Paginated, sortable, searchable table
    â”‚   â”‚   â”‚   â””â”€â”€ Modal.jsx          # Headless UI accessible modal
    â”‚   â”‚   â””â”€â”€ modals/
    â”‚   â”‚       â”œâ”€â”€ AddEmployeeModal.jsx  # Full employee form
    â”‚   â”‚       â”œâ”€â”€ AddSalaryModal.jsx    # Earnings/deductions + unit calc toggle
    â”‚   â”‚       â””â”€â”€ AddLeaveModal.jsx
    â”‚   â”œâ”€â”€ context/
    â”‚   â”‚   â”œâ”€â”€ AuthContext.jsx        # Global auth state
    â”‚   â”‚   â””â”€â”€ SocketContext.jsx      # Real-time notifications
    â”‚   â”œâ”€â”€ pages/
    â”‚   â”‚   â”œâ”€â”€ Login.jsx              # Dark themed login
    â”‚   â”‚   â”œâ”€â”€ Dashboard.jsx          # Stats + charts
    â”‚   â”‚   â”œâ”€â”€ Employees.jsx          # Grid/table toggle view
    â”‚   â”‚   â”œâ”€â”€ Leaves.jsx             # With approve/reject flow
    â”‚   â”‚   â””â”€â”€ Assets.jsx             # Asset CRUD
    â”‚   â””â”€â”€ utils/api.js               # Axios with HttpOnly cookie support
    â”œâ”€â”€ tailwind.config.js
    â””â”€â”€ vite.config.js
```

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18
- PostgreSQL database (local or [Neon DB](https://neon.tech))

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET in .env

# Run database migration
node db/migrate.js

# Seed admin users (Vendetta + Barry with proper bcrypt hashes)
node db/seed.js

# Start dev server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Login

| Username   | Password   | Role  |
|------------|-----------|-------|
| `Vendetta` | `vendetta` | admin |
| `Barry`    | `barry`    | hr    |

---

## Key Design Decisions

### Security
- **JWT in HttpOnly cookies** â€” not localStorage, prevents XSS token theft
- **Bcrypt** (12 rounds) for all password hashing
- **Rate limiting** on all API endpoints (strict on `/auth/login`)
- **Helmet.js** for security headers
- **CORS** restricted to configured client origin
- **Soft deletes** for employees (is_active flag) â€” data preserved for audit

### Database (PostgreSQL / Neon DB)
- All `AUTO_INCREMENT` â†’ `SERIAL PRIMARY KEY`
- All datetime/date â†’ `TIMESTAMPTZ` (timezone-aware)
- All column names â†’ `snake_case`
- Foreign key constraints added (loose string refs in PHP replaced with proper FK relations)
- `GENERATED ALWAYS AS` for computed `work_hours` in attendance
- Automatic `updated_at` trigger on all mutable tables
- **Audit log trigger** fires automatically on every salary_structures change

### New Features (not in original)
1. **Attendance** (`/api/attendance`) â€” Clock-In/Clock-Out with IP logging + geo-fence validation
2. **Document Management** â€” `documents` table for contracts/IDs
3. **Real-time Notifications** â€” Socket.io events for leave approvals, announcements
4. **Audit Logs** â€” Automated PostgreSQL trigger captures every salary record change

### Frontend
- **React + Vite + Tailwind CSS** with custom design system
- `@headlessui/react` for accessible Modals, Menus, Transitions
- `Recharts` for dashboard analytics
- **Mini-sidebar toggle** (replicates `app.js` functionality)
- **Grid/Table view toggle** for employee directory
- **Role-based UI** â€” admin/hr/employee see different action buttons
- **useSocket** hook for real-time notification badge

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/logout` | Auth | Logout |
| GET | `/api/auth/me` | Auth | Current user |
| GET | `/api/employees` | Auth | List employees |
| POST | `/api/employees` | HR/Admin | Create employee |
| PUT | `/api/employees/:id` | HR/Admin | Update employee |
| DELETE | `/api/employees/:id` | Admin | Soft-delete |
| GET | `/api/employees/stats/overview` | Auth | Dashboard stats |
| GET | `/api/leaves` | Auth | List leaves |
| POST | `/api/leaves` | Auth | Request leave |
| PUT | `/api/leaves/:id/status` | HR/Admin | Approve/reject |
| GET | `/api/assets` | Auth | List assets |
| POST | `/api/assets` | HR/Admin | Add asset |
| GET | `/api/attendance` | Auth | Attendance log |
| POST | `/api/attendance/clock-in` | Auth | Clock in |
| PUT | `/api/attendance/clock-out` | Auth | Clock out |
| POST | `/api/salary` | HR/Admin | Save salary structure |
| GET | `/api/audit-logs` | Admin | Audit trail |

---

## Extending the Application

To add a new feature (e.g., Payroll):

1. Add table to `backend/db/init.sql`
2. Create `backend/controllers/payrollController.js`
3. Mount routes in `backend/routes/index.js`
4. Create `frontend/src/pages/Payroll.jsx`
5. Add route in `frontend/src/App.jsx`
6. Add nav item already exists in `Sidebar.jsx`

---

## License

MIT â€” Free to use and extend.