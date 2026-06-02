/**
 * pages/AuditLogs.jsx
 * Administration → Audit Logs
 * Admin-only view of all write actions performed by users.
 * Searchable, filterable by module and HTTP method.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    ClipboardDocumentListIcon, MagnifyingGlassIcon,
    ArrowPathIcon, ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '../utils/api';
import toast from 'react-hot-toast';

const METHOD_COLORS = {
    POST: 'bg-emerald-100 text-emerald-700',
    PUT: 'bg-amber-100 text-amber-700',
    PATCH: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
};

const ACTION_COLORS = {
    INSERT: 'bg-emerald-50 text-emerald-600',
    UPDATE: 'bg-amber-50 text-amber-600',
    DELETE: 'bg-red-50 text-red-600',
};

const MODULES = [
    'Employees', 'Users', 'Leaves', 'Payroll', 'Projects', 'Clients',
    'Assets', 'Documents', 'Holidays', 'Overtime', 'Training', 'Goals',
    'Promotions', 'Departments', 'Designations', 'Settings', 'Timesheet',
];

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modFilter, setModFilter] = useState('');
    const [methFilter, setMethFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: 200 });
            if (modFilter) params.set('module', modFilter);
            if (methFilter) params.set('method', methFilter);
            if (search) params.set('search', search);
            const res = await api.get(`/admin/audit-logs?${params}`);
            setLogs(res.data || []);
        } catch { toast.error('Failed to load audit logs.'); }
        finally { setLoading(false); }
    }, [modFilter, methFilter, search]);

    useEffect(() => { load(); }, [load]);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setSearch(debouncedSearch), 400);
        return () => clearTimeout(t);
    }, [debouncedSearch]);

    const totalInserts = logs.filter(l => l.action === 'INSERT').length;
    const totalUpdates = logs.filter(l => l.action === 'UPDATE').length;
    const totalDeletes = logs.filter(l => l.action === 'DELETE').length;

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Audit Logs</h1>
                    <nav className="breadcrumb">
                        <span>Dashboard</span><span>/</span>
                        <span>Administration</span><span>/</span>
                        <span className="text-surface-800 font-medium">Audit Logs</span>
                    </nav>
                </div>
                <button onClick={load}
                    className="btn-secondary flex items-center gap-2 text-sm">
                    <ArrowPathIcon className={clsx('w-4 h-4', loading && 'animate-spin')} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Events', value: logs.length, color: 'bg-brand-50 text-brand-600' },
                    { label: 'Created', value: totalInserts, color: 'bg-emerald-50 text-emerald-600' },
                    { label: 'Updated', value: totalUpdates, color: 'bg-amber-50 text-amber-600' },
                    { label: 'Deleted', value: totalDeletes, color: 'bg-red-50 text-red-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="card p-4 flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
                            <ClipboardDocumentListIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xl font-display font-bold text-surface-900">{loading ? '…' : value}</p>
                            <p className="text-xs text-surface-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="text" placeholder="Search by user, module, endpoint…"
                        value={debouncedSearch} onChange={e => setDebouncedSearch(e.target.value)}
                        className="input pl-9" />
                </div>
                <select value={modFilter} onChange={e => setModFilter(e.target.value)} className="input w-auto">
                    <option value="">All Modules</option>
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={methFilter} onChange={e => setMethFilter(e.target.value)} className="input w-auto">
                    <option value="">All Methods</option>
                    {['POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="w-7 h-7 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-16 text-center">
                        <ShieldExclamationIcon className="w-12 h-12 text-surface-200 mx-auto mb-3" />
                        <p className="text-surface-500 font-medium">No audit events yet.</p>
                        <p className="text-surface-400 text-sm mt-1">Actions logged here once users start making changes.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>User</th>
                                    <th>Module</th>
                                    <th>Method</th>
                                    <th>Action</th>
                                    <th>Endpoint</th>
                                    <th>IP Address</th>
                                    <th>Date &amp; Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, i) => (
                                    <tr key={log.id}>
                                        <td className="text-xs text-surface-400 font-mono">{i + 1}</td>
                                        <td>
                                            <div>
                                                <p className="text-sm font-medium text-surface-800">
                                                    {log.first_name ? `${log.first_name} ${log.last_name}` : '—'}
                                                </p>
                                                {log.username && (
                                                    <p className="text-xs text-surface-400 font-mono">@{log.username}</p>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold">
                                                {log.module || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            {log.method ? (
                                                <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-bold font-mono', METHOD_COLORS[log.method] || 'bg-surface-100 text-surface-600')}>
                                                    {log.method}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td>
                                            {log.action ? (
                                                <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold', ACTION_COLORS[log.action] || 'bg-surface-100 text-surface-600')}>
                                                    {log.action}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="font-mono text-xs text-surface-500 max-w-48 truncate" title={log.endpoint}>
                                            {log.endpoint || '—'}
                                        </td>
                                        <td className="text-xs text-surface-500 font-mono">{log.ip_address || '—'}</td>
                                        <td className="text-xs text-surface-500 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('en-US', {
                                                month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
