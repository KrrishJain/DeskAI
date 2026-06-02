/**
 * pages/accounts/Payments.jsx
 * Read-only view of all payments recorded against invoices.
 * Payments are created via the Invoice detail view.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../utils/accountsApi';

const TYPE_LABEL = {
  paypal: 'PayPal', bank_transfer: 'Bank Transfer', cash: 'Cash',
  cheque: 'Cheque', credit_card: 'Credit Card', other: 'Other',
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.getAll({ page, limit: LIMIT });
      setPayments(res.data || []);
      setTotal(res.total || 0);
    } catch { /* interceptor */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Payments</h1>
        <p className="text-sm text-surface-500 mt-0.5">Dashboard / Payments</p>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Client</th>
                <th>Payment Type</th>
                <th>Paid Date</th>
                <th>Paid Amount</th>
                <th>Invoice Total</th>
                <th>Invoice Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <tr key={i}>{[1, 2, 3, 4, 5, 6, 7].map(j => (
                    <td key={j}><div className="h-4 bg-surface-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-surface-400 py-10">No payments recorded</td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/accounts/invoices/${p.invoice_number?.replace('#INV-', '')}`}
                      className="font-medium text-brand-600 hover:text-brand-700">
                      {p.invoice_number}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium text-surface-800">{p.client_name}</div>
                    <div className="text-xs text-surface-400">{p.client_company}</div>
                  </td>
                  <td className="text-sm">{TYPE_LABEL[p.payment_type] || p.payment_type}</td>
                  <td className="text-sm">{new Date(p.paid_date).toLocaleDateString()}</td>
                  <td className="font-semibold text-emerald-600">
                    ${parseFloat(p.paid_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-surface-600">
                    ${parseFloat(p.invoice_total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={`badge ${p.invoice_status === 'paid'
                      ? 'badge-success' : p.invoice_status === 'partially_paid'
                        ? 'badge-warning' : 'badge-info'}`}>
                      {p.invoice_status?.replace('_', ' ')}
                    </span>
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
                  className={`px-3 py-1 text-sm rounded-lg ${p === page
                    ? 'bg-brand-600 text-white' : 'btn-ghost text-surface-600'}`}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}