/**
 * pages/accounts/Expenses.jsx
 * Fixed: openEdit uses purchased_by not employee_id
 * Fixed: employee dropdown uses camelCase (firstName/lastName)
 */

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { expensesApi } from '../../utils/accountsApi';
import Modal from '../../components/ui/Modal';
import api from '../../utils/api';

const EMPTY_FORM = {
  item_name: '', purchase_from: '', purchase_date: '',
  purchased_by: '', amount: '', paid_by: 'cash', status: 'pending',
};

const STATUS_BADGE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-error' };
const PAID_BY_LABEL = { cash: 'Cash', cheque: 'Cheque', card: 'Card', bank_transfer: 'Bank Transfer' };

// ✅ helper: works with both camelCase and snake_case from API
const empName = (e) =>
  `${e.firstName ?? e.first_name ?? ''} ${e.lastName ?? e.last_name ?? ''}`.trim() || `Employee #${e.id}`;

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
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

  const [filters, setFilters] = useState({
    item_name: '', purchased_by: '', paid_by: '', status: '', from: '', to: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await expensesApi.getAll(params);
      setExpenses(res.data || []);
      setTotal(res.total || 0);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/employees')
      .then(r => setEmployees(r.data || []))
      .catch(() => {});
  }, []);

  const openAdd = () => { setForm(EMPTY_FORM); setError(''); setModal('add'); };

  // ✅ Fixed: use purchased_by (integer FK) not employee_id
  const openEdit = (e) => {
    setSelected(e);
    setForm({
      item_name:     e.item_name     || '',
      purchase_from: e.purchase_from || '',
      purchase_date: (e.purchase_date || '').split('T')[0],
      purchased_by:  e.purchased_by  || '',
      amount:        e.amount        || '',
      paid_by:       e.paid_by       || 'cash',
      status:        e.status        || 'pending',
    });
    setError('');
    setModal('edit');
  };

  const openDelete = (e) => { setSelected(e); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setError(''); };
  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.item_name.trim())    return 'Item name is required.';
    if (!form.purchase_from.trim()) return 'Purchase from is required.';
    if (!form.purchase_date)       return 'Purchase date is required.';
    if (!form.purchased_by)        return 'Purchased by is required.';
    if (!form.amount || parseFloat(form.amount) <= 0) return 'Amount must be positive.';
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
        ...form,
        amount:       parseFloat(form.amount),
        purchased_by: parseInt(form.purchased_by),
      };
      if (modal === 'add') await expensesApi.create(payload);
      else await expensesApi.update(selected.id, payload);
      await load();
      closeModal();
    } catch (ex) {
      setError(ex.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await expensesApi.remove(selected.id);
      await load();
      closeModal();
    } catch { /* interceptor */ }
    finally { setSaving(false); }
  };

  const handleStatusToggle = async (exp) => {
    const next = exp.status === 'pending' ? 'approved' : 'pending';
    try {
      await expensesApi.updateStatus(exp.id, next);
      await load();
    } catch { /* interceptor */ }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Expenses</h1>
          <p className="text-sm text-surface-500 mt-0.5">Dashboard / Expenses</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <input name="item_name" value={filters.item_name}
          onChange={e => setFilters(f => ({ ...f, item_name: e.target.value }))}
          className="input text-sm" placeholder="Item name" />

        {/* ✅ Fixed: uses empName() helper */}
        <select name="purchased_by" value={filters.purchased_by}
          onChange={e => setFilters(f => ({ ...f, purchased_by: e.target.value }))}
          className="input text-sm">
          <option value="">Purchased By</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{empName(e)}</option>
          ))}
        </select>

        <select name="paid_by" value={filters.paid_by}
          onChange={e => setFilters(f => ({ ...f, paid_by: e.target.value }))}
          className="input text-sm">
          <option value="">Paid By</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>

        <input type="date" name="from" value={filters.from}
          onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
          className="input text-sm" />
        <input type="date" name="to" value={filters.to}
          onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
          className="input text-sm" />
        <button
          onClick={() => setFilters({ item_name: '', purchased_by: '', paid_by: '', status: '', from: '', to: '' })}
          className="btn-secondary text-sm">Clear</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Item</th>
                <th>Purchase From</th>
                <th>Purchase Date</th>
                <th>Purchased By</th>
                <th>Amount</th>
                <th>Paid By</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>{[1,2,3,4,5,6,7,8].map(j => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : expenses.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-surface-400 py-10">No expenses found</td></tr>
              ) : expenses.map(exp => (
                <tr key={exp.id}>
                  <td className="font-medium text-surface-800">{exp.item_name}</td>
                  <td className="text-sm text-surface-600">{exp.purchase_from}</td>
                  <td className="text-sm">{new Date(exp.purchase_date).toLocaleDateString()}</td>
                  <td className="text-sm">{exp.employee_name}</td>
                  <td className="font-medium">
                    ${parseFloat(exp.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-sm">{PAID_BY_LABEL[exp.paid_by] || exp.paid_by}</td>
                  <td>
                    <button onClick={() => handleStatusToggle(exp)}
                      className={`badge cursor-pointer transition-colors ${STATUS_BADGE[exp.status] || 'badge-info'}`}>
                      {exp.status.charAt(0).toUpperCase() + exp.status.slice(1)}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(exp)}
                        className="btn-ghost btn-icon text-surface-400 hover:text-amber-600">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDelete(exp)}
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
            <p className="text-sm text-surface-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 text-sm rounded-lg ${p === page ? 'bg-brand-600 text-white' : 'btn-ghost text-surface-600'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={closeModal}
        title={modal === 'add' ? 'Add Expense' : 'Edit Expense'} size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" form="expense-form" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : modal === 'add' ? 'Submit' : 'Save'}
            </button>
          </div>
        }>
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Item Name</label>
              <input name="item_name" value={form.item_name} onChange={handleChange} className="input w-full" />
            </div>
            <div>
              <label className="label">Purchase From</label>
              <input name="purchase_from" value={form.purchase_from} onChange={handleChange} className="input w-full" />
            </div>
            <div>
              <label className="label">Purchase Date</label>
              <input type="date" name="purchase_date" value={form.purchase_date} onChange={handleChange} className="input w-full" />
            </div>
            <div>
              <label className="label">Purchased By</label>
              {/* ✅ Fixed: uses empName() helper */}
              <select name="purchased_by" value={form.purchased_by} onChange={handleChange} className="input w-full">
                <option value="">Select Employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{empName(e)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" name="amount" min="0" step="0.01"
                value={form.amount} onChange={handleChange}
                className="input w-full" placeholder="0.00" />
            </div>
            <div>
              <label className="label">Paid By</label>
              <select name="paid_by" value={form.paid_by} onChange={handleChange} className="input w-full">
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input w-full">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={modal === 'delete'} onClose={closeModal} title="Delete Expense" size="sm"
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
          Delete expense <strong>{selected?.item_name}</strong>?
        </p>
      </Modal>
    </div>
  );
}