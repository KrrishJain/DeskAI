/**
 * Payroll.jsx
 *
 * IMPORTANT: All Form components are defined OUTSIDE the main Payroll function.
 * This prevents the React focus-loss bug caused by re-creating components on each render.
 *
 * Net Salary formula (mirrors DB generated column):
 *   Total Earnings   = basic + da + hra + conveyance + allowance + medical + others_earn
 *   Total Deductions = tds + esi + pf + leave_deduction + prof_tax + labour_welfare + others_ded
 *   Net Salary       = Total Earnings − Total Deductions
 */

import { useState, useEffect, useCallback } from 'react';
import Payslip from './Payslip';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url, opts = {}) =>
  fetch(url, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts })
    .then(r => r.json());

const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

// ── SALARY FORM — defined OUTSIDE to prevent focus-loss ────────────────────

function SalaryForm({ form, onChange, employees }) {
  const earn  = ['basic','da','hra','conveyance','allowance','medical','others_earn'];
  const ded   = ['tds','esi','pf','leave_deduction','prof_tax','labour_welfare','others_ded'];
  const labels = {
    basic:'Basic', da:'DA (Dearness Allowance)', hra:'HRA', conveyance:'Conveyance',
    allowance:'Allowance', medical:'Medical Allowance', others_earn:'Others (Earnings)',
    tds:'TDS', esi:'ESI', pf:'PF (Provident Fund)', leave_deduction:'Leave Deduction',
    prof_tax:'Professional Tax', labour_welfare:'Labour Welfare', others_ded:'Others (Deductions)',
  };

  // Live net salary preview
  const totalEarn = earn.reduce((s, k) => s + (parseFloat(form[k]) || 0), 0);
  const totalDed  = ded.reduce((s,  k) => s + (parseFloat(form[k]) || 0), 0);
  const netSalary = totalEarn - totalDed;

  return (
    <div>
      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label fw-semibold">Employee <span style={{color:'#ef4444'}}>*</span></label>
          <select name="employee_id" className="form-select" value={form.employee_id} onChange={onChange}>
            <option value="">— Select Employee —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label fw-semibold">Salary Month <span style={{color:'#ef4444'}}>*</span></label>
          <input type="month" name="salary_month" className="form-control"
            value={form.salary_month} onChange={onChange} />
        </div>
      </div>

      <div className="row">
        {/* Earnings */}
        <div className="col-md-6">
          <h5 style={{ color:'#4f46e5', fontWeight:700, marginBottom:12 }}>Earnings</h5>
          {earn.map(k => (
            <div key={k} className="mb-2">
              <label className="form-label small">{labels[k]}</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">$</span>
                <input type="number" name={k} min="0" step="0.01" className="form-control"
                  value={form[k] || ''} onChange={onChange} />
              </div>
            </div>
          ))}
          <div style={{background:'#eff6ff', borderRadius:8, padding:'8px 12px', marginTop:8}}>
            <strong>Total Earnings: {fmt(totalEarn)}</strong>
          </div>
        </div>

        {/* Deductions */}
        <div className="col-md-6">
          <h5 style={{ color:'#dc2626', fontWeight:700, marginBottom:12 }}>Deductions</h5>
          {ded.map(k => (
            <div key={k} className="mb-2">
              <label className="form-label small">{labels[k]}</label>
              <div className="input-group input-group-sm">
                <span className="input-group-text">$</span>
                <input type="number" name={k} min="0" step="0.01" className="form-control"
                  value={form[k] || ''} onChange={onChange} />
              </div>
            </div>
          ))}
          <div style={{background:'#fef2f2', borderRadius:8, padding:'8px 12px', marginTop:8}}>
            <strong>Total Deductions: {fmt(totalDed)}</strong>
          </div>
        </div>
      </div>

      {/* Net Salary preview */}
      <div style={{
        background: netSalary >= 0 ? '#f0fdf4' : '#fff7ed',
        borderRadius:10, padding:16, marginTop:16, textAlign:'center'
      }}>
        <div style={{ fontSize:13, color:'#6b7280' }}>Net Salary Preview</div>
        <div style={{ fontSize:28, fontWeight:800, color: netSalary >= 0 ? '#16a34a' : '#ef4444' }}>
          {fmt(netSalary)}
        </div>
        <div style={{ fontSize:11, color:'#9ca3af' }}>
          (Stored as a computed column: Earnings − Deductions)
        </div>
      </div>

      <div className="mt-3">
        <label className="form-label fw-semibold">Notes</label>
        <textarea name="notes" className="form-control" rows={2}
          value={form.notes || ''} onChange={onChange} />
      </div>
    </div>
  );
}

// ── EMPTY FORM ──────────────────────────────────────────────────────────────

const EMPTY = {
  employee_id:'', salary_month:'',
  basic:0, da:0, hra:0, conveyance:0, allowance:0, medical:0, others_earn:0,
  tds:0, esi:0, pf:0, leave_deduction:0, prof_tax:0, labour_welfare:0, others_ded:0,
  notes:'',
};

// ── MAIN ─────────────────────────────────────────────────────────────────────

export default function Payroll() {
  const [salaries,  setSalaries]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [activePayslip, setActivePayslip] = useState(null);

  const [showAdd,  setShowAdd]  = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel,  setShowDel]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, eRes] = await Promise.all([
      apiFetch(`${API}/payroll`),
      apiFetch(`${API}/employees`),
    ]);
    if (sRes.success) setSalaries(sRes.data);
    if (eRes.success) setEmployees(eRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    setError('');
    if (!form.employee_id || !form.salary_month) return setError('Employee and month required.');
    setSaving(true);
    const res = await apiFetch(`${API}/payroll`, { method:'POST', body:JSON.stringify(form) });
    setSaving(false);
    if (res.success) { setShowAdd(false); setForm(EMPTY); load(); }
    else setError(res.message || 'Error');
  };

  const handleEdit = async () => {
    setSaving(true);
    const res = await apiFetch(`${API}/payroll/${selected.id}`, { method:'PUT', body:JSON.stringify(form) });
    setSaving(false);
    if (res.success) { setShowEdit(false); load(); }
  };

  const handleDelete = async () => {
    setSaving(true);
    await apiFetch(`${API}/payroll/${selected.id}`, { method:'DELETE' });
    setSaving(false); setShowDel(false); load();
  };

  const handleMarkPaid = async (id) => {
    await apiFetch(`${API}/payroll/${id}/mark-paid`, { method:'PUT' });
    load();
  };

  const visible = salaries.filter(s => {
    const q = search.toLowerCase();
    return (s.employee_name || '').toLowerCase().includes(q) ||
           (s.emp_code || '').toLowerCase().includes(q);
  });

  if (activePayslip) {
    return <Payslip salary={activePayslip} onBack={() => setActivePayslip(null)} />;
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h3 style={{ fontWeight:700, margin:0 }}>Employee Salary</h3>
          <nav style={{ fontSize:13, color:'#9ca3af' }}>Dashboard / <span style={{ color:'#4f46e5' }}>Salary</span></nav>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setShowAdd(true); }}>
          + Add Salary
        </button>
      </div>

      <div style={{ marginBottom:16 }}>
        <input type="text" className="form-control" placeholder="Search employee…"
          value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:320 }} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>Loading…</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Employee</th><th>Month</th><th>Payslip #</th>
                <th>Earnings</th><th>Deductions</th><th>Net Salary</th>
                <th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight:600 }}>{s.employee_name}</div>
                    <div style={{ fontSize:12, color:'#9ca3af' }}>{s.emp_code}</div>
                  </td>
                  <td>{new Date(s.salary_month).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</td>
                  <td>
                    <button className="btn btn-sm btn-link p-0"
                      onClick={() => setActivePayslip(s)}>
                      {s.payslip_no}
                    </button>
                  </td>
                  <td style={{ color:'#16a34a' }}>{fmt(s.total_earnings)}</td>
                  <td style={{ color:'#dc2626' }}>{fmt(s.total_deductions)}</td>
                  <td style={{ fontWeight:700 }}>{fmt(s.net_salary)}</td>
                  <td>
                    <span className="badge" style={{
                      background: s.status==='paid' ? '#dcfce7':'#fef9c3',
                      color:       s.status==='paid' ? '#16a34a':'#854d0e',
                    }}>{s.status}</span>
                  </td>
                  <td>
                    <div className="dropdown">
                      <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><button className="dropdown-item" onClick={() => setActivePayslip(s)}>🧾 Payslip</button></li>
                        <li><button className="dropdown-item" onClick={() => { setSelected(s); setForm({...EMPTY,...s}); setShowEdit(true); }}>✏️ Edit</button></li>
                        {s.status === 'unpaid' && <li><button className="dropdown-item text-success" onClick={() => handleMarkPaid(s.id)}>✅ Mark Paid</button></li>}
                        <li><button className="dropdown-item text-danger" onClick={() => { setSelected(s); setShowDel(true); }}>🗑 Delete</button></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal title="Add Staff Salary" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Submit'}</button>
        </>}>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        <SalaryForm form={form} onChange={handleChange} employees={employees} />
      </Modal>

      {/* Edit Modal */}
      <Modal title="Edit Salary" open={showEdit} onClose={() => setShowEdit(false)} size="lg"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button>
        </>}>
        <SalaryForm form={form} onChange={handleChange} employees={employees} />
      </Modal>

      {/* Delete Modal */}
      <Modal title="Delete Salary" open={showDel} onClose={() => setShowDel(false)}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button>
        </>}>
        <p>Delete salary record <strong>{selected?.payslip_no}</strong> for <strong>{selected?.employee_name}</strong>?</p>
      </Modal>
    </div>
  );
}
