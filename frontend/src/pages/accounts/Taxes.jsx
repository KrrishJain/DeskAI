/**
 * pages/accounts/Taxes.jsx
 * Lists all taxes with Add / Edit / Delete / status toggle.
 */

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { taxesApi } from '../../utils/accountsApi';
import Modal from '../../components/ui/Modal';

const EMPTY_FORM = { name: '', percentage: '', status: 'active' };

export default function Taxes() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taxesApi.getAll();
      setTaxes(res.data || []);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm(EMPTY_FORM); setError(''); setModal('add'); };
  const openEdit = (t) => {
    setSelected(t);
    setForm({ name: t.name, percentage: t.percentage, status: t.status });
    setError('');
    setModal('edit');
  };
  const openDelete = (t) => { setSelected(t); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); setError(''); };

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return 'Tax name is required.';
    if (form.percentage === '' || isNaN(form.percentage)) return 'Percentage must be a number.';
    if (form.percentage < 0 || form.percentage > 100) return 'Percentage must be 0–100.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    try {
      const payload = { name: form.name.trim(), percentage: parseFloat(form.percentage), status: form.status };
      if (modal === 'add') await taxesApi.create(payload);
      else await taxesApi.update(selected.id, payload);
      await load();
      closeModal();
    } catch (ex) {
      setError(ex.response?.data?.message || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await taxesApi.remove(selected.id);
      await load();
      closeModal();
    } catch (ex) {
      setError(ex.response?.data?.message || 'Could not delete tax.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (t) => {
    try {
      await taxesApi.toggleStatus(t.id);
      await load();
    } catch { /* interceptor handles */ }
  };

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Taxes</h1>
          <p className="text-sm text-surface-500 mt-0.5">Dashboard / Taxes</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Add Tax
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Tax Name</th>
                <th>Percentage (%)</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    {[1, 2, 3, 4, 5].map(j => (
                      <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : taxes.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-surface-400 py-8">No taxes found</td></tr>
              ) : taxes.map((t, i) => (
                <tr key={t.id}>
                  <td className="text-surface-400">{i + 1}</td>
                  <td className="font-medium text-surface-800">{t.name}</td>
                  <td>{t.percentage}%</td>
                  <td>
                    <button
                      onClick={() => handleToggle(t)}
                      className={`badge cursor-pointer transition-colors ${t.status === 'active'
                          ? 'badge-success hover:bg-emerald-200'
                          : 'badge-warning hover:bg-amber-200'
                        }`}
                    >
                      {t.status === 'active' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(t)}
                        className="btn-ghost btn-icon text-surface-400 hover:text-brand-600">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => openDelete(t)}
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
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modal === 'add' || modal === 'edit'}
        onClose={closeModal}
        title={modal === 'add' ? 'Add Tax' : 'Edit Tax'}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
            <button type="submit" form="tax-form" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : modal === 'add' ? 'Submit' : 'Save'}
            </button>
          </div>
        }
      >
        <form id="tax-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Tax Name <span className="text-red-500">*</span>
            </label>
            <input name="name" value={form.name} onChange={handleChange}
              className="input w-full" placeholder="e.g. VAT" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Percentage (%) <span className="text-red-500">*</span>
            </label>
            <input name="percentage" value={form.percentage} onChange={handleChange}
              type="number" min="0" max="100" step="0.01"
              className="input w-full" placeholder="e.g. 14" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select name="status" value={form.status} onChange={handleChange} className="input w-full">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={modal === 'delete'}
        onClose={closeModal}
        title="Delete Tax"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={saving}
              className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500">
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        }
      >
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <p className="text-surface-600">
          Are you sure you want to delete <strong>{selected?.name}</strong>?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}