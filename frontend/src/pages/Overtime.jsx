/**
 * pages/Overtime.jsx
 * Full CRUD for overtime records.
 * Add/Edit modal: employee selector (from DB), OT date, type, hours, description.
 * Stats: Overtime Employees & Hours this month (from backend).
 * Mirrors overtime.php + add_overtime.php
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon, PencilIcon, TrashIcon, ClockIcon,
  UserIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import DataTable from '../components/ui/DataTable';
import { useAuth } from '../context/AuthContext';

const OT_TYPES = [
  'Regular', 'Weekend', 'Public Holiday', 'Night Shift', 'Emergency', 'Project Deadline', 'Other',
];

const EMPTY_FORM = {
  employee_id: '', overtime_date: '', hours: '', type: '', description: '',
};

// ─── Overtime Form Modal ─────────────────────────────────────

function OvertimeFormModal({ open, onClose, existing, onSuccess }) {
  const [form, setForm]         = useState(EMPTY_FORM);
  const [employees, setEmps]    = useState([]);
  const [loadingEmps, setLoadE] = useState(false);
  const [saving, setSaving]     = useState(false);
  const isEdit = !!existing;

  // Load employees every time modal opens
  useEffect(() => {
    if (!open) return;
    setLoadE(true);
    api.get('/employees?limit=500')
      .then((res) => setEmps(res.data || []))
      .catch(() => toast.error('Could not load employees.'))
      .finally(() => setLoadE(false));
  }, [open]);

  // Populate form when editing
  useEffect(() => {
    if (existing) {
      setForm({
        employee_id:   String(existing.employee_id),
        overtime_date: existing.overtime_date?.substring(0, 10) ?? '',
        hours:         String(existing.hours),
        type:          existing.type,
        description:   existing.description ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [existing, open]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employee_id)   { toast.error('Employee is required.'); return; }
    if (!form.overtime_date) { toast.error('OT date is required.'); return; }
    if (!form.hours || parseFloat(form.hours) <= 0) { toast.error('Hours must be > 0.'); return; }
    if (!form.type)          { toast.error('OT type is required.'); return; }

    setSaving(true);
    try {
      const payload = {
        employee_id:   parseInt(form.employee_id),
        overtime_date: form.overtime_date,
        hours:         parseFloat(form.hours),
        type:          form.type,
        description:   form.description || null,
      };
      if (isEdit) {
        await api.put(`/overtime/${existing.id}`, payload);
        toast.success('Overtime record updated.');
      } else {
        await api.post('/overtime', payload);
        toast.success('Overtime record added.');
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
      title={isEdit ? 'Edit Overtime' : 'Add Overtime'}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button form="ot-form" type="submit" disabled={saving || loadingEmps} className="btn-primary btn-sm">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Overtime'}
          </button>
        </>
      }
    >
      <form id="ot-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Employee selector */}
        <div>
          <label className="label">Select Employee <span className="text-red-500">*</span></label>
          <select value={form.employee_id} onChange={set('employee_id')} required className="input" disabled={loadingEmps}>
            <option value="">{loadingEmps ? 'Loading employees…' : '— Select Employee —'}</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
                {emp.employee_id ? ` (${emp.employee_id})` : ''}
                {emp.department ? ` — ${emp.department}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date + Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Overtime Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.overtime_date} onChange={set('overtime_date')} required className="input" />
          </div>
          <div>
            <label className="label">Overtime Hours <span className="text-red-500">*</span></label>
            <input
              type="number" min="0.5" max="24" step="0.5"
              value={form.hours} onChange={set('hours')}
              required placeholder="e.g. 2.5" className="input"
            />
          </div>
        </div>

        {/* OT Type */}
        <div>
          <label className="label">Overtime Type <span className="text-red-500">*</span></label>
          <select value={form.type} onChange={set('type')} required className="input">
            <option value="">— Select Type —</option>
            {OT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Reason for overtime…"
            className="input resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Confirm ──────────────────────────────────────────

function DeleteConfirmModal({ open, onClose, target, onSuccess }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/overtime/${target.id}`);
      toast.success('Overtime record deleted.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Delete Overtime" size="sm"
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
        Delete overtime record for{' '}
        <span className="font-semibold text-surface-900">
          {target?.first_name} {target?.last_name}
        </span>{' '}
        on {target?.overtime_date?.substring(0, 10)}?
      </p>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function Overtime() {
  const [records, setRecords]   = useState([]);
  const [stats, setStats]       = useState({ overtime_employees: 0, overtime_hours: 0 });
  const [loading, setLoading]   = useState(true);
  const [formModal, setForm]    = useState(false);
  const [editTarget, setEdit]   = useState(null);
  const [delTarget, setDel]     = useState(null);
  const { isAdmin, isHR } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/overtime');
      setRecords(res.data || []);
      if (res.stats) setStats(res.stats);
    } catch {
      toast.error('Failed to load overtime records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEdit(null); setForm(true); };
  const openEdit = (r) => { setEdit(r); setForm(true); };

  const columns = [
    {
      key: 'first_name',
      label: 'Employee',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            {row.picture ? (
              <img src={`/uploads/${row.picture}`} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-brand-700">
                {row.first_name?.[0]}{row.last_name?.[0]}
              </span>
            )}
          </div>
          <div>
            <p className="font-medium text-surface-900 text-sm">
              {row.first_name} {row.last_name}
            </p>
            <p className="text-xs text-surface-400">{row.department || row.emp_code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'overtime_date',
      label: 'OT Date',
      sortable: true,
      render: (_, val) => val
        ? format(parseISO(val.substring(0, 10)), 'dd MMM yyyy')
        : '—',
    },
    {
      key: 'hours',
      label: 'OT Hours',
      sortable: true,
      className: 'text-center',
      render: (row, val) => (
        <div className="flex items-center justify-center gap-1">
          <ClockIcon className="w-3.5 h-3.5 text-surface-400" />
          <span className="font-semibold text-surface-800">{parseFloat(val).toFixed(1)}</span>
          <span className="text-surface-400 text-xs">hrs</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'OT Type',
      sortable: true,
      render: (_, val) => <span className="badge badge-info">{val}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      render: (_, val) => (
        <span className="text-surface-500 text-sm line-clamp-1 max-w-xs">{val || '—'}</span>
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
          {isHR && (
            <button onClick={() => setDel(row)} title="Delete"
              className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-red-500">
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const totalHours = records.reduce((s, r) => s + parseFloat(r.hours || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Overtime</h1>
          <nav className="breadcrumb mt-1">
            <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>
            <span>/</span>
            <span className="text-surface-600">Overtime</span>
          </nav>
        </div>
        {isHR && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Overtime
          </button>
        )}
      </div>

      {/* Stats — mirrors overtime.php statistics block */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            icon: UserIcon,
            label: 'OT Employees',
            sub: 'this month',
            value: stats.overtime_employees,
            color: 'text-brand-600',
            bg: 'bg-brand-50',
          },
          {
            icon: ClockIcon,
            label: 'OT Hours',
            sub: 'this month',
            value: `${stats.overtime_hours}h`,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
          {
            icon: ChartBarIcon,
            label: 'Total Records',
            sub: 'all time',
            value: records.length,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            icon: ClockIcon,
            label: 'Total Hours',
            sub: 'all time',
            value: `${totalHours.toFixed(1)}h`,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.bg)}>
              <s.icon className={clsx('w-5 h-5', s.color)} />
            </div>
            <div>
              <p className={clsx('text-xl font-display font-bold leading-none', s.color)}>{s.value}</p>
              <p className="text-xs text-surface-500 mt-0.5">{s.label}</p>
              <p className="text-xs text-surface-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        pageSize={12}
        emptyMessage="No overtime records found. Add the first one."
      />

      <OvertimeFormModal open={formModal} onClose={() => setForm(false)} existing={editTarget} onSuccess={load} />
      <DeleteConfirmModal open={!!delTarget} onClose={() => setDel(null)} target={delTarget} onSuccess={load} />
    </div>
  );
}
