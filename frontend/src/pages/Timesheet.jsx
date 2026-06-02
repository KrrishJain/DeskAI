/**
 * Timesheet.jsx
 *
 * Attendance/Timesheet tracker.
 * Columns: Employee, Date, Project, Assigned Hours, Hours Logged, Description, Actions.
 * Shows completion % bar for each entry.
 * Form defined OUTSIDE to prevent focus-loss bug.
 */

import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url, opts = {}) =>
  fetch(url, { headers:{'Content-Type':'application/json'}, credentials:'include', ...opts })
    .then(r => r.json());

// ── Timesheet Form — OUTSIDE ─────────────────────────────────────────────────

function TimesheetForm({ form, onChange, employees, projects }) {
  const pct = form.assigned_hours > 0
    ? Math.min(100, Math.round((form.hours_logged / form.assigned_hours) * 100)) : 0;
  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Employee <span style={{color:'#ef4444'}}>*</span></label>
        <select name="employee_id" className="form-select" value={form.employee_id} onChange={onChange}>
          <option value="">— Select Employee —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Work Date <span style={{color:'#ef4444'}}>*</span></label>
        <input type="date" name="work_date" className="form-control" value={form.work_date} onChange={onChange} />
      </div>
      <div className="col-md-12 mb-3">
        <label className="form-label fw-semibold">Project</label>
        <select name="project_id" className="form-select" value={form.project_id || ''} onChange={onChange}>
          <option value="">— No Project —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Assigned Hours</label>
        <input type="number" name="assigned_hours" min="0" max="24" step="0.5"
          className="form-control" value={form.assigned_hours} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Hours Logged</label>
        <input type="number" name="hours_logged" min="0" max="24" step="0.5"
          className="form-control" value={form.hours_logged} onChange={onChange} />
      </div>
      {/* Completion bar preview */}
      <div className="col-12 mb-3">
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
          <span style={{ color:'#6b7280' }}>Completion</span>
          <span style={{ fontWeight:700 }}>{pct}%</span>
        </div>
        <div style={{ height:8, borderRadius:99, background:'#e5e7eb' }}>
          <div style={{
            width:`${pct}%`, height:'100%', borderRadius:99, transition:'width .3s',
            background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#4f46e5' : '#f97316',
          }} />
        </div>
      </div>
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Description</label>
        <textarea name="description" className="form-control" rows={3}
          value={form.description || ''} onChange={onChange} />
      </div>
    </div>
  );
}

const EMPTY = { employee_id:'', work_date:'', project_id:'', assigned_hours:8, hours_logged:0, description:'' };

export default function Timesheet() {
  const [entries,   setEntries]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filterEmp, setFilterEmp] = useState('');
  const [filterMonth,setFilterMonth]=useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit,setShowEdit]= useState(false);
  const [showDel, setShowDel] = useState(false);
  const [selected,setSelected]= useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterEmp)   params.set('employee_id', filterEmp);
    if (filterMonth) params.set('month', filterMonth);
    const [tRes, eRes, pRes] = await Promise.all([
      apiFetch(`${API}/timesheet?${params}`),
      apiFetch(`${API}/employees`),
      apiFetch(`${API}/projects`),
    ]);
    if (tRes.success) setEntries(tRes.data);
    if (eRes.success) setEmployees(eRes.data);
    if (pRes.success) setProjects(pRes.data);
    setLoading(false);
  }, [filterEmp, filterMonth]);
  useEffect(() => { load(); }, [load]);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    setError('');
    if (!form.employee_id || !form.work_date) return setError('Employee and date required.');
    setSaving(true);
    const res = await apiFetch(`${API}/timesheet`, { method:'POST', body:JSON.stringify(form) });
    setSaving(false);
    if (res.success) { setShowAdd(false); setForm(EMPTY); load(); }
    else setError(res.message || 'Error');
  };

  const handleEdit = async () => {
    setSaving(true);
    await apiFetch(`${API}/timesheet/${selected.id}`, { method:'PUT', body:JSON.stringify(form) });
    setSaving(false); setShowEdit(false); load();
  };

  const handleDelete = async () => {
    setSaving(true);
    await apiFetch(`${API}/timesheet/${selected.id}`, { method:'DELETE' });
    setSaving(false); setShowDel(false); load();
  };

  // Summary stats
  const totalHoursLogged   = entries.reduce((s, e) => s + parseFloat(e.hours_logged || 0), 0);
  const totalHoursAssigned = entries.reduce((s, e) => s + parseFloat(e.assigned_hours || 0), 0);
  const overallPct = totalHoursAssigned > 0
    ? Math.round((totalHoursLogged / totalHoursAssigned) * 100) : 0;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h3 style={{ fontWeight:700, margin:0 }}>Timesheet</h3>
          <nav style={{ fontSize:13, color:'#9ca3af' }}>Dashboard / <span style={{ color:'#4f46e5' }}>Timesheet</span></nav>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setError(''); setShowAdd(true); }}>
          + Add Today Work
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <select className="form-select" style={{ maxWidth:220 }} value={filterEmp} onChange={e => setFilterEmp(e.target.value)}>
          <option value="">All Employees</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
        <input type="month" className="form-control" style={{ maxWidth:180 }}
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
      </div>

      {/* Summary */}
      {entries.length > 0 && (
        <div style={{ display:'flex', gap:14, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { label:'Total Entries', value:entries.length,  color:'#4f46e5', bg:'#eff6ff' },
            { label:'Hours Assigned', value:totalHoursAssigned.toFixed(1)+'h', color:'#0891b2', bg:'#ecfeff' },
            { label:'Hours Logged',   value:totalHoursLogged.toFixed(1)+'h',   color:'#16a34a', bg:'#f0fdf4' },
            { label:'Overall Completion', value:`${overallPct}%`, color:'#7c3aed', bg:'#f5f3ff' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background:bg, borderRadius:10, padding:'12px 18px', flex:1, minWidth:130 }}>
              <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div style={{ textAlign:'center', padding:60, color:'#9ca3af' }}>Loading…</div> : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Employee</th><th>Date</th><th>Project</th>
                <th className="text-center">Assigned</th>
                <th className="text-center">Logged</th>
                <th>Completion</th>
                <th>Description</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td>
                    <div style={{ fontWeight:600, fontSize:14 }}>{entry.employee_name}</div>
                    <div style={{ fontSize:11, color:'#9ca3af' }}>{entry.designation}</div>
                  </td>
                  <td>{new Date(entry.work_date).toLocaleDateString()}</td>
                  <td>{entry.project_name || <span style={{ color:'#9ca3af' }}>—</span>}</td>
                  <td className="text-center">{entry.assigned_hours}h</td>
                  <td className="text-center">
                    <strong style={{ color: entry.completion_pct >= 100 ? '#16a34a' : '#374151' }}>
                      {entry.hours_logged}h
                    </strong>
                  </td>
                  <td style={{ minWidth:120 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, borderRadius:99, background:'#e5e7eb' }}>
                        <div style={{
                          width:`${Math.min(100, entry.completion_pct)}%`, height:'100%', borderRadius:99,
                          background: entry.completion_pct >= 100 ? '#16a34a' : entry.completion_pct >= 50 ? '#4f46e5' : '#f97316',
                        }} />
                      </div>
                      <span style={{ fontSize:11, width:34, textAlign:'right' }}>
                        {entry.completion_pct}%
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize:12, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {entry.description || '—'}
                  </td>
                  <td className="text-right">
                    <div className="dropdown">
                      <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><button className="dropdown-item" onClick={() => { setSelected(entry); setForm({...EMPTY,...entry}); setShowEdit(true); }}>✏️ Edit</button></li>
                        <li><button className="dropdown-item text-danger" onClick={() => { setSelected(entry); setShowDel(true); }}>🗑 Delete</button></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal title="Add Today Work" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Submit'}</button></>}>
        {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}
        <TimesheetForm form={form} onChange={handleChange} employees={employees} projects={projects} />
      </Modal>

      <Modal title="Edit Work Entry" open={showEdit} onClose={() => setShowEdit(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <TimesheetForm form={form} onChange={handleChange} employees={employees} projects={projects} />
      </Modal>

      <Modal title="Delete Work Entry" open={showDel} onClose={() => setShowDel(false)}
        footer={<><button className="btn btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button></>}>
        <p>Delete work entry for <strong>{selected?.employee_name}</strong> on <strong>{selected?.work_date}</strong>?</p>
      </Modal>
    </div>
  );
}
