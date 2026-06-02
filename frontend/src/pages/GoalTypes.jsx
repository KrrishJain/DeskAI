/**
 * GoalTypes.jsx
 *
 * CRUD for Goal Types (the categories used in the Goal List).
 * Form component defined OUTSIDE main function to prevent focus-loss.
 *
 * API:
 *   GET    /api/goal-types
 *   POST   /api/goal-types
 *   PUT    /api/goal-types/:id
 *   DELETE /api/goal-types/:id
 */

import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url, opts = {}) =>
    fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts })
        .then(r => r.json());

// ── Form — defined OUTSIDE to prevent focus-loss ─────────────────────────────

function GoalTypeForm({ form, onChange }) {
    return (
        <div>
            <div className="mb-3">
                <label className="form-label fw-semibold">
                    Type Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                    name="type_name"
                    className="form-control"
                    placeholder="e.g. Growth Goal, Sales Target…"
                    value={form.type_name}
                    onChange={onChange}
                />
            </div>

            <div className="mb-3">
                <label className="form-label fw-semibold">Description</label>
                <textarea
                    name="description"
                    className="form-control"
                    rows={3}
                    placeholder="Optional description…"
                    value={form.description || ''}
                    onChange={onChange}
                />
            </div>

            <div className="mb-3">
                <label className="form-label fw-semibold">Status</label>
                <select name="status" className="form-select" value={form.status} onChange={onChange}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
        </div>
    );
}

// ── Default form shape ────────────────────────────────────────────────────────

const EMPTY = { type_name: '', description: '', status: 'active' };

// ── Main component ────────────────────────────────────────────────────────────

export default function GoalTypes() {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDel, setShowDel] = useState(false);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // ── load ──────────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        const res = await apiFetch(`${API}/goal-types`);
        if (res.success) setTypes(res.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // ── handlers ──────────────────────────────────────────────────────────────
    const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleAdd = async () => {
        setError('');
        if (!form.type_name.trim()) return setError('Type name is required.');
        setSaving(true);
        const res = await apiFetch(`${API}/goal-types`, { method: 'POST', body: JSON.stringify(form) });
        setSaving(false);
        if (res.success) { setShowAdd(false); setForm(EMPTY); load(); }
        else setError(res.message || 'Error saving goal type.');
    };

    const handleEdit = async () => {
        setError('');
        setSaving(true);
        const res = await apiFetch(`${API}/goal-types/${selected.id}`, {
            method: 'PUT',
            body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.success) { setShowEdit(false); load(); }
        else setError(res.message || 'Error updating goal type.');
    };

    const handleDelete = async () => {
        setSaving(true);
        await apiFetch(`${API}/goal-types/${selected.id}`, { method: 'DELETE' });
        setSaving(false); setShowDel(false); load();
    };

    const openEdit = (t) => {
        setSelected(t);
        setForm({ type_name: t.type_name, description: t.description || '', status: t.status });
        setError('');
        setShowEdit(true);
    };

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>Goal Types</h3>
                    <nav style={{ fontSize: 13, color: '#9ca3af' }}>
                        Dashboard / Goals / <span style={{ color: '#4f46e5' }}>Goal Types</span>
                    </nav>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setForm(EMPTY); setError(''); setShowAdd(true); }}
                >
                    + Add Goal Type
                </button>
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading…</div>
            ) : types.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
                    No goal types yet. Click <strong>+ Add Goal Type</strong> to create one.
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-striped">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Type Name</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map((t, i) => (
                                <tr key={t.id}>
                                    <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                                    <td style={{ fontWeight: 600 }}>{t.type_name}</td>
                                    <td style={{ fontSize: 13, color: '#6b7280', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {t.description || '—'}
                                    </td>
                                    <td>
                                        <span
                                            className="badge"
                                            style={{
                                                background: t.status === 'active' ? '#dcfce7' : '#fee2e2',
                                                color: t.status === 'active' ? '#16a34a' : '#dc2626',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {t.status}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: 12, color: '#9ca3af' }}>
                                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                                    </td>
                                    <td>
                                        <div className="dropdown">
                                            <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <button className="dropdown-item" onClick={() => openEdit(t)}>
                                                        ✏️ Edit
                                                    </button>
                                                </li>
                                                <li>
                                                    <button
                                                        className="dropdown-item text-danger"
                                                        onClick={() => { setSelected(t); setShowDel(true); }}
                                                    >
                                                        🗑 Delete
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Add Modal ── */}
            <Modal
                title="Add Goal Type"
                open={showAdd}
                onClose={() => setShowAdd(false)}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                            {saving ? 'Saving…' : 'Submit'}
                        </button>
                    </>
                }
            >
                {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
                <GoalTypeForm form={form} onChange={handleChange} />
            </Modal>

            {/* ── Edit Modal ── */}
            <Modal
                title="Edit Goal Type"
                open={showEdit}
                onClose={() => setShowEdit(false)}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </>
                }
            >
                {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
                <GoalTypeForm form={form} onChange={handleChange} />
            </Modal>

            {/* ── Delete Confirm Modal ── */}
            <Modal
                title="Delete Goal Type"
                open={showDel}
                onClose={() => setShowDel(false)}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                            {saving ? 'Deleting…' : 'Yes, Delete'}
                        </button>
                    </>
                }
            >
                <p>
                    Delete goal type <strong>{selected?.type_name}</strong>?{' '}
                    <span style={{ color: '#ef4444' }}>
                        Goals linked to this type will have their type cleared.
                    </span>
                </p>
            </Modal>
        </div>
    );
}
