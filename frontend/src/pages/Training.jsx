/**
 * Training.jsx — Training List with full JOIN data
 * Shows: Training Type | Trainer | Employee | Dates | Cost | Status
 * Form defined OUTSIDE to prevent focus-loss.
 */
import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url, opts = {}) =>
  fetch(url, { headers:{'Content-Type':'application/json'}, credentials:'include', ...opts }).then(r=>r.json());

function TrainingForm({ form, onChange, employees, trainers, trainingTypes }) {
  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Employee <span style={{color:'#ef4444'}}>*</span></label>
        <select name="employee_id" className="form-select" value={form.employee_id} onChange={onChange}>
          <option value="">— Select —</option>
          {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Training Type</label>
        <select name="training_type_id" className="form-select" value={form.training_type_id||''} onChange={onChange}>
          <option value="">— Select Type —</option>
          {trainingTypes.map(t=><option key={t.id} value={t.id}>{t.type_name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Trainer</label>
        <select name="trainer_id" className="form-select" value={form.trainer_id||''} onChange={onChange}>
          <option value="">— Select Trainer —</option>
          {trainers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Training Cost ($)</label>
        <input type="number" name="training_cost" className="form-control" min="0"
          value={form.training_cost||''} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Start Date</label>
        <input type="date" name="start_date" className="form-control" value={form.start_date||''} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">End Date</label>
        <input type="date" name="end_date" className="form-control" value={form.end_date||''} onChange={onChange} />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Status</label>
        <select name="status" className="form-select" value={form.status} onChange={onChange}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="col-12 mb-3">
        <label className="form-label fw-semibold">Description</label>
        <textarea name="description" className="form-control" rows={3} value={form.description||''} onChange={onChange}/>
      </div>
    </div>
  );
}

const EMPTY = { employee_id:'', training_type_id:'', trainer_id:'', training_cost:'', start_date:'', end_date:'', description:'', status:'active' };

export default function Training() {
  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [trainingTypes, setTrainingTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [showDel,setShowDel]=useState(false);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [tRes,eRes,trRes,ttRes] = await Promise.all([
      apiFetch(`${API}/training`), apiFetch(`${API}/employees`),
      apiFetch(`${API}/trainers`), apiFetch(`${API}/training-types`),
    ]);
    if(tRes.success) setItems(tRes.data);
    if(eRes.success) setEmployees(eRes.data);
    if(trRes.success) setTrainers(trRes.data);
    if(ttRes.success) setTrainingTypes(ttRes.data);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const handleChange = e => setForm(f=>({...f,[e.target.name]:e.target.value}));
  const handleAdd = async () => {
    setError('');
    if(!form.employee_id) return setError('Employee is required.');
    setSaving(true);
    const res = await apiFetch(`${API}/training`,{method:'POST',body:JSON.stringify(form)});
    setSaving(false);
    if(res.success){setShowAdd(false);setForm(EMPTY);load();}
    else setError(res.message||'Error');
  };
  const handleEdit = async () => {
    setSaving(true);
    await apiFetch(`${API}/training/${selected.id}`,{method:'PUT',body:JSON.stringify(form)});
    setSaving(false);setShowEdit(false);load();
  };
  const handleDelete = async () => {
    setSaving(true);
    await apiFetch(`${API}/training/${selected.id}`,{method:'DELETE'});
    setSaving(false);setShowDel(false);load();
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div>
          <h3 style={{fontWeight:700,margin:0}}>Training List</h3>
          <nav style={{fontSize:13,color:'#9ca3af'}}>Dashboard / <span style={{color:'#4f46e5'}}>Training</span></nav>
        </div>
        <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setError('');setShowAdd(true);}}>+ Add Training</button>
      </div>
      {loading ? <div style={{textAlign:'center',padding:60,color:'#9ca3af'}}>Loading…</div> : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead><tr><th>#</th><th>Employee</th><th>Training Type</th><th>Trainer</th><th>Cost</th><th>Start</th><th>End</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={item.id}>
                  <td>{i+1}</td>
                  <td><div style={{fontWeight:600}}>{item.employee_name}</div><div style={{fontSize:11,color:'#9ca3af'}}>{item.designation}</div></td>
                  <td>{item.training_type||'—'}</td>
                  <td>{item.trainer_name||'—'}</td>
                  <td>{item.training_cost?`$${item.training_cost}`:'—'}</td>
                  <td>{item.start_date?new Date(item.start_date).toLocaleDateString():'—'}</td>
                  <td>{item.end_date?new Date(item.end_date).toLocaleDateString():'—'}</td>
                  <td><span className="badge" style={{background:item.status==='active'?'#dcfce7':'#fee2e2',color:item.status==='active'?'#16a34a':'#dc2626'}}>{item.status}</span></td>
                  <td>
                    <div className="dropdown">
                      <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li><button className="dropdown-item" onClick={()=>{setSelected(item);setForm({...EMPTY,...item});setShowEdit(true);}}>✏️ Edit</button></li>
                        <li><button className="dropdown-item text-danger" onClick={()=>{setSelected(item);setShowDel(true);}}>🗑 Delete</button></li>
                      </ul>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal title="Add Training" open={showAdd} onClose={()=>setShowAdd(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Submit'}</button></>}>
        {error&&<div className="alert alert-danger py-2 mb-3">{error}</div>}
        <TrainingForm form={form} onChange={handleChange} employees={employees} trainers={trainers} trainingTypes={trainingTypes}/>
      </Modal>
      <Modal title="Edit Training" open={showEdit} onClose={()=>setShowEdit(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={()=>setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <TrainingForm form={form} onChange={handleChange} employees={employees} trainers={trainers} trainingTypes={trainingTypes}/>
      </Modal>
      <Modal title="Delete Training" open={showDel} onClose={()=>setShowDel(false)}
        footer={<><button className="btn btn-secondary" onClick={()=>setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button></>}>
        <p>Delete training for <strong>{selected?.employee_name}</strong>?</p>
      </Modal>
    </div>
  );
}
