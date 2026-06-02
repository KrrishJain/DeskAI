/**
 * pages/accounts/ProvidentFund.jsx
 *
 * Modal form switches between two modes:
 *   Fixed Amount        → shows Employee Share (Amount) + Org Share (Amount)
 *   % of Basic Salary   → shows Employee Share (%) + Org Share (%)
 *
 * This mirrors the original PHP modal's .show-fixed-amount / .show-basic-salary behaviour.
 */

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { pfApi } from '../../utils/accountsApi';
import Modal from '../../components/ui/Modal';
import api from '../../utils/api';

const EMPTY_FORM = {
  employee_id: '', pf_type: 'fixed_amount',
  employee_share_amt: '', org_share_amt: '',
  employee_share_pct: '', org_share_pct: '',
  description: '', status: 'pending',
};

export default function ProvidentFund() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const isFixed = form.pf_type === 'fixed_amount';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await pfApi.getAll({ page, limit: LIMIT });
      setRecords(res.data || []);
      setTotal(res.total || 0);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => { });
  }, []);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setError('');
    setModal('add');
  };

  const openEdit = (r) => {
    setSelected(r);
    setForm({
      employee_id: r.employee_id,
      pf_type: r.pf_type,
      employee_share_amt: r.employee_share_amt || '',
      org_share_amt: r.org_share_amt || '',
      employee_share_pct: r.employee_share_pct || '',
      org_share_pct: r.org_share_pct || '',
      description: r.description || '',
      status: r.status,
    });
    setError('');
    setModal('edit');
  };

  const openDelete = (r) => { setSelected(r); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setError(''); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.employee_id) return 'Please select an employee.';
    if (isFixed) {
      if (form.employee_share_amt === '' || isNaN(form.employee_share_amt))
        return 'Employee share amount is required.';
      if (form.org_share_amt === '' || isNaN(form.org_share_amt))
        return 'Organisation share amount is required.';
    } else {
      if (form.employee_share_pct === '' || isNaN(form.employee_share_pct))
        return 'Employee share % is required.';
      if (form.org_share_pct === '' || isNaN(form.org_share_pct))
        return 'Organisation share % is required.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        employee_id: parseInt(form.employee_id),
        pf_type: form.pf_type,
        employee_share_amt: isFixed ? parseFloat(form.employee_share_amt) : 0,
        org_share_amt: isFixed ? parseFloat(form.org_share_amt) : 0,
        employee_share_pct: !isFixed ? parseFloat(form.employee_share_pct) : 0,
        org_share_pct: !isFixed ? parseFloat(form.org_share_pct) : 0,
        description: form.description,
        status: form.status,
      };
      if (modal === 'add') await pfApi.create(payload);
      else await pfApi.update(selected.id, payload);
      await load();
      closeModal();
    } catch (ex) {
      setError(ex.response?.data?.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await pfApi.remove(selected.id);
      await load();
      closeModal();
    } catch { /* interceptor */ }
    finally { setSaving(false); }
  };

  const handleStatusToggle = async (r) => {
    const next = r.status === 'pending' ? 'approved' : 'pending';
    try { await pfApi.updateStatus(r.id, next); await load(); } catch { /* interceptor */ }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Provident Fund</h1>
          <p className="text-sm text-surface-500 mt-0.5">Dashboard / Provident Fund</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Provident Fund
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>PF Type</th>
                <th>Employee Share</th>
                <th>Organisation Share</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>{[1, 2, 3, 4, 5, 6].map(j => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-surface-400 py-10">No provident fund records</td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="font-medium text-surface-800">{r.employee_name}</div>
                    <div className="text-xs text-surface-400">{r.designation}</div>
                  </td>
                  <td className="text-sm text-surface-600">
                    {r.pf_type === 'fixed_amount' ? 'Fixed Amount' : 'Percentage of Basic Salary'}
                  </td>
                  <td className="text-sm">
                    {r.pf_type === 'fixed_amount'
                      ? `$${parseFloat(r.employee_share_amt).toFixed(2)}`
                      : `${r.employee_share_pct}%`}
                    {r.pf_type === 'percentage_of_basic' && r.resolved_employee_share > 0 && (
                      <span className="ml-1 text-surface-400">(≈${parseFloat(r.resolved_employee_share).toFixed(2)})</span>
                    )}
                  </td>
                  <td className="text-sm">
                    {r.pf_type === 'fixed_amount'
                      ? `$${parseFloat(r.org_share_amt).toFixed(2)}`
                      : `${r.org_share_pct}%`}
                    {r.pf_type === 'percentage_of_basic' && r.resolved_org_share > 0 && (
                      <span className="ml-1 text-surface-400">(≈${parseFloat(r.resolved_org_share).toFixed(2)})</span>
                    )}
                  </td>
                  <td>
                    <button onClick={() => handleStatusToggle(r)}
                      className={`badge cursor-pointer transition-colors ${r.status === 'approved' ? 'badge-success hover:bg-emerald-200' : 'badge-warning hover:bg-amber-200'
                        }`}>
                      {r.status === 'approved' ? 'Approved' : 'Pending'}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(r)}
                        className="btn-ghost btn-icon text-surface-400 hover:text-amber-600">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDelete(r)}
                        className="btn-ghost btn-icon text-surface-400 hover:text-red-500">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
            <p className="text-sm text-surface-500">Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 text-sm rounded-lg ${p === page ? 'bg-brand-600 text-white' : 'btn-ghost text-surface-600'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'add' ? 'Add Provident Fund' : 'Edit Provident Fund'} size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" form="pf-form" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : modal === 'add' ? 'Submit' : 'Save'}
            </button>
          </div>
        }>
        <form id="pf-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Employee Name</label>
              <select name="employee_id" value={form.employee_id} onChange={handleChange}
                className="input w-full">
                <option value="">Select Employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.employee_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Provident Fund Type</label>
              <select name="pf_type" value={form.pf_type} onChange={handleChange}
                className="input w-full">
                <option value="fixed_amount">Fixed Amount</option>
                <option value="percentage_of_basic">Percentage of Basic Salary</option>
              </select>
            </div>
          </div>

          {/* Fixed Amount fields */}
          {isFixed && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div>
                <label className="label">Employee Share (Amount)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" name="employee_share_amt"
                    value={form.employee_share_amt} onChange={handleChange}
                    className="input w-full pl-7" placeholder="0.00" />
                </div>
              </div>
              <div>
                <label className="label">Organisation Share (Amount)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                  <input type="number" min="0" step="0.01" name="org_share_amt"
                    value={form.org_share_amt} onChange={handleChange}
                    className="input w-full pl-7" placeholder="0.00" />
                </div>
              </div>
            </div>
          )}

          {/* Percentage of Basic Salary fields */}
          {!isFixed && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
              <div>
                <label className="label">Employee Share (%)</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.01" name="employee_share_pct"
                    value={form.employee_share_pct} onChange={handleChange}
                    className="input w-full pr-8" placeholder="e.g. 2" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">%</span>
                </div>
              </div>
              <div>
                <label className="label">Organisation Share (%)</label>
                <div className="relative">
                  <input type="number" min="0" max="100" step="0.01" name="org_share_pct"
                    value={form.org_share_pct} onChange={handleChange}
                    className="input w-full pr-8" placeholder="e.g. 2" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">%</span>
                </div>
              </div>
              <p className="col-span-2 text-xs text-surface-400">
                Actual amounts are calculated from the employee's basic salary.
              </p>
            </div>
          )}

          <div>
            <label className="label">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              rows={3} className="input w-full resize-none" />
          </div>

          <div>
            <label className="label">Status</label>
            <select name="status" value={form.status} onChange={handleChange} className="input w-full">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete Record" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={saving}
              className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500">
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        }>
        <p className="text-surface-600">
          Delete provident fund record for <strong>{selected?.employee_name}</strong>?
        </p>
      </Modal>
    </div>
  );
}