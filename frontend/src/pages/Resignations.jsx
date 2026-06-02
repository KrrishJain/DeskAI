/**
 * Resignations.jsx
 *
 * Notice period is auto-calculated:
 *   notice_period = resignation_date − notice_date  (in days, stored as generated column)
 *
 * Status flow: pending → approved | rejected
 * Form defined OUTSIDE main component to prevent focus-loss.
 */

import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url, opts = {}) =>
  fetch(url, { headers:{'Content-Type':'application/json'}, credentials:'include', ...opts })
    .then(r => r.json());

// ── Resignation Form — OUTSIDE ────────────────────────────────────────────────

function ResignationForm({ form, onChange, employees }) {
  // Compute notice period preview
  const noticeDays = (form.notice_date && form.resignation_date)
    ? Math.max(0, Math.round((new Date(form.resignation_date) - new Date(form.notice_date)) / 86400000))
    : null;

  return (
    <div className="row">
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Resigning Employee <span style={{color:'#ef4444'}}>*</span></label>
        <select name="employee_id" className="form-select" value={form.employee_id} onChange={onChange}>
          <option value="">— Select Employee —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Notice Date <span style={{color:'#ef4444'}}>*</span></label>
        <input type="date" name="notice_date" className="form-control" value={form.notice_date} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Resignation Date <span style={{color:'#ef4444'}}>*</span></label>
        <input type="date" name="resignation_date" className="form-control" value={form.resignation_date} onChange={onChange} />
      </div>

      {/* Notice period preview */}
      {noticeDays !== null && (
        <div className="col-12 mb-3">
          <div style={{
            background: noticeDays >= 30 ? '#f0fdf4' : '#fef9c3',
            borderRadius:8, padding:'10px 14px', fontSize:13,
            border: `1px solid ${noticeDays >= 30 ? '#86efac' : '#fde68a'}`,
          }}>
            <strong>Notice Period:</strong> {noticeDays} day{noticeDays !== 1 ? 's' : ''}
            {noticeDays < 30 && <span style={{ color:'#92400e', marginLeft:8 }}>⚠️ Less than standard 30 days</span>}
          </div>
        </div>
      )}

      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Reason <span style={{color:'#ef4444'}}>*</span></label>
        <textarea name="reason" className="form-control" rows={4}
          value={form.reason || ''} onChange={onChange}
          placeholder="Please describe the reason for resignation…" />
      </div>
    </div>
  );
}

const EMPTY = { employee_id:'', notice_date:'', resignation_date:'', reason:'' };

export default function Resignations() {
  const [items,     setItems]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit,setShowEdit]= useState(false);
  const [showDel, setShowDel] = useState(false);
  const [selected,setSelected]= useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, eRes] = await Promise.all([
      apiFetch(`${API}/resignations`),
      apiFetch(`${API}/employees`),
    ]);
    if (rRes.success) setItems(rRes.data);
    if (eRes.success) setEmployees(eRes.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    setError('');
    if (!form.employee_id || !form.notice_date || !form.resignation_date)
      return setError('Employee, notice date, and resignation date are required.');
    if (new Date(form.resignation_date) <= new Date(form.notice_date))
      return setError('Resignation date must be after notice date.');
    setSaving(true);
    const res = await apiFetch(`${API}/resignations`, { method:'POST', body:JSON.stringify(form) });
    setSaving(false);
    if (res.success) { setShowAdd(false); setForm(EMPTY); load(); }
    else setError(res.message || 'Error');
  };

  const handleEdit = async () => {
    setSaving(true);
    await apiFetch(`${API}/resignations/${selected.id}`, { method:'PUT', body:JSON.stringify(form) });
    setSaving(false); setShowEdit(false); load();
  };

  const handleDelete = async () => {
    setSaving(true);
    await apiFetch(`${API}/resignations/${selected.id}`, { method:'DELETE' });
    setSaving(false); setShowDel(false); load();
  };

  const handleApprove = async (id) => {
    await apiFetch(`${API}/resignations/${id}/approve`, { method:'PUT' });
    load();
  };

  const handleReject = async (id) => {
    await apiFetch(`${API}/resignations/${id}/reject`, { method:'PUT' });
    load();
  };

  const statusColor = { pending:'#fef9c3:#854d0e', approved:'#dcfce7:#16a34a', rejected:'#fee2e2:#dc2626' };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h3 style={{ fontWeight:700, margin:0 }}>Resignation</h3>
          <nav style={{ fontSize:13, color:'#9ca3af' }}>Dashboard / <span style={{ color:'#4f46e5' }}>Resignation</span></nav>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setShowAdd(true); }}>
          + Add Resignation
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>Loading…</div> : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th><th>Employee</th><th>Department</th>
                <th>Notice Date</th><th>Resignation Date</th>
                <th>Notice Period</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => {
                const [bg, fg] = (statusColor[r.status] || statusColor.pending).split(':');
                return (
                  <tr key={r.id}>
                    <td>{i+1}</td>
                    <td>
                      <div style={{ fontWeight:600 }}>{r.employee_name}</div>
                      <div style={{ fontSize:12, color:'#9ca3af' }}>{r.emp_code}</div>
                    </td>
                    <td>{r.department || '—'}</td>
                    <td>{new Date(r.notice_date).toLocaleDateString()}</td>
                    <td>{new Date(r.resignation_date).toLocaleDateString()}</td>
                    <td>
                      <span style={{
                        background: r.notice_period >= 30 ? '#f0fdf4' : '#fff7ed',
                        color:      r.notice_period >= 30 ? '#16a34a' : '#c2410c',
                        borderRadius:99, padding:'2px 10px', fontSize:12, fontWeight:600,
                      }}>
                        {r.notice_period} day{r.notice_period !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background:bg, color:fg, textTransform:'capitalize' }}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div className="dropdown">
                        <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          {r.status === 'pending' && <>
                            <li><button className="dropdown-item text-success" onClick={() => handleApprove(r.id)}>✅ Approve</button></li>
                            <li><button className="dropdown-item text-danger" onClick={() => handleReject(r.id)}>❌ Reject</button></li>
                          </>}
                          <li><button className="dropdown-item" onClick={() => { setSelected(r); setForm({...EMPTY,...r}); setShowEdit(true); }}>✏️ Edit</button></li>
                          <li><button className="dropdown-item text-danger" onClick={() => { setSelected(r); setShowDel(true); }}>🗑 Delete</button></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Add Resignation" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Submit'}</button></>}>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        <ResignationForm form={form} onChange={handleChange} employees={employees} />
      </Modal>

      <Modal title="Edit Resignation" open={showEdit} onClose={() => setShowEdit(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <ResignationForm form={form} onChange={handleChange} employees={employees} />
      </Modal>

      <Modal title="Delete Resignation" open={showDel} onClose={() => setShowDel(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button></>}>
        <p>Delete resignation for <strong>{selected?.employee_name}</strong>?</p>
      </Modal>
    </div>
  );
}
