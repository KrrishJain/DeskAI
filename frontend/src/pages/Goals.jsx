/**
 * Goals.jsx
 *
 * CRUD for Goals with a 0–100% progress bar.
 * Form components are defined OUTSIDE the main function to prevent focus-loss.
 */

import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url, opts = {}) =>
  fetch(url, { headers:{'Content-Type':'application/json'}, credentials:'include', ...opts })
    .then(r => r.json());

// ── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct = 0 }) {
  const color = pct >= 80 ? '#16a34a' : pct >= 40 ? '#4f46e5' : '#f97316';
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:2 }}>
        <span style={{ color:'#6b7280' }}>Progress</span>
        <span style={{ fontWeight:700, color }}>{pct}%</span>
      </div>
      <div style={{ height:8, borderRadius:99, background:'#e5e7eb' }}>
        <div style={{ width:`${pct}%`, height:'100%', borderRadius:99, background:color, transition:'width .4s' }} />
      </div>
    </div>
  );
}

// ── Goal Form — OUTSIDE main component ──────────────────────────────────────

function GoalForm({ form, onChange, goalTypes }) {
  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Goal Type</label>
        <select name="goal_type_id" className="form-select" value={form.goal_type_id || ''} onChange={onChange}>
          <option value="">— Select Type —</option>
          {goalTypes.map(t => <option key={t.id} value={t.id}>{t.type_name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Status</label>
        <select name="status" className="form-select" value={form.status} onChange={onChange}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Subject <span style={{color:'#ef4444'}}>*</span></label>
        <input name="subject" className="form-control" value={form.subject} onChange={onChange} />
      </div>
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Target Achievement</label>
        <input name="target" className="form-control" value={form.target || ''} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Start Date</label>
        <input type="date" name="start_date" className="form-control" value={form.start_date || ''} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">End Date</label>
        <input type="date" name="end_date" className="form-control" value={form.end_date || ''} onChange={onChange} />
      </div>
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Description</label>
        <textarea name="description" className="form-control" rows={3}
          value={form.description || ''} onChange={onChange} />
      </div>
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">
          Progress: <span style={{ color:'#4f46e5', fontWeight:800 }}>{form.progress}%</span>
        </label>
        <input type="range" name="progress" min="0" max="100" step="1"
          className="form-range" value={form.progress} onChange={onChange} />
        <ProgressBar pct={parseInt(form.progress) || 0} />
      </div>
    </div>
  );
}

const EMPTY = { goal_type_id:'', subject:'', target:'', start_date:'', end_date:'', description:'', status:'active', progress:0 };

// ── Main ─────────────────────────────────────────────────────────────────────

export default function Goals() {
  const [goals,     setGoals]     = useState([]);
  const [goalTypes, setGoalTypes] = useState([]);
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
    const [gRes, tRes] = await Promise.all([
      apiFetch(`${API}/goals`),
      apiFetch(`${API}/goal-types`),
    ]);
    if (gRes.success) setGoals(gRes.data);
    if (tRes.success) setGoalTypes(tRes.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    setError('');
    if (!form.subject) return setError('Subject is required.');
    setSaving(true);
    const res = await apiFetch(`${API}/goals`, { method:'POST', body:JSON.stringify(form) });
    setSaving(false);
    if (res.success) { setShowAdd(false); setForm(EMPTY); load(); }
    else setError(res.message || 'Error');
  };

  const handleEdit = async () => {
    setSaving(true);
    const res = await apiFetch(`${API}/goals/${selected.id}`, { method:'PUT', body:JSON.stringify(form) });
    setSaving(false);
    if (res.success) { setShowEdit(false); load(); }
  };

  const handleDelete = async () => {
    setSaving(true);
    await apiFetch(`${API}/goals/${selected.id}`, { method:'DELETE' });
    setSaving(false); setShowDel(false); load();
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h3 style={{ fontWeight:700, margin:0 }}>Goal Tracking</h3>
          <nav style={{ fontSize:13, color:'#9ca3af' }}>Dashboard / <span style={{ color:'#4f46e5' }}>Goals</span></nav>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setShowAdd(true); }}>
          + Add Goal
        </button>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>Loading…</div> : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>#</th><th>Goal Type</th><th>Subject</th><th>Target</th>
                <th>Start</th><th>End</th><th>Status</th><th>Progress</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g, i) => (
                <tr key={g.id}>
                  <td>{i+1}</td>
                  <td>{g.type_name || '—'}</td>
                  <td style={{ fontWeight:600 }}>{g.subject}</td>
                  <td style={{ fontSize:12, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {g.target || '—'}
                  </td>
                  <td>{g.start_date ? new Date(g.start_date).toLocaleDateString() : '—'}</td>
                  <td>{g.end_date   ? new Date(g.end_date).toLocaleDateString()   : '—'}</td>
                  <td>
                    <span className="badge" style={{
                      background: g.status==='active'?'#dcfce7':'#fee2e2',
                      color:      g.status==='active'?'#16a34a':'#dc2626',
                    }}>{g.status}</span>
                  </td>
                  <td style={{ minWidth:140 }}>
                    <ProgressBar pct={g.progress} />
                  </td>
                  <td>
                    <div className="dropdown">
                      <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><button className="dropdown-item" onClick={() => { setSelected(g); setForm({...EMPTY,...g}); setShowEdit(true); }}>✏️ Edit</button></li>
                        <li><button className="dropdown-item text-danger" onClick={() => { setSelected(g); setShowDel(true); }}>🗑 Delete</button></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Add Goal" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Submit'}</button></>}>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        <GoalForm form={form} onChange={handleChange} goalTypes={goalTypes} />
      </Modal>

      <Modal title="Edit Goal" open={showEdit} onClose={() => setShowEdit(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <GoalForm form={form} onChange={handleChange} goalTypes={goalTypes} />
      </Modal>

      <Modal title="Delete Goal" open={showDel} onClose={() => setShowDel(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button></>}>
        <p>Delete goal: <strong>{selected?.subject}</strong>?</p>
      </Modal>
    </div>
  );
}
