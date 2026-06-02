/**
 * pages/accounts/CreateInvoice.jsx
 * Fixed: client/project fields use camelCase to match API response.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { invoicesApi, taxesApi } from '../../utils/accountsApi';
import api from '../../utils/api';

const EMPTY_ITEM = { item_name: '', description: '', unit_cost: '', quantity: '1' };

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    client_id: '',
    project_id: '',
    email: '',
    tax_id: '',
    client_address: '',
    billing_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    discount_pct: '0',
    other_info: '',
    status: 'draft',
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── load lookup data ──────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      try {
        const [cRes, pRes, tRes] = await Promise.all([
          api.get('/clients'),
          api.get('/projects'),
          taxesApi.getActive(),
        ]);
        setClients(cRes.data || []);
        setProjects(pRes.data || []);
        setTaxes(tRes.data || []);
      } catch { /* interceptor */ }
    }
    boot();
  }, []);

  // ── load existing invoice when editing ────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    async function loadInvoice() {
      try {
        const res = await invoicesApi.getById(id);
        const inv = res.data;
        // getById spreads ...invoices (camelCase) + explicit snake_case aliases
        // clientId, invoiceDate, dueDate, discountPct, taxId, otherInfo → camelCase
        // client_email, client_address_default               → snake_case aliases
        setForm({
          client_id:       inv.clientId       || '',
          project_id:      inv.projectId      || '',
          tax_id:          inv.taxId          || '',
          client_address:  inv.clientAddress  || '',
          billing_address: inv.billingAddress || '',
          invoice_date:    (inv.invoiceDate   || '').split('T')[0],
          due_date:        (inv.dueDate       || '').split('T')[0],
          discount_pct:    inv.discountPct    ?? '0',
          other_info:      inv.otherInfo      || '',
          status:          inv.status         || 'draft',
          email:           inv.client_email   || '', // explicit alias from getById
        });
        // items returned with snake_case aliases: item_name, unit_cost
        const lineItems = inv.items?.length
          ? inv.items.map(it => ({
              item_name:   it.item_name   || '',
              description: it.description || '',
              unit_cost:   it.unit_cost   || '',
              quantity:    it.quantity    || '1',
            }))
          : [{ ...EMPTY_ITEM }];
        setItems(lineItems);
      } catch { /* interceptor */ }
      finally { setLoading(false); }
    }
    loadInvoice();
  }, [id, isEdit]);

  // ── auto-populate client email + address when client changes ──────────────
  useEffect(() => {
    if (!form.client_id) return;
    const c = clients.find(c => String(c.id) === String(form.client_id));
    if (c) {
      setForm(f => ({
        ...f,
        // API returns camelCase; fall back to snake_case just in case
        email:          c.email   || '',
        client_address: c.address || '',
      }));
    }
  }, [form.client_id, clients]);

  // ── CALCULATION ENGINE ────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => {
      return sum + (parseFloat(it.unit_cost) || 0) * (parseFloat(it.quantity) || 0);
    }, 0);
    const selectedTax = taxes.find(t => String(t.id) === String(form.tax_id));
    const taxPct    = selectedTax ? parseFloat(selectedTax.percentage) : 0;
    const taxAmount = subtotal * (taxPct / 100);
    const discountPct = parseFloat(form.discount_pct) || 0;
    const discount  = (subtotal + taxAmount) * (discountPct / 100);
    const grandTotal = subtotal + taxAmount - discount;
    return {
      subtotal:   subtotal.toFixed(2),
      taxAmount:  taxAmount.toFixed(2),
      discount:   discount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      taxLabel:   selectedTax ? `Tax (${selectedTax.name} ${taxPct}%)` : 'Tax',
    };
  }, [items, form.tax_id, form.discount_pct, taxes]);

  // ── item helpers ──────────────────────────────────────────────────────────
  const addItem    = () => setItems(it => [...it, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setItems(it => it.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) =>
    setItems(it => it.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  const handleFormChange = (e) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // ── submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (draft = false) => {
    setError('');
    if (!form.client_id)                          return setError('Please select a client.');
    if (!form.invoice_date)                       return setError('Invoice date is required.');
    if (!form.due_date)                           return setError('Due date is required.');
    if (items.every(it => !it.item_name.trim()))  return setError('Add at least one line item.');

    const validItems = items.filter(it => it.item_name.trim());
    const payload = {
      ...form,
      client_id:    parseInt(form.client_id),
      project_id:   form.project_id ? parseInt(form.project_id) : null,
      tax_id:       form.tax_id     ? parseInt(form.tax_id)     : null,
      discount_pct: parseFloat(form.discount_pct) || 0,
      status:       draft ? 'draft' : (form.status || 'sent'),
      items: validItems.map(it => ({
        item_name:   it.item_name,
        description: it.description,
        unit_cost:   parseFloat(it.unit_cost) || 0,
        quantity:    parseFloat(it.quantity)  || 1,
      })),
    };

    setSaving(true);
    try {
      if (isEdit) await invoicesApi.update(id, payload);
      else        await invoicesApi.create(payload);
      navigate('/invoices');
    } catch (ex) {
      setError(ex.response?.data?.message || 'Failed to save invoice.');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ── helper: display name for a client ─────────────────────────────────────
  // API may return camelCase (firstName) or snake_case (first_name)
  const clientName = (c) =>
    `${c.firstName ?? c.first_name ?? ''} ${c.lastName ?? c.last_name ?? ''}`.trim()
    || c.company || `Client #${c.id}`;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">
          {isEdit ? 'Edit Invoice' : 'Create Invoice'}
        </h1>
        <p className="text-sm text-surface-500 mt-0.5">
          Dashboard / {isEdit ? 'Edit Invoice' : 'Create Invoice'}
        </p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="card p-6 space-y-6">

        {/* ── Top fields ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">

          {/* Client — fixed: uses clientName() helper */}
          <div>
            <label className="label">Client <span className="text-red-500">*</span></label>
            <select name="client_id" value={form.client_id} onChange={handleFormChange} className="input w-full">
              <option value="">Please Select</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{clientName(c)}</option>
              ))}
            </select>
          </div>

          {/* Project — name field is same in both cases */}
          <div>
            <label className="label">Project</label>
            <select name="project_id" value={form.project_id} onChange={handleFormChange} className="input w-full">
              <option value="">Select Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleFormChange}
              className="input w-full" placeholder="client@example.com" />
          </div>

          <div>
            <label className="label">Tax</label>
            <select name="tax_id" value={form.tax_id} onChange={handleFormChange} className="input w-full">
              <option value="">No Tax</option>
              {taxes.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.percentage}%)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Client Address</label>
            <textarea name="client_address" value={form.client_address} onChange={handleFormChange}
              rows={3} className="input w-full resize-none" />
          </div>
          <div>
            <label className="label">Billing Address</label>
            <textarea name="billing_address" value={form.billing_address} onChange={handleFormChange}
              rows={3} className="input w-full resize-none" />
          </div>
          <div>
            <label className="label">Invoice Date <span className="text-red-500">*</span></label>
            <input type="date" name="invoice_date" value={form.invoice_date} onChange={handleFormChange}
              className="input w-full" />
          </div>
          <div>
            <label className="label">Due Date <span className="text-red-500">*</span></label>
            <input type="date" name="due_date" value={form.due_date} onChange={handleFormChange}
              className="input w-full" />
          </div>
        </div>

        {/* ── Line items ── */}
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left pb-2 text-surface-500 font-medium w-6">#</th>
                  <th className="text-left pb-2 text-surface-500 font-medium min-w-[140px]">Item</th>
                  <th className="text-left pb-2 text-surface-500 font-medium min-w-[160px]">Description</th>
                  <th className="text-left pb-2 text-surface-500 font-medium w-28">Unit Cost</th>
                  <th className="text-left pb-2 text-surface-500 font-medium w-20">Qty</th>
                  <th className="text-right pb-2 text-surface-500 font-medium w-28">Amount</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const rowAmt = ((parseFloat(item.unit_cost) || 0) * (parseFloat(item.quantity) || 0)).toFixed(2);
                  return (
                    <tr key={i} className="border-b border-surface-100">
                      <td className="py-2 pr-2 text-surface-400">{i + 1}</td>
                      <td className="py-2 pr-2">
                        <input value={item.item_name}
                          onChange={e => updateItem(i, 'item_name', e.target.value)}
                          className="input w-full text-sm" placeholder="Item name" />
                      </td>
                      <td className="py-2 pr-2">
                        <input value={item.description}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                          className="input w-full text-sm" placeholder="Description" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min="0" step="0.01" value={item.unit_cost}
                          onChange={e => updateItem(i, 'unit_cost', e.target.value)}
                          className="input w-full text-sm" placeholder="0.00" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="number" min="1" step="1" value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', e.target.value)}
                          className="input w-full text-sm" />
                      </td>
                      <td className="py-2 pr-2 text-right font-medium text-surface-700">
                        ${parseFloat(rowAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-center">
                        {items.length > 1 ? (
                          <button onClick={() => removeItem(i)}
                            className="text-red-400 hover:text-red-600 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={addItem} className="text-emerald-500 hover:text-emerald-700">
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button onClick={addItem}
            className="mt-3 flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <PlusIcon className="w-4 h-4" /> Add Line
          </button>
        </div>

        {/* ── Totals ── */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm text-surface-600">
              <span>Subtotal</span>
              <span className="font-medium">${parseFloat(totals.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm text-surface-600">
              <span>{totals.taxLabel}</span>
              <span className="font-medium">${parseFloat(totals.taxAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-surface-600">
              <span>Discount (%)</span>
              <input type="number" min="0" max="100" step="0.01"
                name="discount_pct" value={form.discount_pct}
                onChange={handleFormChange}
                className="input w-24 text-right text-sm py-1" />
            </div>
            {parseFloat(totals.discount) > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount amount</span>
                <span>−${parseFloat(totals.discount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="pt-2 border-t border-surface-200 flex justify-between font-bold text-surface-900">
              <span>Grand Total</span>
              <span className="text-lg">${parseFloat(totals.grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* ── Other info ── */}
        <div>
          <label className="label">Other Information</label>
          <textarea name="other_info" value={form.other_info} onChange={handleFormChange}
            rows={3} className="input w-full resize-none" placeholder="Payment terms, notes…" />
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={() => handleSubmit(false)} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Save & Send'}
          </button>
          <button onClick={() => handleSubmit(true)} disabled={saving} className="btn-secondary">
            {saving ? '…' : 'Save as Draft'}
          </button>
          <button onClick={() => navigate('/invoices')} className="btn-ghost text-surface-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}