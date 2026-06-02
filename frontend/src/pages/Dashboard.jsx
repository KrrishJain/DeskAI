/**
 * pages/Dashboard.jsx
 * Dual-view dashboard: Admin Dashboard if role === 'admin' or 'hr',
 * Employee Dashboard if role === 'employee'.
 *
 * CRITICAL (focus fix): All sub-form components (QuickLeaveForm) are
 * defined as standalone named functions OUTSIDE the page components.
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon, UserGroupIcon, RocketLaunchIcon,
  CalendarDaysIcon, ClockIcon, FaceSmileIcon,
  CheckCircleIcon, ArrowRightIcon, SparklesIcon,
  BriefcaseIcon, SunIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, change, to }) {
  const card = (
    <div className={clsx('stat-card group hover:shadow-card-hover transition-shadow', to && 'cursor-pointer')}>
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-display font-bold text-surface-900">{value ?? '—'}</p>
        <p className="text-sm text-surface-500 mt-0.5">{label}</p>
        {change != null && (
          <p className={clsx('text-xs font-medium mt-1', change >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {change >= 0 ? '+' : ''}{change}% vs last month
          </p>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STANDALONE FORM: Quick Leave Request (defined OUTSIDE page to prevent focus loss)
// ─────────────────────────────────────────────────────────────────────────────
function QuickLeaveForm({ onSuccess, onClose }) {
  const [form, setForm] = useState({ starting_at: '', ending_on: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.starting_at || !form.ending_on || !form.reason.trim()) {
      toast.error('All fields are required.');
      return;
    }
    const start = new Date(form.starting_at);
    const end = new Date(form.ending_on);
    if (end < start) { toast.error('End date must be after start date.'); return; }
    const days = Math.max(1, Math.ceil((end - start) / (86400000)) + 1);

    setSaving(true);
    try {
      await api.post('/leaves', { ...form, days });
      toast.success('Leave request submitted!');
      setForm({ starting_at: '', ending_on: '', reason: '' });
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || 'Submission failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider">From</label>
          <input type="date" name="starting_at" value={form.starting_at} onChange={handle}
            className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider">To</label>
          <input type="date" name="ending_on" value={form.ending_on} onChange={handle}
            className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Reason</label>
        <textarea name="reason" value={form.reason} onChange={handle} rows={2}
          placeholder="Brief reason for leave..."
          className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
      </div>
      <button type="submit" disabled={saving}
        className="w-full py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold
                   hover:bg-brand-700 disabled:opacity-60 transition-colors">
        {saving ? 'Submitting…' : 'Submit Leave Request'}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD (original dashboard — preserved exactly)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_MONTHLY = [
  { month: 'Sep', employees: 205, earnings: 115852 },
  { month: 'Oct', employees: 210, earnings: 142300 },
  { month: 'Nov', employees: 212, earnings: 138000 },
  { month: 'Dec', employees: 215, earnings: 145000 },
  { month: 'Jan', employees: 216, earnings: 143200 },
  { month: 'Feb', employees: 218, earnings: 148000 },
];

function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employees/stats/overview')
      .then((d) => setStats(d.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.firstName}! 👋</h1>
        <nav className="breadcrumb">
          <span className="text-surface-800 font-medium">Dashboard</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={loading ? '...' : stats?.total_employees}
          icon={UsersIcon} color="bg-brand-50 text-brand-600" change={10} to="/employees" />
        <StatCard label="Clients" value={loading ? '...' : stats?.total_clients}
          icon={UserGroupIcon} color="bg-violet-50 text-violet-600" to="/clients" />
        <StatCard label="Active Projects" value={loading ? '...' : stats?.active_projects ?? 112}
          icon={RocketLaunchIcon} color="bg-amber-50 text-amber-600" to="/projects" />
        <StatCard label="Pending Leaves" value={loading ? '...' : stats?.pending_leaves}
          icon={CalendarDaysIcon} color="bg-red-50 text-red-500" to="/leaves" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'New Employees', value: stats?.new_this_month ?? 10, note: 'This month', color: 'text-brand-600', pct: 70 },
          { label: 'Earnings', value: '$1,42,300', note: 'Prev: $1,15,852', color: 'text-emerald-600', pct: 70 },
          { label: 'Expenses', value: '$8,500', note: 'Prev: $7,500', color: 'text-amber-600', pct: 45 },
          { label: 'Assets', value: stats?.total_assets ?? 0, note: 'Total assets', color: 'text-violet-600', pct: 60 },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-surface-500">{s.label}</span>
              <span className={clsx('text-xs font-medium', s.color)}>+12%</span>
            </div>
            <p className={clsx('text-xl font-display font-bold', s.color)}>{loading ? '...' : s.value}</p>
            <div className="progress-bar mt-3">
              <div className="progress-fill bg-brand-500" style={{ width: `${s.pct}%` }} />
            </div>
            <p className="text-xs text-surface-400 mt-1.5">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-surface-900 mb-4">Monthly Earnings</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_MONTHLY} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="earnings-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(v) => [`$${v.toLocaleString()}`, 'Earnings']} />
              <Area type="monotone" dataKey="earnings" stroke="#2563eb" strokeWidth={2} fill="url(#earnings-grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-display font-semibold text-surface-900 mb-4">Employee Headcount</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_MONTHLY} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Bar dataKey="employees" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
          <h3 className="font-display font-semibold text-surface-900">Recent Projects</h3>
          <Link to="/projects" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Project Name</th><th>Progress</th><th>Status</th></tr></thead>
            <tbody>
              {[
                { name: 'Office Management', pct: 65, open: 1, done: 9 },
                { name: 'Project Management', pct: 15, open: 2, done: 5 },
                { name: 'Video Calling App', pct: 49, open: 3, done: 3 },
                { name: 'Hospital Administration', pct: 88, open: 12, done: 4 },
                { name: 'Digital Marketplace', pct: 100, open: 7, done: 14 },
              ].map((p) => (
                <tr key={p.name}>
                  <td>
                    <Link to="/projects" className="font-medium text-surface-900 hover:text-brand-600 transition-colors">{p.name}</Link>
                    <p className="text-xs text-surface-400 mt-0.5">{p.open} open · {p.done} completed</p>
                  </td>
                  <td className="w-48">
                    <div className="flex items-center gap-3">
                      <div className="progress-bar flex-1">
                        <div className={clsx('progress-fill', p.pct === 100 ? 'bg-emerald-500' : 'bg-brand-500')} style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="text-xs text-surface-500 w-8 text-right">{p.pct}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={clsx('badge', p.pct === 100 ? 'badge-success' : p.pct > 60 ? 'badge-info' : 'badge-warning')}>
                      {p.pct === 100 ? 'Completed' : p.pct > 60 ? 'In Progress' : 'Started'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function EmployeeDashboard({ user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/employee');
      if (res.success) setData(res.data);
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Today's office hours progress bar
  const getTodayProgress = () => {
    if (!data?.todayAttendance) return { pct: 0, label: 'Not clocked in today', hoursWorked: 0 };
    const { clock_in, clock_out, work_hours } = data.todayAttendance;
    const WORK_DAY_HOURS = 9;
    let hoursWorked = 0;
    if (work_hours) {
      hoursWorked = parseFloat(work_hours);
    } else if (clock_in) {
      hoursWorked = (Date.now() - new Date(clock_in).getTime()) / 3600000;
    }
    const pct = Math.min(100, Math.round((hoursWorked / WORK_DAY_HOURS) * 100));
    const label = clock_out
      ? `Clocked out · ${hoursWorked.toFixed(1)}h worked`
      : `Working · ${hoursWorked.toFixed(1)}h so far`;
    return { pct, label, hoursWorked };
  };

  const { pct: officePct, label: officeLabel } = getTodayProgress();

  const emp = data?.employee;
  const stats = data || {};
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Welcome Card ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-600 to-violet-600 rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 right-20 w-20 h-20 rounded-full bg-white/10" />

        <div className="flex items-center gap-4 relative">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-2xl font-display font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Welcome back, {user?.firstName}! 👋</h1>
            <p className="text-white/70 text-sm mt-1">{dateStr}</p>
            {emp && (
              <p className="text-white/60 text-xs mt-1">
                {emp.designation || 'Employee'} {emp.department ? `· ${emp.department}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat widgets ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <RocketLaunchIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-surface-900">{stats.assigned_projects ?? 0}</p>
            <p className="text-sm text-surface-500">Assigned Projects</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <CalendarDaysIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-surface-900">{stats.pending_leaves ?? 0}</p>
            <p className="text-sm text-surface-500">Pending Leaves</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <SunIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-surface-900">
              {data?.upcomingHolidays?.length ?? 0}
            </p>
            <p className="text-sm text-surface-500">Upcoming Holidays</p>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* LEFT — 2/3 width */}
        <div className="lg:col-span-2 space-y-5">

          {/* Today's Office Hours */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-surface-900 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-brand-500" /> Today's Office Hours
              </h3>
              <span className={clsx(
                'badge text-xs',
                data?.todayAttendance?.clock_in
                  ? data?.todayAttendance?.clock_out ? 'badge-success' : 'badge-info'
                  : 'badge-warning'
              )}>
                {data?.todayAttendance?.clock_in
                  ? data?.todayAttendance?.clock_out ? 'Completed' : 'In Office'
                  : 'Not Started'}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-surface-600">
                <span>{officeLabel}</span>
                <span className="font-semibold text-brand-600">{officePct}%</span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${officePct}%` }}
                />
              </div>
              <p className="text-xs text-surface-400">Target: 9 hours/day</p>
            </div>
            {data?.todayAttendance?.clock_in && (
              <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-surface-100">
                <div>
                  <p className="text-xs text-surface-400 font-medium">Clock In</p>
                  <p className="text-sm font-semibold text-surface-800 mt-0.5">
                    {new Date(data.todayAttendance.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-400 font-medium">Clock Out</p>
                  <p className="text-sm font-semibold text-surface-800 mt-0.5">
                    {data?.todayAttendance?.clock_out
                      ? new Date(data.todayAttendance.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Attendance Logs */}
          <div className="card">
            <div className="px-5 py-4 border-b border-surface-100">
              <h3 className="font-display font-semibold text-surface-900 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-surface-400" /> Recent Attendance
              </h3>
            </div>
            {data?.recentAttendance?.length > 0 ? (
              <div className="divide-y divide-surface-50">
                {data.recentAttendance.map((log) => {
                  const clockIn = new Date(log.clock_in);
                  const clockOut = log.clock_out ? new Date(log.clock_out) : null;
                  return (
                    <div key={log.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-surface-800">
                          {clockIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {clockIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {clockOut ? ` → ${clockOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ' → Active'}
                        </p>
                      </div>
                      <div className="text-right">
                        {log.work_hours
                          ? <span className="text-sm font-semibold text-brand-600">{parseFloat(log.work_hours).toFixed(1)}h</span>
                          : <span className="badge badge-info text-xs">Live</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-surface-400">
                <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No attendance records yet.</p>
              </div>
            )}
          </div>

          {/* My Projects */}
          <div className="card">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-surface-900 flex items-center gap-2">
                <BriefcaseIcon className="w-5 h-5 text-surface-400" /> My Projects
              </h3>
              <Link to="/projects" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
            </div>
            {data?.myProjects?.length > 0 ? (
              <div className="divide-y divide-surface-50">
                {data.myProjects.map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-surface-800">{p.name}</p>
                      <p className="text-xs text-surface-400 mt-0.5 capitalize">{p.priority} priority</p>
                    </div>
                    <span className={clsx('badge text-xs capitalize',
                      p.status === 'completed' ? 'badge-success' : p.status === 'active' ? 'badge-info' : 'badge-warning'
                    )}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-surface-400 text-sm">No projects assigned yet.</div>
            )}
          </div>
        </div>

        {/* RIGHT — 1/3 width */}
        <div className="space-y-5">

          {/* Quick Leave Request */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-surface-900 flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-amber-500" /> Quick Leave
              </h3>
              <button onClick={() => setShowLeaveForm((p) => !p)}
                className="text-xs text-brand-600 font-medium hover:text-brand-700">
                {showLeaveForm ? 'Hide' : 'Apply →'}
              </button>
            </div>
            {showLeaveForm ? (
              <QuickLeaveForm onSuccess={fetchData} onClose={() => setShowLeaveForm(false)} />
            ) : (
              <div className="space-y-2">
                {data?.myLeaves?.length > 0 ? data.myLeaves.slice(0, 3).map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-surface-700">
                        {new Date(l.starting_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' — '}
                        {new Date(l.ending_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-surface-400 truncate max-w-36">{l.reason}</p>
                    </div>
                    <span className={clsx('badge text-xs capitalize shrink-0',
                      l.status === 'approved' ? 'badge-success' : l.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                    )}>{l.status}</span>
                  </div>
                )) : (
                  <p className="text-sm text-surface-400 text-center py-2">No recent leaves.</p>
                )}
                <button onClick={() => setShowLeaveForm(true)}
                  className="w-full mt-2 py-2 rounded-xl border border-brand-200 text-brand-600 text-sm font-medium
                             hover:bg-brand-50 transition-colors flex items-center justify-center gap-1">
                  <SparklesIcon className="w-4 h-4" /> Apply for Leave
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Holidays */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-surface-900 mb-4 flex items-center gap-2">
              <SunIcon className="w-5 h-5 text-amber-400" /> Upcoming Holidays
            </h3>
            {data?.upcomingHolidays?.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingHolidays.map((h) => {
                  const d = new Date(h.holiday_date);
                  const isNear = (d - today) < 7 * 86400000;
                  return (
                    <div key={h.id} className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border',
                      isNear ? 'border-amber-200 bg-amber-50' : 'border-surface-100 bg-surface-50'
                    )}>
                      <div className={clsx(
                        'w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 text-xs font-bold',
                        isNear ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-700'
                      )}>
                        <span>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-lg leading-none">{d.getDate()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-surface-800">{h.name}</p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {d.toLocaleDateString('en-US', { weekday: 'long' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-surface-400">
                <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming holidays.</p>
              </div>
            )}
          </div>

          {/* Quick navigation links */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-surface-900 mb-3 flex items-center gap-2">
              <FaceSmileIcon className="w-5 h-5 text-brand-400" /> Quick Actions
            </h3>
            <div className="space-y-1">
              {[
                { label: 'View My Profile', to: '/profile' },
                { label: 'My Leaves', to: '/leaves' },
                { label: 'View Projects', to: '/projects' },
                { label: 'My Attendance', to: '/attendance' },
              ].map((link) => (
                <Link key={link.to} to={link.to}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm
                             text-surface-700 hover:bg-brand-50 hover:text-brand-700 transition-colors group">
                  <span>{link.label}</span>
                  <ArrowRightIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — Role Router
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return <Spinner />;

  // employee role → Employee Dashboard; everyone else → Admin Dashboard
  return user.role === 'employee'
    ? <EmployeeDashboard user={user} />
    : <AdminDashboard user={user} />;
}