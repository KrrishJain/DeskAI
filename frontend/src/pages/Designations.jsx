/**
 * pages/Designations.jsx
 * Full CRUD for designations.
 * Add/Edit form loads departments from DB for the dropdown (mirrors add_designation.php).
 * Table shows Designation title + Department name (JOIN in backend).
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { useAuth } from '../context/AuthContext';

function DesigFormModal({ open, onClose, existing, onSuccess }) {
  const [title, setTitle]            = useState('');
  const [deptId, setDeptId]          = useState('');
  const [departments, setDepts]      = useState([]);
  const [loadingDepts, setLoadDepts] = useState(false);
  const [saving, setSaving]          = useState(false);
  const isEdit = !!existing;

  useEffect(() => {
    if (!open) return;
    setLoadDepts(true);
    api.get('/departments')
      .then((res) => setDepts(res.data || []))
      .catch(() => toast.error('Could not load departments.'))
      .finally(() => setLoadDepts(false));
  }, [open]);

  useEffect(() => {
    setTitle(existing?.title ?? '');
    setDeptId(existing?.department_id ? String(existing.department_id) : '');
  }, [existing, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Designation title is required.'); return; }
    if (!deptId)       { toast.error('Please select a department.'); return; }
    setSaving(true);
    try {
      const payload = { title: title.trim(), department_id: parseInt(deptId) };
      if (isEdit) {
        await api.put(`/designations/${existing.id}`, payload);
        toast.success('Designation updated.');
      } else {
        await api.post('/designations', payload);
        toast.success('Designation added.');
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Designation' : 'Add Designation'}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button form="desig-form" type="submit" disabled={saving || loadingDepts} className="btn-primary btn-sm">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Designation'}
          </button>
        </>
      }
    >
      <form id="desig-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Designation Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Developer"
            required
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Department <span className="text-red-500">*</span></label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            required
            className="input"
            disabled={loadingDepts}
          >
            <option value="">{loadingDepts ? 'Loading…' : '— Select Department —'}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirmModal({ open, onClose, target, onSuccess }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/designations/${target.id}`);
      toast.success(`"${target.title}" deleted.`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open} onClose={onClose} title="Delete Designation" size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button onClick={handleDelete} disabled={deleting}
            className="btn-sm bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors">
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </>
      }
    >
      <p className="text-surface-600 text-sm">
        Delete <span className="font-semibold text-surface-900">"{target?.title}"</span>?
      </p>
      <p className="text-surface-400 text-xs mt-2">Designations with active employees cannot be deleted.</p>
    </Modal>
  );
}

export default function Designations() {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterDept, setFilterDept]     = useState('');
  const [departments, setDepartments]   = useState([]);
  const [formModal, setFormModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [delTarget, setDelTarget]       = useState(null);
  const { isAdmin, isHR } = useAuth();

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterDept ? `?department_id=${filterDept}` : '';
      const res = await api.get(`/designations${params}`);
      setDesignations(res.data || []);
    } catch {
      toast.error('Failed to load designations.');
    } finally {
      setLoading(false);
    }
  }, [filterDept]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditTarget(null); setFormModal(true); };
  const openEdit = (d) => { setEditTarget(d); setFormModal(true); };

  const columns = [
    {
      key: 'title',
      label: 'Designation',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <BriefcaseIcon className="w-4 h-4 text-violet-600" />
          </div>
          <span className="font-medium text-surface-900">{row.title}</span>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      sortable: true,
      render: (_, val) => val
        ? <span className="badge badge-info">{val}</span>
        : <span className="text-surface-400 text-xs">—</span>,
    },
    {
      key: 'employee_count',
      label: 'Employees',
      sortable: true,
      render: (_, val) => (
        <span className={clsx('badge', parseInt(val) > 0 ? 'badge-success' : 'badge-neutral')}>
          {val ?? 0} {parseInt(val) === 1 ? 'employee' : 'employees'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {isHR && (
            <button onClick={() => openEdit(row)} title="Edit"
              className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-brand-600">
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setDelTarget(row)} title="Delete"
              className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-red-500">
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Designations</h1>
          <nav className="breadcrumb mt-1">
            <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>
            <span>/</span>
            <span className="text-surface-600">Designations</span>
          </nav>
        </div>
        {isHR && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Designation
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Designations', value: designations.length, color: 'text-surface-900' },
          { label: 'Departments Used', value: new Set(designations.map(d => d.department_id)).size, color: 'text-brand-600' },
          { label: 'Total Employees', value: designations.reduce((s, d) => s + parseInt(d.employee_count || 0), 0), color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={clsx('text-2xl font-display font-bold', s.color)}>{s.value}</p>
            <p className="text-sm text-surface-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Department filter bar */}
      <div className="card p-3 flex items-center gap-3">
        <span className="text-sm text-surface-500 whitespace-nowrap">Filter by department:</span>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="input py-1.5 text-sm w-56">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {filterDept && (
          <button onClick={() => setFilterDept('')} className="text-xs text-brand-600 hover:underline">Clear</button>
        )}
      </div>

      <DataTable columns={columns} data={designations} loading={loading} pageSize={15} emptyMessage="No designations found." />

      <DesigFormModal open={formModal} onClose={() => setFormModal(false)} existing={editTarget} onSuccess={load} />
      <DeleteConfirmModal open={!!delTarget} onClose={() => setDelTarget(null)} target={delTarget} onSuccess={load} />
    </div>
  );
}
