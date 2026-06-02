/**
 * pages/accounts/Invoices.jsx
 * Invoice list with date/status filters, links to CreateInvoice.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { invoicesApi } from '../../utils/accountsApi';
import Modal from '../../components/ui/Modal';

const STATUS_BADGE = {
  draft: 'badge-info',
  sent: 'badge-info',
  paid: 'badge-success',
  partially_paid: 'badge-warning',
  cancelled: 'bg-surface-100 text-surface-500',
};

const STATUS_LABEL = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid',
  partially_paid: 'Partially Paid', cancelled: 'Cancelled',
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState({ from: '', to: '', status: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.status) params.status = filters.status;
      const res = await invoicesApi.getAll(params);
      setInvoices(res.data || []);
      setTotal(res.total || 0);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleFilter = (e) => {
    setFilters(f => ({ ...f, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await invoicesApi.remove(delTarget.id);
      await load();
      setDelTarget(null);
    } catch { /* interceptor */ }
    finally { setDeleting(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Invoices</h1>
          <p className="text-sm text-surface-500 mt-0.5">Dashboard / Invoices</p>
        </div>
        <Link to="/invoices/create" className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Filter bar */}
      <div className="card p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-surface-500 mb-1">From</label>
          <input type="date" name="from" value={filters.from} onChange={handleFilter}
            className="input w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs text-surface-500 mb-1">To</label>
          <input type="date" name="to" value={filters.to} onChange={handleFilter}
            className="input w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs text-surface-500 mb-1">Status</label>
          <select name="status" value={filters.status} onChange={handleFilter}
            className="input w-full text-sm">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={() => { setFilters({ from: '', to: '', status: '' }); setPage(1); }}
            className="btn-secondary w-full text-sm">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Invoice Number</th>
                <th>Client</th>
                <th>Created Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>{[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-surface-400 py-10">No invoices found</td></tr>
              ) : invoices.map((inv, i) => (
                <tr key={inv.id}>
                  <td className="text-surface-400">{(page - 1) * LIMIT + i + 1}</td>
                  <td>
                    <Link to={`/invoices/${inv.id}`}
                      className="font-medium text-brand-600 hover:text-brand-700">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium text-surface-800">{inv.client_name}</div>
                    <div className="text-xs text-surface-400">{inv.client_company}</div>
                  </td>
                  <td className="text-sm">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                  <td className="text-sm">{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td className="font-medium">${parseFloat(inv.grand_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[inv.status] || 'badge-info'}`}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/invoices/${inv.id}`}
                        className="btn-ghost btn-icon text-surface-400 hover:text-brand-600">
                        <EyeIcon className="w-4 h-4" />
                      </Link>
                      <Link to={`/invoices/${inv.id}/edit`}
                        className="btn-ghost btn-icon text-surface-400 hover:text-amber-600">
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button onClick={() => setDelTarget(inv)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-surface-100 flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`px-3 py-1 text-sm rounded-lg ${p === page
                    ? 'bg-brand-600 text-white' : 'btn-ghost text-surface-600'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete Invoice" size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setDelTarget(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={deleting}
              className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        }>
        <p className="text-surface-600">
          Delete invoice <strong>{delTarget?.invoice_number}</strong>? This will also delete all line items. Payments recorded against this invoice will also be removed.
        </p>
      </Modal>
    </div>
  );
}