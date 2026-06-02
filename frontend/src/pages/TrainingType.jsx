/**
 * TrainingType.jsx — CRUD for Training Types
 */
import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = (url,opts={}) =>
  fetch(url,{headers:{'Content-Type':'application/json'},credentials:'include',...opts}).then(r=>r.json());

function TypeForm({ form, onChange }) {
  return (
    <div>
      <div className="mb-3"><label className="form-label fw-semibold">Type Name <span style={{color:'#ef4444'}}>*</span></label>
        <input name="type_name" className="form-control" value={form.type_name} onChange={onChange}/></div>
      <div className="mb-3"><label className="form-label fw-semibold">Description</label>
        <textarea name="description" className="form-control" rows={3} value={form.description||''} onChange={onChange}/></div>
      <div className="mb-3"><label className="form-label fw-semibold">Status</label>
        <select name="status" className="form-select" value={form.status} onChange={onChange}>
          <option value="active">Active</option><option value="inactive">Inactive</option>
        </select></div>
    </div>
  );
}

const EMPTY = { type_name:'', description:'', status:'active' };

export default function TrainingType() {
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [showEdit,setShowEdit]=useState(false);
  const [showDel,setShowDel]=useState(false);
  const [selected,setSelected]=useState(null);
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    const res=await apiFetch(`${API}/training-types`);
    if(res.success)setItems(res.data);
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const handleChange=e=>setForm(f=>({...f,[e.target.name]:e.target.value}));
  const handleAdd=async()=>{
    setError('');
    if(!form.type_name)return setError('Type name is required.');
    setSaving(true);
    const res=await apiFetch(`${API}/training-types`,{method:'POST',body:JSON.stringify(form)});
    setSaving(false);
    if(res.success){setShowAdd(false);setForm(EMPTY);load();}else setError(res.message||'Error');
  };
  const handleEdit=async()=>{
    setSaving(true);
    await apiFetch(`${API}/training-types/${selected.id}`,{method:'PUT',body:JSON.stringify(form)});
    setSaving(false);setShowEdit(false);load();
  };
  const handleDelete=async()=>{
    setSaving(true);
    await apiFetch(`${API}/training-types/${selected.id}`,{method:'DELETE'});
    setSaving(false);setShowDel(false);load();
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div><h3 style={{fontWeight:700,margin:0}}>Training Types</h3>
        <nav style={{fontSize:13,color:'#9ca3af'}}>Dashboard / <span style={{color:'#4f46e5'}}>Training Types</span></nav></div>
        <button className="btn btn-primary" onClick={()=>{setForm(EMPTY);setError('');setShowAdd(true);}}>+ Add Type</button>
      </div>
      {loading?<div style={{textAlign:'center',padding:60,color:'#9ca3af'}}>Loading…</div>:(
        <div className="table-responsive">
          <table className="table table-striped">
            <thead><tr><th>#</th><th>Type</th><th>Description</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{items.map((t,i)=>(
              <tr key={t.id}>
                <td>{i+1}</td>
                <td style={{fontWeight:600}}>{t.type_name}</td>
                <td style={{fontSize:12}}>{t.description||'—'}</td>
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
      <Modal title="Add Training Type" open={showAdd} onClose={()=>setShowAdd(false)}
        footer={<><button className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>{saving?'Saving…':'Submit'}</button></>}>
        {error&&<div className="alert alert-danger py-2 mb-3">{error}</div>}
        <TypeForm form={form} onChange={handleChange}/>
      </Modal>
      <Modal title="Edit Training Type" open={showEdit} onClose={()=>setShowEdit(false)}
        footer={<><button className="btn btn-secondary" onClick={()=>setShowEdit(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleEdit} disabled={saving}>{saving?'Saving…':'Save'}</button></>}>
        <TypeForm form={form} onChange={handleChange}/>
      </Modal>
      <Modal title="Delete Training Type" open={showDel} onClose={()=>setShowDel(false)}
        footer={<><button className="btn btn-secondary" onClick={()=>setShowDel(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>Yes, Delete</button></>}>
        <p>Delete type <strong>{selected?.type_name}</strong>?</p>
      </Modal>
    </div>
  );
}
