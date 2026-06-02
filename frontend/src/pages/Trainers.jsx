/**
 * Trainers.jsx — CRUD for Trainers
 * Form defined OUTSIDE to prevent focus-loss.
 */
import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url,opts={}) =>
  fetch(url,{headers:{'Content-Type':'application/json'},credentials:'include',...opts}).then(r=>r.json());

function TrainerForm({ form, onChange, employees }) {
  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Name <span style={{color:'#ef4444'}}>*</span></label>
        <input name="name" className="form-control" value={form.name} onChange={onChange}/>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Linked Employee (optional)</label>
        <select name="employee_id" className="form-select" value={form.employee_id||''} onChange={onChange}>
          <option value="">— External Trainer —</option>
          {employees.map(e=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Phone</label>
        <input name="phone" className="form-control" value={form.phone||''} onChange={onChange}/>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label fw-semibold">Email</label>
        <input type="email" name="email" className="form-control" value={form.email||''} onChange={onChange}/>
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

const EMPTY = { name:'', employee_id:'', phone:'', email:'', description:'', status:'active' };

export default function Trainers() {
  const [items,setItems]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [showDel,setShowDel]=useState(false);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const load = useCallback(async()=>{
    setLoading(true);
    const [tRes,eRes]=await Promise.all([apiFetch(`${API}/trainers`),apiFetch(`${API}/employees`)]);
    if(tRes.success)setItems(tRes.data);
    if(eRes.success)setEmployees(eRes.data);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const handleChange = e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  const handleAdd = async()=>{
    setError('');
    if(!form.name)return setError('Name is required.');
    setSaving(true);
    const res=await apiFetch(`${API}/trainers`,{method:'POST',body:JSON.stringify(form)});
    setSaving(false);
    if(res.success){setShowAdd(false);setForm(EMPTY);load();}else setError(res.message||'Error');
  };
  const handleEdit = async()=>{
    setSaving(true);
    await apiFetch(`${API}/trainers/${selected.id}`,{method:'PUT',body:JSON.stringify(form)});
    setSaving(false);setShowEdit(false);load();
  };
  const handleDelete = async()=>{
    setSaving(true);
    await apiFetch(`${API}/trainers/${selected.id}`,{method:'DELETE'});
    setSaving(false);setShowDel(false);load();
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div><h3 style={{fontWeight:700,margin:0}}>Trainers</h3>
        <nav style={{fontSize:13,color:'#9ca3af'}}>Dashboard / <span style={{color:'#4f46e5'}}>Trainers</span></nav></div>
        <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setError('');setShowAdd(true);}}>+ Add Trainer</button>
      </div>
      {loading?<div style={{textAlign:'center',padding:60,color:'#9ca3af'}}>Loading…</div>:(
        <div className="table-responsive">
          <table className="table table-striped">
            <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>Description</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{items.map((t,i)=>(
              <tr key={t.id}>
                <td>{i+1}</td>
                <td><div style={{fontWeight:600}}>{t.name}</div>{t.employee_name&&<div style={{fontSize:11,color:'#9ca3af'}}>Employee: {t.employee_name}</div>}</td>
                <td>{t.phone||'—'}</td><td>{t.email||'—'}</td>
                <td style={{fontSize:12,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description||'—'}</td>
                <td><span className="badge" style={{background:t.status==='active'?'#dcfce7':'#fee2e2',color:t.status==='active'?'#16a34a':'#dc2626'}}>{t.status}</span></td>
                <td>
                  <div className="dropdown">
                    <button className="btn btn-sm btn-light" data-bs-toggle="dropdown">⋮</button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li><button className="dropdown-item" onClick={()=>{setSelected(t);setForm({...EMPTY,...t});setShowEdit(true);}}>✏️ Edit</button></li>
                      <li><button className="dropdown-item text-danger" onClick={()=>{setSelected(t);setShowDel(true);}}>🗑 Delete</button></li>
                    </ul>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Modal title="Add Trainer" open={showAdd} onClose={()=>setShowAdd(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Submit'}</button></>}>
        {error&&<div className="alert alert-danger py-2 mb-3">{error}</div>}
        <TrainerForm form={form} onChange={handleChange} employees={employees}/>
      </Modal>
      <Modal title="Edit Trainer" open={showEdit} onClose={()=>setShowEdit(false)} size="lg"
        footer={<><button className="btn btn-secondary" onClick={()=>setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <TrainerForm form={form} onChange={handleChange} employees={employees}/>
      </Modal>
      <Modal title="Delete Trainer" open={showDel} onClose={()=>setShowDel(false)}
        footer={<><button className="btn btn-secondary" onClick={()=>setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button></>}>
        <p>Delete trainer <strong>{selected?.name}</strong>?</p>
      </Modal>
    </div>
  );
}
