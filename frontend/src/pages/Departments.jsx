/**
 * pages/Departments.jsx
 * Full CRUD: list, add, edit, delete departments.
 * Shows employee count and designation count per department.
 * Mirrors departments.php → add_department.php / edit_department.php
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon, PencilIcon, TrashIcon,
  BuildingOfficeIcon, UsersIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { useAuth } from '../context/AuthContext';

// ─── Sub-components ──────────────────────────────────────────

function DeptFormModal({ open, onClose, existing, onSuccess }) {
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);
  const isEdit = !!existing;

  useEffect(() => {
    setName(existing?.name ?? '');
  }, [existing, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Department name is required.'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/departments/${existing.id}`, { name: name.trim() });
        toast.success('Department updated.');
      } else {
        await api.post('/departments', { name: name.trim() });
        toast.success('Department added.');
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
      title={isEdit ? 'Edit Department' : 'Add Department'}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            form="dept-form"
            type="submit"
            disabled={saving}
            className="btn-primary btn-sm"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Department'}
          </button>
        </>
      }
    >
      <form id="dept-form" onSubmit={handleSubmit}>
        <label className="label">
          Department Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Engineering"
          required
          className="input"
          autoFocus
        />
      </form>
    </Modal>
  );
}

function DeleteConfirmModal({ open, onClose, target, onSuccess }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/departments/${target.id}`);
      toast.success(`"${target.name}" deleted.`);
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
      open={open}
      onClose={onClose}
      title="Delete Department"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-sm bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </>
      }
    >
      <p className="text-surface-600 text-sm">
        Are you sure you want to delete{' '}
        <span className="font-semibold text-surface-900">"{target?.name}"</span>?
      </p>
      <p className="text-surface-400 text-xs mt-2">
        This action cannot be undone. Departments with active employees cannot be deleted.
      </p>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [formModal, setFormModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null); // null = add, obj = edit
  const [delTarget, setDelTarget]     = useState(null);
  const { isAdmin, isHR } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/departments');
      setDepartments(res.data || []);
    } catch {
      toast.error('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditTarget(null); setFormModal(true); };
  const openEdit = (dept) => { setEditTarget(dept); setFormModal(true); };

  const columns = [
    {
      key: 'name',
      label: 'Department Name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-4 h-4 text-brand-600" />
          </div>
          <span className="font-medium text-surface-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'designation_count',
      label: 'Designations',
      sortable: true,
      render: (_, val) => (
        <span className="badge badge-info">{val ?? 0}</span>
      ),
    },
    {
      key: 'employee_count',
      label: 'Employees',
      sortable: true,
      render: (_, val) => (
        <div className="flex items-center gap-1.5 text-surface-600">
          <UsersIcon className="w-3.5 h-3.5 text-surface-400" />
          <span>{val ?? 0}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {isHR && (
            <button
              onClick={() => openEdit(row)}
              title="Edit"
              className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-brand-600"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setDelTarget(row)}
              title="Delete"
              className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-red-500"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Departments</h1>
          <nav className="breadcrumb mt-1">
            <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>
            <span>/</span>
            <span className="text-surface-600">Departments</span>
          </nav>
        </div>
        {isHR && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Department
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Departments', value: departments.length, color: 'text-surface-900' },
          { label: 'Total Designations', value: departments.reduce((s, d) => s + parseInt(d.designation_count || 0), 0), color: 'text-brand-600' },
          { label: 'Employees Covered', value: departments.reduce((s, d) => s + parseInt(d.employee_count || 0), 0), color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={clsx('text-2xl font-display font-bold', s.color)}>{s.value}</p>
            <p className="text-sm text-surface-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        pageSize={15}
        emptyMessage="No departments found. Add your first department."
      />

      {/* Add / Edit Modal */}
      <DeptFormModal
        open={formModal}
        onClose={() => setFormModal(false)}
        existing={editTarget}
        onSuccess={load}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        target={delTarget}
        onSuccess={load}
      />
    </div>
  );
}
