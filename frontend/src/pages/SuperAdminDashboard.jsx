/**
 * pages/SuperAdminDashboard.jsx
 * God-Mode Subscription & Tenant Management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BuildingOfficeIcon, PlusIcon, PowerIcon, TrashIcon, PencilIcon,
    MagnifyingGlassIcon, CheckCircleIcon, ClockIcon, XCircleIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';

// ─── Creation Form (Outside Main Component) ──────────────────────────────────
function CreateCompanyForm({ form, onChange }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">
                        Company Name <span className="text-red-500">*</span>
                    </label>
                    <input name="name" value={form.name} onChange={onChange} className="input w-full" placeholder="Acme Corp" />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">
                        Admin Username <span className="text-surface-400 font-normal">(optional)</span>
                    </label>
                    <input name="admin_username" value={form.admin_username} onChange={onChange} className="input w-full" placeholder="e.g. acme_admin" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">
                        Admin Email <span className="text-red-500">*</span>
                    </label>
                    <input type="email" name="admin_email" value={form.admin_email} onChange={onChange} className="input w-full" placeholder="admin@acmecorp.com" />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">
                        Admin Password <span className="text-red-500">*</span>
                    </label>
                    <input type="password" name="password" value={form.password} onChange={onChange} className="input w-full" placeholder="••••••••" autoComplete="new-password" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">
                        Sub Start Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" name="subscription_start" value={form.subscription_start} onChange={onChange} className="input w-full" />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">
                        Sub End Date <span className="text-red-500">*</span>
                    </label>
                    <input type="date" name="subscription_end" value={form.subscription_end} onChange={onChange} className="input w-full" />
                </div>
            </div>
        </div>
    );
}

// ─── Edit Subscription Form (Outside Main Component) ─────────────────────────
function EditSubscriptionForm({ form, onChange }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">Sub Start Date</label>
                    <input type="date" name="subscription_start" value={form.subscription_start} onChange={onChange} className="input w-full" />
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase">Sub End Date</label>
                    <input type="date" name="subscription_end" value={form.subscription_end} onChange={onChange} className="input w-full" />
                </div>
            </div>
            <div className="space-y-1 pt-2 border-t border-surface-200">
                <label className="block text-xs font-semibold text-surface-500 uppercase">
                    Reset Admin Password <span className="text-surface-400 font-normal">(leave blank to keep current)</span>
                </label>
                <input type="password" name="password" value={form.password} onChange={onChange} className="input w-full" placeholder="••••••••" autoComplete="new-password" />
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const EMPTY_CREATE = {
    name: '', admin_username: '', admin_email: '', password: '',
    subscription_start: new Date().toISOString().split('T')[0],
    subscription_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
};
const EMPTY_EDIT = { subscription_start: '', subscription_end: '', password: '' };

export default function SuperAdminDashboard() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [selected, setSelected] = useState(null);

    const [createForm, setCreateForm] = useState(EMPTY_CREATE);
    const [editForm, setEditForm] = useState(EMPTY_EDIT);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/super-admin/companies');
            setCompanies(res.data || []);
        } catch { toast.error('Failed to load subscriptions.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleCreateChange = (e) => setCreateForm(f => ({ ...f, [e.target.name]: e.target.value }));
    const handleEditChange = (e) => setEditForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleAdd = async () => {
        if (!createForm.name || !createForm.admin_email || !createForm.password || !createForm.subscription_end) {
            return toast.error('Check required fields.');
        }
        setSaving(true);
        try {
            await api.post('/super-admin/companies', createForm);
            toast.success('Tenant Provisioned!');
            setShowAdd(false);
            setCreateForm(EMPTY_CREATE);
            load();
        } catch (err) { toast.error(err.message || 'Creation failed.'); }
        finally { setSaving(false); }
    };

    const handleEditSave = async () => {
        setSaving(true);
        try {
            await api.put(`/super-admin/companies/${selected.id}/subscription`, editForm);
            toast.success('Subscription Updated!');
            setShowEdit(false);
            load();
        } catch (err) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const toggleStatus = async (company) => {
        const newStatus = !company.is_active;
        if (!confirm(`Are you sure you want to ${newStatus ? 'ENABLE' : 'DISABLE'} login access for ${company.name}?`)) return;

        try {
            await api.put(`/super-admin/companies/${company.id}/status`, { is_active: newStatus });
            toast.success(`Access ${newStatus ? 'Restored' : 'Revoked'}.`);
            setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, is_active: newStatus, status: newStatus ? 'active' : 'expired' } : c));
        } catch (err) { toast.error(err.message); }
    };

    const handleDelete = async (company) => {
        if (company.id === 1) return toast.error("Cannot delete master tenant.");
        if (!confirm(`CRITICAL WARNING: This will PERMANENTLY delete ${company.name} and ALL associated users, employees, and data. Proceed?`)) return;

        try {
            await api.delete(`/super-admin/companies/${company.id}`);
            toast.success('Company Terminated.');
            setCompanies(prev => prev.filter(c => c.id !== company.id));
        } catch (err) { toast.error(err.message); }
    };

    // derived metrics
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const activeCount = companies.filter(c => {
        if (!c.is_active) return false;
        const end = new Date(c.subscription_end);
        return end >= now;
    }).length;

    const expiringSoonCount = companies.filter(c => {
        if (!c.is_active || !c.subscription_end) return false;
        const end = new Date(c.subscription_end);
        return end > now && end <= nextWeek;
    }).length;

    const visible = companies.filter(c => {
        const q = search.toLowerCase();
        return !q || c.name?.toLowerCase().includes(q) || c.admin_username?.toLowerCase().includes(q);
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-surface-900">SaaS Master Control</h1>
                    <p className="text-sm text-surface-500 mt-1">Manage tenants and billing subscriptions</p>
                </div>
                <button onClick={() => { setCreateForm(EMPTY_CREATE); setShowAdd(true); }}
                    className="btn-primary flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Provision Tenant
                </button>
            </div>

            {/* Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4 flex items-center gap-4 border-l-4 border-brand-500">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                        <BuildingOfficeIcon className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-display font-bold text-surface-900">{loading ? '…' : companies.length}</p>
                        <p className="text-sm font-medium text-surface-500">Total Companies</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4 border-l-4 border-emerald-500">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-display font-bold text-surface-900">{loading ? '…' : activeCount}</p>
                        <p className="text-sm font-medium text-surface-500">Active Subs</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4 border-l-4 border-amber-500">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 animate-pulse">
                        <ClockIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-display font-bold text-amber-600">{loading ? '…' : expiringSoonCount}</p>
                        <p className="text-sm font-medium text-surface-500">Expiring (&lt;7 days)</p>
                    </div>
                </div>
            </div>

            {/* Table Controls */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 min-w-48 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="text" placeholder="Search tenants…" value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
                </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden border-t-4 border-violet-500">
                <div className="overflow-x-auto">
                    <table className="table min-w-[900px]">
                        <thead>
                            <tr>
                                <th className="w-16 text-center">ID</th>
                                <th>Company Name</th>
                                <th>Admin Username</th>
                                <th className="text-center">Usage</th>
                                <th>Validity</th>
                                <th className="text-center">Active Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12"><div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                            ) : visible.length === 0 ? (
                                <tr><td colSpan={6} className="text-center text-surface-400 py-12">No tenants found.</td></tr>
                            ) : visible.map(c => {
                                const end = new Date(c.subscription_end);
                                const isExpired = end < now;
                                const isWarning = !isExpired && end <= nextWeek;

                                return (
                                    <tr key={c.id} className={clsx(!c.is_active && "bg-surface-50/50", isExpired && "bg-red-50/20")}>
                                        <td className="text-center font-mono text-sm text-surface-500">#{c.id}</td>
                                        <td className="font-semibold text-surface-900">{c.name}</td>
                                        <td className="font-mono text-sm text-brand-600">{c.admin_username || '—'}</td>
                                        <td className="text-center">
                                            <div className="text-sm font-semibold">{c.employee_count || 0} / 50</div>
                                            <div className="text-xs text-surface-400">Employees</div>
                                        </td>
                                        <td>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-surface-500">Started: {new Date(c.subscription_start).toLocaleDateString()}</span>
                                                <span className={clsx("text-sm font-semibold",
                                                    isExpired ? "text-red-600" : isWarning ? "text-amber-600" : "text-emerald-600"
                                                )}>
                                                    Expires: {new Date(c.subscription_end).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {isExpired ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                    On Hold
                                                </span>
                                            ) : (
                                                <span className={clsx(
                                                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                                                    c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                                )}>
                                                    <span className={clsx('w-1.5 h-1.5 rounded-full', c.is_active ? 'bg-emerald-500' : 'bg-red-500')} />
                                                    {c.is_active ? 'Enabled' : 'Disabled'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => toggleStatus(c)}
                                                className={clsx('btn-icon w-8 h-8 rounded-lg', c.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50')}
                                                title={c.is_active ? "Block Login Access" : "Restore Login Access"}
                                            >
                                                <PowerIcon className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => {
                                                setSelected(c);
                                                setEditForm({ subscription_start: c.subscription_start?.split('T')[0] || '', subscription_end: c.subscription_end?.split('T')[0] || '', password: '' });
                                                setShowEdit(true);
                                            }} className="btn-icon text-brand-600 hover:bg-brand-50 w-8 h-8 rounded-lg" title="Edit Sub">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(c)} disabled={c.id === 1}
                                                className="btn-icon text-red-600 hover:bg-red-50 w-8 h-8 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent" title="Delete Tenant">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <Modal title="Provision New Tenant" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
                footer={<><button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button><button className="btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Provisioning…' : 'Finalize Creation'}</button></>}>
                <CreateCompanyForm form={createForm} onChange={handleCreateChange} />
            </Modal>

            <Modal title={`Manage ${selected?.name}`} open={showEdit} onClose={() => setShowEdit(false)} size="md"
                footer={<><button className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button><button className="btn-primary" onClick={handleEditSave} disabled={saving}>Save Changes</button></>}>
                <EditSubscriptionForm form={editForm} onChange={handleEditChange} />
            </Modal>

        </div>
    );
}
