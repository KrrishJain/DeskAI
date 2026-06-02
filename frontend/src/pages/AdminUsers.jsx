/**
 * pages/AdminUsers.jsx
 * Administration → Users
 * Admin-only. Manage system login accounts (not employee records).
 * Shows role badges, active/inactive status, linked employee name.
 *
 * Form components defined OUTSIDE the main function to prevent focus-loss bug.
 */

import { useState, useEffect, useCallback } from 'react';
import {
    UserCircleIcon, ShieldCheckIcon, PlusIcon,
    PencilIcon, TrashIcon, MagnifyingGlassIcon,
    CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';

// ─── Reusable: Role badge ─────────────────────────────────────────────────────
function RoleBadge({ role }) {
    const map = {
        admin: 'bg-violet-100 text-violet-700',
        hr: 'bg-brand-100 text-brand-700',
        employee: 'bg-emerald-100 text-emerald-700',
    };
    return (
        <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', map[role] || 'bg-surface-100 text-surface-600')}>
            <ShieldCheckIcon className="w-3 h-3" />
            {role}
        </span>
    );
}

// ─── Add / Edit Form — STANDALONE (outside page component) ───────────────────
function UserForm({ form, onChange, isEdit }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    First Name <span className="text-red-500">*</span>
                </label>
                <input name="first_name" value={form.first_name} onChange={onChange}
                    className="input w-full" placeholder="John" />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Last Name</label>
                <input name="last_name" value={form.last_name} onChange={onChange}
                    className="input w-full" placeholder="Doe" />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Username <span className="text-red-500">*</span>
                </label>
                <input name="username" value={form.username} onChange={onChange}
                    className="input w-full" placeholder="john.doe" autoComplete="off" />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Email <span className="text-red-500">*</span>
                </label>
                <input type="email" name="email" value={form.email} onChange={onChange}
                    className="input w-full" placeholder="john@company.com" />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    {isEdit ? 'New Password' : 'Password'} {!isEdit && <span className="text-red-500">*</span>}
                </label>
                <input type="password" name="password" value={form.password} onChange={onChange}
                    className="input w-full" placeholder={isEdit ? 'Leave blank to keep current' : '••••••••'}
                    autoComplete="new-password" />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Role</label>
                <select name="role" value={form.role} onChange={onChange} className="input w-full">
                    <option value="employee">Employee</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            {isEdit && (
                <div className="sm:col-span-2 space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</label>
                    <select name="is_active" value={form.is_active} onChange={onChange} className="input w-full">
                        <option value={true}>Active</option>
                        <option value={false}>Inactive</option>
                    </select>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const EMPTY = { first_name: '', last_name: '', username: '', email: '', password: '', role: 'employee', is_active: true };

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');   // role filter

    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDel, setShowDel] = useState(false);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data || []);
        } catch { toast.error('Failed to load users.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleAdd = async () => {
        if (!form.first_name.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
            return toast.error('All required fields must be filled.');
        }
        setSaving(true);
        try {
            await api.post('/admin/users', form);
            toast.success('User created!');
            setShowAdd(false);
            setForm(EMPTY);
            load();
        } catch (err) { toast.error(err.message || 'Failed to create user.'); }
        finally { setSaving(false); }
    };

    const handleEdit = async () => {
        setSaving(true);
        try {
            await api.put(`/admin/users/${selected.id}`, form);
            toast.success('User updated!');
            setShowEdit(false);
            load();
        } catch (err) { toast.error(err.message || 'Update failed.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await api.delete(`/admin/users/${selected.id}`);
            toast.success('User deactivated.');
            setShowDel(false);
            load();
        } catch (err) { toast.error(err.message || 'Delete failed.'); }
        finally { setSaving(false); }
    };

    const visible = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q || u.username?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(q);
        const matchFilter = !filter || u.role === filter;
        return matchSearch && matchFilter;
    });

    const adminCount = users.filter(u => u.role === 'admin').length;
    const empCount = users.filter(u => u.role === 'employee').length;
    const hrCount = users.filter(u => u.role === 'hr').length;

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">System Users</h1>
                    <nav className="breadcrumb"><span>Dashboard</span><span>/</span><span className="text-surface-600">Administration</span><span>/</span><span className="text-surface-800 font-medium">Users</span></nav>
                </div>
                <button onClick={() => { setForm(EMPTY); setShowAdd(true); }}
                    className="btn-primary flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Add User
                </button>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: users.length, color: 'bg-brand-50 text-brand-600', icon: UserCircleIcon },
                    { label: 'Admins', value: adminCount, color: 'bg-violet-50 text-violet-600', icon: ShieldCheckIcon },
                    { label: 'HR', value: hrCount, color: 'bg-amber-50 text-amber-600', icon: UserCircleIcon },
                    { label: 'Employees', value: empCount, color: 'bg-emerald-50 text-emerald-600', icon: UserCircleIcon },
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="card p-4 flex items-center gap-3">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
                            <Icon className="w-5 h-5" />
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
                    <input type="text" placeholder="Search by name, username, email…"
                        value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)} className="input w-auto">
                    <option value="">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="employee">Employee</option>
                </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="w-7 h-7 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Linked Employee</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center text-surface-400 py-10">No users found.</td></tr>
                                ) : visible.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm shrink-0">
                                                    {(u.first_name?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-surface-900 text-sm">{u.first_name} {u.last_name}</p>
                                                    <p className="text-xs text-surface-400">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-sm font-mono text-surface-600">@{u.username}</td>
                                        <td><RoleBadge role={u.role} /></td>
                                        <td className="text-sm text-surface-600">{u.employee_name || <span className="text-surface-300">—</span>}</td>
                                        <td>
                                            {u.is_active
                                                ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium"><CheckCircleIcon className="w-4 h-4" />Active</span>
                                                : <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium"><XCircleIcon className="w-4 h-4" />Inactive</span>
                                            }
                                        </td>
                                        <td className="text-sm text-surface-500">{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => { setSelected(u); setForm({ ...EMPTY, ...u, password: '' }); setShowEdit(true); }}
                                                    className="btn-icon w-8 h-8 text-brand-600 hover:bg-brand-50 rounded-lg">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { setSelected(u); setShowDel(true); }}
                                                    className="btn-icon w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            <Modal title="Add System User" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
                footer={<><button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button></>}>
                <UserForm form={form} onChange={handleChange} isEdit={false} />
            </Modal>

            {/* Edit Modal */}
            <Modal title={`Edit — ${selected?.username || ''}`} open={showEdit} onClose={() => setShowEdit(false)} size="lg"
                footer={<><button className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button></>}>
                <UserForm form={form} onChange={handleChange} isEdit={true} />
            </Modal>

            {/* Delete Confirm */}
            <Modal title="Deactivate User" open={showDel} onClose={() => setShowDel(false)}
                footer={<><button className="btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                        onClick={handleDelete} disabled={saving}>{saving ? 'Deactivating…' : 'Yes, Deactivate'}</button></>}>
                <p className="text-surface-600 text-sm">
                    Deactivate user <strong className="text-surface-900">@{selected?.username}</strong>?
                    <br /><span className="text-surface-400 text-xs mt-1 block">The account will be disabled — the linked employee record is preserved.</span>
                </p>
            </Modal>
        </div>
    );
}
