/**
 * components/layout/Sidebar.jsx
 * Role-Based Navigation:
 *   admin / hr  → Full menu (all groups)
 *   employee    → Self-Service menu only (My Leaves, My Attendance, My Projects, Profile)
 *
 * Hardened with a `roles` guard per nav item — filtered at render time.
 */

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  AcademicCapIcon,
  CogIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  BellAlertIcon,
  FolderOpenIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

// ─── Navigation definition ────────────────────────────────────────────────────
const NAV = [
  // ── AI CHATBOT (pinned at top, all roles) ─────────────────────
  {
    group: 'AI Assistant',
    roles: ['admin', 'hr', 'employee'],
    items: [
      {
        label: 'Chatbot',
        icon: ChatBubbleLeftRightIcon,
        roles: ['admin', 'hr', 'employee'],
        to: '/chatbot',
      },
    ],
  },

  // ── MAIN ─────────────────────────────────────────────────────
  {
    group: 'Main',
    roles: ['admin', 'hr', 'employee'],
    items: [
      {
        label: 'Dashboard',
        icon: HomeIcon,
        roles: ['admin', 'hr', 'employee'],
        to: '/dashboard',
        dynamicTo: (role) => {
          if (role === 'hr') return '/hr/dashboard';
          if (role === 'admin' || role === 'employee') return '/dashboard';
          return '/dashboard';
        }
      },
    ],
  },

  // ── ADMINISTRATION (admin/hr only) ────────────────────────────
  {
    group: 'Employees',
    roles: ['admin', 'hr'],
    items: [
      {
        label: 'Employees',
        icon: UsersIcon,
        roles: ['admin', 'hr'],
        children: [
          { label: 'All Employees', to: '/employees' },
          { label: 'Holidays', to: '/holidays' },
          { label: 'Leave Requests', to: '/leaves' },
          { label: 'Departments', to: '/departments' },
          { label: 'Designations', to: '/designations' },
          { label: 'Overtime', to: '/overtime' },
        ],
      },
      { label: 'Tickets', to: '/tickets', icon: DocumentTextIcon, roles: ['admin', 'hr', 'employee'] },
      { label: 'Clients', to: '/clients', icon: UserGroupIcon, roles: ['admin'] },
      {
        label: 'Projects',
        icon: RocketLaunchIcon,
        roles: ['admin'],
        children: [{ label: 'All Projects', to: '/projects' }],
      },
    ],
  },
  {
    group: 'HR',
    roles: ['admin', 'hr'],
    items: [
      {
        label: 'Accounts',
        icon: DocumentTextIcon,
        roles: ['admin'],
        children: [
          { label: 'Invoices', to: '/invoices' },
          { label: 'Payments', to: '/payments' },
          { label: 'Expenses', to: '/expenses' },
          { label: 'Provident Fund', to: '/provident-fund' },
          { label: 'Taxes', to: '/taxes' },
        ],
      },
      {
        label: 'Payroll',
        icon: CurrencyDollarIcon,
        roles: ['admin', 'hr'],
        children: [
          { label: 'Employee Salary', to: '/salary' },
          { label: 'Payroll Items', to: '/payroll-items' },
        ],
      },
      {
        label: 'Goals',
        icon: ChartBarIcon,
        roles: ['admin', 'hr'],
        children: [
          { label: 'Goal List', to: '/goals' },
          { label: 'Goal Types', to: '/goal-types' },
        ],
      },
      {
        label: 'Training',
        icon: AcademicCapIcon,
        roles: ['admin', 'hr'],
        children: [
          { label: 'Training List', to: '/training' },
          { label: 'Trainers', to: '/trainers' },
          { label: 'Training Type', to: '/training-types' },
        ],
      },
      { label: 'Promotion', to: '/promotion', icon: BellAlertIcon, roles: ['admin', 'hr'] },
      { label: 'Resignation', to: '/resignation', icon: ArrowRightOnRectangleIcon, roles: ['admin', 'hr'] },
      { label: 'Attendance', to: '/attendance', icon: ClockIcon, roles: ['admin', 'hr'] },
    ],
  },
  {
    group: 'Administration',
    roles: ['admin'],
    items: [
      { label: 'Assets', to: '/assets', icon: BriefcaseIcon, roles: ['admin'] },
      { label: 'Documents', to: '/documents', icon: FolderOpenIcon, roles: ['admin', 'hr'] },
      { label: 'Users', to: '/admin/users', icon: ShieldCheckIcon, roles: ['admin'] },
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: DocumentTextIcon, roles: ['admin'] },
    ],
  },

  // ── RECRUITMENT / ATS (admin/hr only) ───────────────────────
  {
    group: 'Recruitment',
    roles: ['admin', 'hr'],
    items: [
      {
        label: 'ATS',
        icon: MagnifyingGlassIcon,
        roles: ['admin', 'hr'],
        children: [
          { label: 'Job Openings', to: '/recruitment/jobs' },
          { label: 'Upload Resumes', to: '/recruitment/upload' },
          { label: 'Candidates', to: '/recruitment/candidates' },
        ],
      },
    ],
  },

  // ── PLATFORM MANAGEMENT (superadmin only) ───────────────────────
  {
    group: 'Platform Management',
    roles: ['superadmin'],
    items: [
      { label: 'SaaS Subscriptions', to: '/super-admin', icon: BuildingOfficeIcon, roles: ['superadmin'] },
    ],
  },

  // ── SELF SERVICE (employee only) ──────────────────────────────
  {
    group: 'Self Service',
    roles: ['employee'],
    items: [
      {
        label: 'My Leaves',
        icon: CalendarDaysIcon,
        roles: ['employee'],
        children: [
          { label: 'My Leave Requests', to: '/my-leaves' },
          { label: 'Holidays', to: '/holidays' },
        ],
      },
      { label: 'My Attendance', to: '/my-attendance', icon: ClockIcon, roles: ['employee'] },
      { label: 'My Tickets', to: '/tickets', icon: DocumentTextIcon, roles: ['employee'] },
      { label: 'My Projects', to: '/my-projects', icon: RocketLaunchIcon, roles: ['employee'] },
      { label: 'My Goals', to: '/my-goals', icon: ChartBarIcon, roles: ['employee'] },
      { label: 'My Training', to: '/my-training', icon: AcademicCapIcon, roles: ['employee'] },
    ],
  },

  // ── SETTINGS (all roles) ──────────────────────────────────────
  {
    group: 'Account',
    roles: ['admin', 'hr', 'employee'],
    items: [
      { label: 'Profile', to: '/profile', icon: UserCircleIcon, roles: ['admin', 'hr', 'employee'] },
      { label: 'Settings', to: '/settings', icon: CogIcon, roles: ['admin', 'hr'] },
    ],
  },
];

// ─── NavGroup ─────────────────────────────────────────────────────────────────
function NavGroup({ item, mini, openKey, setOpenKey, userRole }) {
  const location = useLocation();
  const itemTo = item.dynamicTo ? item.dynamicTo(userRole) : item.to;

  if (!item.children) {
    return (
      <NavLink
        to={itemTo || '#'}
        className={({ isActive }) => clsx('nav-item', isActive && 'active')}
        title={mini ? item.label : undefined}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {!mini && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  }

  const isOpen = openKey === item.label;
  const hasActive = item.children.some((c) => location.pathname.startsWith(c.to));

  return (
    <div>
      <button
        onClick={() => setOpenKey(isOpen ? null : item.label)}
        className={clsx('nav-item w-full', hasActive && !isOpen && 'text-brand-700 bg-brand-50/50')}
        title={mini ? item.label : undefined}
      >
        <item.icon className="w-5 h-5 shrink-0" />
        {!mini && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            <ChevronDownIcon
              className={clsx('w-4 h-4 text-surface-400 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </>
        )}
      </button>

      {!mini && isOpen && (
        <div className="mt-0.5 ml-8 space-y-0.5 animate-fade-in">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) =>
                clsx(
                  'block px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'text-brand-700 font-medium bg-brand-50'
                    : 'text-surface-500 hover:text-surface-800 hover:bg-surface-100'
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar Component ───────────────────────────────────────────────────
export default function Sidebar({ mini, mobileOpen, onMobileClose }) {
  const [openKey, setOpenKey] = useState(null);
  const { logout, user } = useAuth();
  const { companyName, companyLogo } = useSettings();

  const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const logoSrc = companyLogo ? `${BASE_URL}${companyLogo}` : null;
  const role = user?.role || 'employee';

  const visibleSections = NAV
    .filter((section) => section.roles.includes(role))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-surface-900/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full z-40 flex flex-col bg-white',
          'border-r border-surface-200 transition-[width] duration-[220ms]',
          'scrollbar-thin overflow-y-auto overflow-x-hidden',
          mini ? 'w-[72px]' : 'w-[260px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'transition-transform lg:transition-[width]'
        )}
      >
        {/* Logo / Company branding */}
        <div
          className={clsx(
            'flex items-center h-16 shrink-0 border-b border-surface-100',
            mini ? 'justify-center px-0' : 'px-5 gap-3'
          )}
        >
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 overflow-hidden">
            {logoSrc && role !== 'superadmin'
              ? <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
              : <span className="text-white font-display font-bold text-sm">{role === 'superadmin' ? 'S' : (companyName?.[0] || 'S')}</span>
            }
          </div>
          {!mini && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-display font-bold text-surface-900 truncate tracking-tight flex items-center">
                {role === 'superadmin' ? (
                  <>Smart<span className="text-brand-500">HR</span></>
                ) : (
                  companyName || 'SmartHR'
                )}
              </span>
              <span className="text-[10px] font-bold text-surface-500 truncate tracking-widest uppercase mt-0.5">
                {role === 'superadmin' ? 'God-Mode' : 'Workspace'}
              </span>
            </div>
          )}
          {mobileOpen && (
            <button onClick={onMobileClose} className="ml-auto btn-ghost btn-icon lg:hidden">
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Role badge */}
        {!mini && (
          <div className="px-4 py-2 border-b border-surface-50">
            <span className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize',
              role === 'admin' && 'bg-violet-100 text-violet-700',
              role === 'hr' && 'bg-brand-100 text-brand-700',
              role === 'employee' && 'bg-emerald-100 text-emerald-700',
            )}>
              <SparklesIcon className="w-3 h-3" />
              {role}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5">
          {visibleSections.map((section) => (
            <div key={section.group}>
              {!mini && (
                <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-surface-400">
                  {section.group}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavGroup
                    key={item.label}
                    item={item}
                    mini={mini}
                    openKey={openKey}
                    setOpenKey={setOpenKey}
                    userRole={role}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-surface-100 shrink-0">
          <button
            onClick={logout}
            className={clsx(
              'nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-600',
              mini && 'justify-center'
            )}
            title={mini ? 'Logout' : undefined}
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
            {!mini && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}