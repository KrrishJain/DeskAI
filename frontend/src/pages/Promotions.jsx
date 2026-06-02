/**
 * Promotions.jsx
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  DB Transaction: When you submit a promotion, the backend    ║
 * ║  uses BEGIN…COMMIT to atomically:                            ║
 * ║    1. Insert the promotion record                            ║
 * ║    2. UPDATE employees.designation (if toggle is ON)         ║
 * ║  If either fails → ROLLBACK (no partial data saved).         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Form defined OUTSIDE main component to prevent focus-loss bug.
 */

import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url, opts = {}) =>
  fetch(url, { headers:{'Content-Type':'application/json'}, credentials:'include', ...opts })
    .then(r => r.json());

// ── Promotion Form — OUTSIDE main ────────────────────────────────────────────

function PromotionForm({ form, onChange, employees, departments }) {
  return (
    <div className="row">
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Employee <span style={{color:'#ef4444'}}>*</span></label>
        <select name="employee_id" className="form-select" value={form.employee_id} onChange={onChange}>
          <option value="">— Select Employee —</option>
          {employees.map(e => (
            <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.designation}</option>
          ))}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Department</label>
        <select name="department_id" className="form-select" value={form.department_id || ''} onChange={onChange}>
          <option value="">— Select Department —</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Promotion Date <span style={{color:'#ef4444'}}>*</span></label>
        <input type="date" name="promotion_date" className="form-control" value={form.promotion_date} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Promoted From</label>
        <input name="promoted_from" className="form-control" placeholder="Auto-filled from employee record"
          value={form.promoted_from || ''} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Promoted To <span style={{color:'#ef4444'}}>*</span></label>
        <input name="promoted_to" className="form-control" value={form.promoted_to || ''} onChange={onChange} />
      </div>
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Remarks</label>
        <textarea name="remarks" className="form-control" rows={2} value={form.remarks || ''} onChange={onChange} />
      </div>

      {/* DB Transaction toggle */}
      <div className="col-12">
        <div style={{
          background:'#f5f3ff', borderRadius:10, padding:'12px 16px',
          border:'1.5px solid #c4b5fd', display:'flex', alignItems:'center', gap:12,
        }}>
          <input type="checkbox" id="auto_update_desig" name="auto_update_desig"
            checked={form.auto_update_desig}
            onChange={e => onChange({ target:{ name:'auto_update_desig', value:e.target.checked } })}
            style={{ width:18, height:18, cursor:'pointer' }}
          />
          <label htmlFor="auto_update_desig" style={{ cursor:'pointer', margin:0 }}>
            <strong style={{ color:'#4f46e5' }}>🔄 Auto-sync Designation</strong>
            <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>
              Uses a DB Transaction: atomically updates <code>employees.designation</code> to
              the "Promoted To" value. If this fails, the promotion record is also rolled back.
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

const EMPTY = { employee_id:'', department_id:'', promoted_from:'', promoted_to:'', promotion_date:'', remarks:'', auto_update_desig:true };

export default function Promotions() {
  const [promotions,  setPromotions]  = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit,setShowEdit]= useState(false);
  const [showDel, setShowDel] = useState(false);
  const [selected,setSelected]= useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, eRes, dRes] = await Promise.all([
      apiFetch(`${API}/promotions`),
      apiFetch(`${API}/employees`),
      apiFetch(`${API}/departments`),
    ]);
    if (pRes.success) setPromotions(pRes.data);
    if (eRes.success) setEmployees(eRes.data);
    if (dRes.success) setDepartments(dRes.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    setError(''); setSuccessMsg('');
    if (!form.employee_id || !form.promoted_to || !form.promotion_date)
      return setError('Employee, Promoted To, and Date are required.');
    setSaving(true);
    const res = await apiFetch(`${API}/promotions`, { method:'POST', body:JSON.stringify(form) });
    setSaving(false);
    if (res.success) {
      setShowAdd(false); setForm(EMPTY);
      setSuccessMsg(res.message || 'Promotion created.');
      load();
      setTimeout(() => setSuccessMsg(''), 5000);
    } else setError(res.message || 'Transaction failed.');
  };

  const handleEdit = async () => {
    setSaving(true);
    await apiFetch(`${API}/promotions/${selected.id}`, { method:'PUT', body:JSON.stringify(form) });
    setSaving(false); setShowEdit(false); load();
  };

  const handleDelete = async () => {
    setSaving(true);
    await apiFetch(`${API}/promotions/${selected.id}`, { method:'DELETE' });
    setSaving(false); setShowDel(false); load();
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h3 style={{ fontWeight:700, margin:0 }}>Promotion</h3>
          <nav style={{ fontSize:13, color:'#9ca3af' }}>Dashboard / <span style={{ color:'#4f46e5' }}>Promotion</span></nav>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setShowAdd(true); }}>
          + Add Promotion
        </button>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {loading ? <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>Loading…</div> : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th><th>Employee</th><th>Department</th>
                <th>From</th><th>To</th><th>Date</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p, i) => (
                <tr key={p.id}>
                  <td>{i+1}</td>
                  <td>
                    <div style={{ fontWeight:600 }}>{p.employee_name}</div>
                    <div style={{ fontSize:12, color:'#9ca3af' }}>{p.emp_code}</div>
                  </td>
                  <td>{p.department_name || '—'}</td>
                  <td><span className="badge bg-secondary">{p.promoted_from || '—'}</span></td>
                  <td><span className="badge bg-success">{p.promoted_to}</span></td>
                  <td>{new Date(p.promotion_date).toLocaleDateString()}</td>
                  <td>
                    <div className="dropdown">
                      <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><button className="dropdown-item" onClick={() => { setSelected(p); setForm({...EMPTY,...p}); setShowEdit(true); }}>✏️ Edit</button></li>
                        <li><button className="dropdown-item text-danger" onClick={() => { setSelected(p); setShowDel(true); }}>🗑 Delete</button></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Add Promotion" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Processing…':'Submit'}</button></>}>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        <PromotionForm form={form} onChange={handleChange} employees={employees} departments={departments} />
      </Modal>

      <Modal title="Edit Promotion" open={showEdit} onClose={() => setShowEdit(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <PromotionForm form={form} onChange={handleChange} employees={employees} departments={departments} />
      </Modal>

      <Modal title="Delete Promotion" open={showDel} onClose={() => setShowDel(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button></>}>
        <p>Delete promotion for <strong>{selected?.employee_name}</strong> to <strong>{selected?.promoted_to}</strong>?</p>
      </Modal>
    </div>
  );
}
