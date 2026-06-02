/**
 * pages/Holidays.jsx
 * Holiday list filtered by current year by default.
 * Add/Edit/Delete with confirmation modal.
 * Mirrors holidays.php + add_holiday.php
 * Shows: #, Title, Holiday Date, Day (of week), Actions
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import api from '../utils/api';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

// ─── Month badge colours ─────────────────────────────────────
const MONTH_COLORS = [
  'bg-red-50 text-red-700', 'bg-pink-50 text-pink-700',
  'bg-violet-50 text-violet-700', 'bg-indigo-50 text-indigo-700',
  'bg-blue-50 text-blue-700', 'bg-cyan-50 text-cyan-700',
  'bg-teal-50 text-teal-700', 'bg-emerald-50 text-emerald-700',
  'bg-lime-50 text-lime-700', 'bg-amber-50 text-amber-700',
  'bg-orange-50 text-orange-700', 'bg-rose-50 text-rose-700',
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Holiday Form Modal ──────────────────────────────────────

function HolidayFormModal({ open, onClose, existing, onSuccess }) {
  const [name, setName]       = useState('');
  const [date, setDate]       = useState('');
  const [saving, setSaving]   = useState(false);
  const isEdit = !!existing;

  useEffect(() => {
    setName(existing?.name ?? '');
    // Normalise date to YYYY-MM-DD for the input
    if (existing?.holiday_date) {
      setDate(existing.holiday_date.substring(0, 10));
    } else {
      setDate('');
    }
  }, [existing, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Holiday name is required.'); return; }
    if (!date)        { toast.error('Holiday date is required.'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), holiday_date: date };
      if (isEdit) {
        await api.put(`/holidays/${existing.id}`, payload);
        toast.success('Holiday updated.');
      } else {
        await api.post('/holidays', payload);
        toast.success('Holiday added.');
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
      title={isEdit ? 'Edit Holiday' : 'Add Holiday'}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button form="holiday-form" type="submit" disabled={saving} className="btn-primary btn-sm">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Holiday'}
          </button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Holiday Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Christmas Day"
            required
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Holiday Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input"
          />
        </div>
      </form>
    </Modal>
  );
}

// ─── Delete Confirm Modal ────────────────────────────────────

function DeleteConfirmModal({ open, onClose, target, onSuccess }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/holidays/${target.id}`);
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
      open={open} onClose={onClose} title="Delete Holiday" size="sm"
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
        Delete <span className="font-semibold text-surface-900">"{target?.name}"</span>?
      </p>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function Holidays() {
  const currentYear = new Date().getFullYear();
  const [holidays, setHolidays]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [formModal, setFormModal]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [delTarget, setDelTarget]   = useState(null);
  const { isAdmin, isHR } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/holidays?year=${yearFilter}`);
      setHolidays(res.data || []);
    } catch {
      toast.error('Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  }, [yearFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditTarget(null); setFormModal(true); };
  const openEdit = (h) => { setEditTarget(h); setFormModal(true); };

  // Build year options: current year ± 3
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  // Upcoming holidays (on or after today) highlighted
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingCount  = holidays.filter(h => new Date(h.holiday_date) >= today).length;
  const pastCount      = holidays.filter(h => new Date(h.holiday_date) < today).length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Holidays</h1>
          <nav className="breadcrumb mt-1">
            <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>
            <span>/</span>
            <span className="text-surface-600">Holidays</span>
          </nav>
        </div>
        {isHR && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Holiday
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: `Total in ${yearFilter}`, value: holidays.length,   color: 'text-surface-900' },
          { label: 'Upcoming',               value: upcomingCount,      color: 'text-brand-600' },
          { label: 'Past',                   value: pastCount,          color: 'text-surface-400' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={clsx('text-2xl font-display font-bold', s.color)}>{s.value}</p>
            <p className="text-sm text-surface-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Year filter */}
      <div className="card p-3 flex items-center gap-3">
        <span className="text-sm text-surface-500">Year:</span>
        <div className="flex items-center gap-1">
          {yearOptions.map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(String(y))}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                String(y) === yearFilter
                  ? 'bg-brand-600 text-white'
                  : 'hover:bg-surface-100 text-surface-600'
              )}
            >
              {y}
            </button>
          ))}
          <button
            onClick={() => setYearFilter('all')}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              yearFilter === 'all'
                ? 'bg-brand-600 text-white'
                : 'hover:bg-surface-100 text-surface-600'
            )}
          >
            All
          </button>
        </div>
      </div>

      {/* Holiday Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Day</th>
                <th>Month</th>
                <th>Status</th>
                {isHR && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {[...Array(isHR ? 7 : 6)].map((__, j) => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : holidays.length === 0 ? (
                <tr>
                  <td colSpan={isHR ? 7 : 6} className="text-center py-12 text-surface-400">
                    No holidays found for {yearFilter === 'all' ? 'any year' : yearFilter}.
                  </td>
                </tr>
              ) : (
                holidays.map((h, idx) => {
                  const dateObj   = new Date(h.holiday_date);
                  const isUpcoming = dateObj >= today;
                  const monthIdx  = dateObj.getMonth();

                  return (
                    <tr
                      key={h.id}
                      className={clsx(isUpcoming && 'bg-emerald-50/40 hover:bg-emerald-50/60')}
                    >
                      <td className="text-surface-400 text-xs">{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                            <CalendarDaysIcon className="w-4 h-4 text-brand-600" />
                          </div>
                          <span className="font-medium text-surface-900">{h.name}</span>
                        </div>
                      </td>
                      <td className="text-surface-700">
                        {format(parseISO(h.holidayDate.substring(0, 10)), 'dd MMM yyyy')}
                      </td>
                      <td className="text-surface-600">{h.day_of_week}</td>
                      <td>
                        <span className={clsx('badge text-xs font-semibold', MONTH_COLORS[monthIdx])}>
                          {MONTHS[monthIdx]}
                        </span>
                      </td>
                      <td>
                        {isUpcoming
                          ? <span className="badge badge-success">Upcoming</span>
                          : <span className="badge badge-neutral">Past</span>
                        }
                      </td>
                      {isHR && (
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => openEdit(h)} title="Edit"
                              className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-brand-600">
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button onClick={() => setDelTarget(h)} title="Delete"
                                className="btn-ghost btn-icon w-8 h-8 text-surface-400 hover:text-red-500">
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HolidayFormModal open={formModal} onClose={() => setFormModal(false)} existing={editTarget} onSuccess={load} />
      <DeleteConfirmModal open={!!delTarget} onClose={() => setDelTarget(null)} target={delTarget} onSuccess={load} />
    </div>
  );
}
