/**
 * Projects.jsx — enhanced listing UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ProjectDetails from './ProjectDetails';
import Modal from '../components/ui/Modal';

const API = '/api';
const apiFetch = async (url, opts = {}) => {
  const r = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    credentials: 'include',
    ...opts,
  });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { return { success: false, message: `Server error ${r.status}` }; }
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#B5D4F4', text: '#0C447C' },
  { bg: '#9FE1CB', text: '#085041' },
  { bg: '#CECBF6', text: '#3C3489' },
  { bg: '#FAC775', text: '#633806' },
  { bg: '#F4C0D1', text: '#72243E' },
  { bg: '#F0997B', text: '#712B13' },
];

const PRIORITY = {
  high:   { bg: '#FCEBEB', color: '#A32D2D' },
  medium: { bg: '#FAEEDA', color: '#633806' },
  low:    { bg: '#EAF3DE', color: '#3B6D11' },
};

const STATUS = {
  active:    { bg: '#EAF3DE', color: '#3B6D11' },
  completed: { bg: '#E6F1FB', color: '#185FA5' },
  inactive:  { bg: '#FCEBEB', color: '#A32D2D' },
};

// ── Mini components ───────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 28 }) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const c = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: c.bg, color: c.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 500, fontSize: Math.round(size * 0.34),
    }}>{initials}</div>
  );
};

const PriorityBadge = ({ priority }) => {
  const s = PRIORITY[priority] || PRIORITY.medium;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.inactive;
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
};

const ProgressBar = ({ pct = 0 }) => {
  const color = pct >= 80 ? '#3B6D11' : pct >= 40 ? '#185FA5' : '#A32D2D';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>
        <span>Progress</span>
        <span style={{ color: '#374151', fontWeight: 500 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#f3f4f6' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width .4s' }} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, valueColor }) => (
  <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 18px', flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 22, fontWeight: 500, color: valueColor || '#111827' }}>{value}</div>
    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
  </div>
);

const MemberStack = ({ members = [], size = 26, max = 4 }) => (
  <div style={{ display: 'flex', gap: 3 }}>
    {members.slice(0, max).map((m, i) => <Avatar key={i} name={m.name || m} size={size} />)}
    {members.length > max && (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: '#f3f4f6', color: '#6b7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 500,
      }}>+{members.length - max}</div>
    )}
  </div>
);

// ── Form helpers ──────────────────────────────────────────────────────────────
const inputSt = (extra = {}) => ({
  width: '100%', padding: '8px 11px', border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none', boxSizing: 'border-box', ...extra,
});

const Field = ({ label, required, children, col = '1/-1' }) => (
  <div style={{ gridColumn: col, marginBottom: 2 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
  </div>
);

const ToggleGroup = ({ name, options, value, onChange }) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {options.map(o => {
      const active = value === o.value;
      return (
        <button key={o.value} type="button"
          onClick={() => onChange({ target: { name, value: o.value } })}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: `1px solid ${active ? o.borderColor : '#e5e7eb'}`,
            background: active ? o.bg : '#fff',
            color: active ? o.color : '#6b7280',
            textTransform: 'capitalize',
          }}>{o.label || o.value}</button>
      );
    })}
  </div>
);

const EMPTY_FORM = {
  name: '', description: '', client_id: '', leader_id: '',
  start_date: '', end_date: '', rate: '', rate_type: 'fixed',
  priority: 'medium', status: 'active',
};

function ProjectForm({ form, onChange, clients, employees, error }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
      <Field label="Project name" required col="1/-1">
        <input name="name" type="text" style={inputSt()} value={form.name} onChange={onChange} placeholder="e.g. Website Redesign" />
      </Field>
      <Field label="Description" col="1/-1">
        <textarea name="description" rows={2} style={inputSt({ resize: 'none', lineHeight: 1.5 })}
          value={form.description} onChange={onChange} placeholder="Brief overview…" />
      </Field>
      <Field label="Client">
        <select name="client_id" style={inputSt({ cursor: 'pointer' })} value={form.client_id} onChange={onChange}>
          <option value="">— None —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
        </select>
      </Field>
      <Field label="Project leader">
        <select name="leader_id" style={inputSt({ cursor: 'pointer' })} value={form.leader_id} onChange={onChange}>
          <option value="">— None —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
        </select>
      </Field>
      <Field label="Start date">
        <input type="date" name="start_date" style={inputSt()} value={form.start_date} onChange={onChange} />
      </Field>
      <Field label="End date">
        <input type="date" name="end_date" style={inputSt()} value={form.end_date} onChange={onChange} />
      </Field>
      <Field label="Rate">
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9ca3af' }}>$</span>
            <input type="number" name="rate" style={inputSt({ paddingLeft: 24 })} value={form.rate} onChange={onChange} placeholder="0.00" min="0" />
          </div>
          <select name="rate_type" style={{ ...inputSt(), width: 100, flexShrink: 0, cursor: 'pointer' }} value={form.rate_type} onChange={onChange}>
            <option value="fixed">Fixed</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>
      </Field>
      <Field label="Priority">
        <ToggleGroup name="priority" value={form.priority} onChange={onChange} options={[
          { value: 'high',   bg: '#FCEBEB', color: '#A32D2D', borderColor: '#fca5a5' },
          { value: 'medium', bg: '#FAEEDA', color: '#633806', borderColor: '#fcd34d' },
          { value: 'low',    bg: '#EAF3DE', color: '#3B6D11', borderColor: '#86efac' },
        ]} />
      </Field>
      <Field label="Status" col="1/-1">
        <ToggleGroup name="status" value={form.status} onChange={onChange} options={[
          { value: 'active',    bg: '#EAF3DE', color: '#3B6D11', borderColor: '#86efac' },
          { value: 'inactive',  bg: '#FCEBEB', color: '#A32D2D', borderColor: '#fca5a5' },
          { value: 'completed', bg: '#E6F1FB', color: '#185FA5', borderColor: '#93c5fd' },
        ]} />
      </Field>
      {error && (
        <div style={{
          gridColumn: '1/-1', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#dc2626',
          display: 'flex', gap: 7, marginTop: 4,
        }}>
          <span>⚠</span><span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Projects() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [projects,  setProjects]  = useState([]);
  const [clients,   setClients]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [viewMode,  setViewMode]  = useState('grid');
  const [search,    setSearch]    = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [activeProject, setActiveProject] = useState(null);

  const [showAdd,  setShowAdd]  = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel,  setShowDel]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes, eRes] = await Promise.all([
        apiFetch(`${API}/projects`),
        apiFetch(`${API}/clients`),
        apiFetch(`${API}/employees`),
      ]);
      if (pRes.success) setProjects(pRes.data);
      if (cRes.success) setClients(cRes.data);
      if (eRes.success) setEmployees(eRes.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = projects.filter(p => {
    const q = search.toLowerCase();
    const mq = !q || p.name.toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q);
    const ms = !filterStatus   || p.status   === filterStatus;
    const mp = !filterPriority || p.priority === filterPriority;
    return mq && ms && mp;
  });

  const activeCount    = projects.filter(p => p.status === 'active').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;
  const avgProgress    = projects.length
    ? Math.round(projects.reduce((a, p) => a + (p.progress_pct || 0), 0) / projects.length)
    : 0;

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openEdit = proj => {
    setSelected(proj);
    setForm({
      name:        proj.name        || '',
      description: proj.description || '',
      client_id:   proj.clientId    ?? proj.client_id   ?? '',
      leader_id:   proj.leaderId    ?? proj.leader_id   ?? '',
      start_date:  proj.startDate   ?? proj.start_date  ?? '',
      end_date:    proj.endDate     ?? proj.end_date    ?? '',
      rate:        proj.rate        || '',
      rate_type:   proj.rateType    ?? proj.rate_type   ?? 'fixed',
      priority:    proj.priority    || 'medium',
      status:      proj.status      || 'active',
    });
    setError('');
    setShowEdit(true);
  };

  const handleAdd = async () => {
    setError('');
    if (!form.name.trim()) return setError('Project name is required.');
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/projects`, { method: 'POST', body: JSON.stringify(form) });
      if (res.success) { setShowAdd(false); setForm(EMPTY_FORM); load(); }
      else setError(res.message || 'Failed to create project.');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/projects/${selected.id}`, { method: 'PUT', body: JSON.stringify(form) });
      if (res.success) { setShowEdit(false); load(); }
      else setError(res.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    await apiFetch(`${API}/projects/${selected.id}`, { method: 'DELETE' });
    setShowDel(false); load(); setSaving(false);
  };

  const ModalFooter = ({ onCancel, onConfirm, confirmLabel, isDanger }) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button onClick={onCancel} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', cursor: 'pointer' }}>Cancel</button>
      <button onClick={onConfirm} disabled={saving} style={{
        padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, minWidth: 120,
        background: isDanger ? 'transparent' : '#4f46e5',
        color: isDanger ? '#dc2626' : '#fff',
        border: isDanger ? '1px solid #fca5a5' : 'none',
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
      }}>
        {saving && <span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} />}
        {confirmLabel}
      </button>
    </div>
  );

  const ViewBtn = ({ mode, label }) => (
    <button onClick={() => setViewMode(mode)} style={{
      padding: '5px 13px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 7,
      background: viewMode === mode ? '#f5f3ff' : 'transparent',
      color: viewMode === mode ? '#4f46e5' : '#6b7280',
    }}>{label}</button>
  );

  // ── Grid card ─────────────────────────────────────────────────────────────
  const ProjectCard = ({ proj }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0',
        padding: '20px 20px 16px', position: 'relative', cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
      }}
        onClick={() => setActiveProject(proj)}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.boxShadow = 'none'; }}
      >
        {/* Custom dropdown menu */}
        <div style={{ position: 'absolute', top: 14, right: 14 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb',
            background: menuOpen ? '#f5f3ff' : '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#6b7280', lineHeight: 1,
          }}>⋮</button>
          {menuOpen && (
            <>
              {/* backdrop to close */}
              <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setMenuOpen(false)} />
              <div style={{
                position: 'absolute', top: 34, right: 0, zIndex: 10,
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 130, overflow: 'hidden',
              }}>
                <button onClick={() => { setMenuOpen(false); openEdit(proj); }} style={{
                  display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left',
                  border: 'none', background: 'none', fontSize: 13, color: '#374151', cursor: 'pointer',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >✏️ Edit</button>
                {isAdmin && (
                  <button onClick={() => { setMenuOpen(false); setSelected(proj); setShowDel(true); }} style={{
                    display: 'block', width: '100%', padding: '9px 14px', textAlign: 'left',
                    border: 'none', background: 'none', fontSize: 13, color: '#dc2626', cursor: 'pointer',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >🗑 Delete</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Title + client */}
        <div style={{ paddingRight: 36, marginBottom: 6 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {proj.name}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
            {proj.client_name || '—'} · <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{proj.project_code}</span>
          </div>
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <PriorityBadge priority={proj.priority} />
          <StatusBadge status={proj.status} />
        </div>

        {/* Task counts */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <span style={{ background: '#E6F1FB', color: '#185FA5', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>
            ✓ {proj.completed_tasks || 0} done
          </span>
          <span style={{ background: '#EEEDFE', color: '#3C3489', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>
            ○ {proj.todo_tasks || 0} todo
          </span>
          <span style={{ background: '#FAEEDA', color: '#633806', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20 }}>
            ◐ {proj.doing_tasks || 0} doing
          </span>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 16 }}>
          <ProgressBar pct={proj.progress_pct || 0} />
        </div>

        {/* Footer: members + deadline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f5f5f5' }}>
          <MemberStack members={proj.members || []} size={28} max={4} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {proj.end_date
              ? `Due ${new Date(proj.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
              : 'No deadline'}
          </span>
        </div>
      </div>
    );
  };

  // ── List row ──────────────────────────────────────────────────────────────
  const ListRow = ({ proj }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: '#fff', border: '0.5px solid #f3f4f6', borderRadius: 10,
      padding: '12px 16px', cursor: 'pointer', transition: 'border-color .15s',
    }}
      onClick={() => setActiveProject(proj)}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#e5e7eb'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#f3f4f6'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.name}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{proj.client_name || '—'} · {proj.leader_name || 'No leader'}</div>
      </div>
      <MemberStack members={proj.members || []} size={24} max={3} />
      <div style={{ minWidth: 120 }}><ProgressBar pct={proj.progress_pct || 0} /></div>
      <PriorityBadge priority={proj.priority} />
      <StatusBadge status={proj.status} />
      <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
        {proj.end_date ? new Date(proj.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
      </span>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'transparent', color: '#374151', cursor: 'pointer' }}
          onClick={() => openEdit(proj)}>Edit</button>
        {isAdmin && (
          <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
            onClick={() => { setSelected(proj); setShowDel(true); }}>Delete</button>
        )}
      </div>
    </div>
  );

  if (activeProject) {
    return <ProjectDetails projectId={activeProject.id} onBack={() => setActiveProject(null)} employees={employees} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 600, margin: 0, fontSize: 20, color: '#111827' }}>Projects</h3>
          <nav style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>Dashboard / <span style={{ color: '#4f46e5' }}>Projects</span></nav>
        </div>
        <button style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={() => { setForm(EMPTY_FORM); setError(''); setShowAdd(true); }}>
          + Add project
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Total projects" value={projects.length} />
        <StatCard label="Active"         value={activeCount}    valueColor="#3B6D11" />
        <StatCard label="Completed"      value={completedCount} valueColor="#185FA5" />
        <StatCard label="Avg progress"   value={`${avgProgress}%`} valueColor="#633806" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }}>⌕</span>
          <input type="text" placeholder="Search projects or clients…" value={search}
            onChange={e => setSearch(e.target.value)} style={{
              width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #e5e7eb',
              borderRadius: 9, fontSize: 13, color: '#111827', background: '#fff',
              outline: 'none', boxSizing: 'border-box',
            }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer' }}>
          <option value="">All priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
          <ViewBtn mode="grid" label="⊞ Grid" />
          <ViewBtn mode="list" label="☰ List" />
        </div>
      </div>

      {/* Count */}
      <div style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingBottom: 8, borderBottom: '0.5px solid #f3f4f6', marginBottom: 14 }}>
        {visible.length} project{visible.length !== 1 ? 's' : ''}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div className="spinner-border spinner-border-sm text-primary mb-2" />
          <div style={{ fontSize: 13 }}>Loading projects…</div>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>No projects found.</div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {visible.map(p => <ProjectCard key={p.id} proj={p} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map(p => <ListRow key={p.id} proj={p} />)}
        </div>
      )}

      {/* Add */}
      <Modal title="Create project" open={showAdd} onClose={() => setShowAdd(false)} size="lg"
        footer={<ModalFooter onCancel={() => setShowAdd(false)} onConfirm={handleAdd} confirmLabel={saving ? 'Creating…' : 'Create project'} />}>
        <ProjectForm form={form} onChange={handleChange} clients={clients} employees={employees} error={error} />
      </Modal>

      {/* Edit */}
      <Modal title={`Edit — ${selected?.name || ''}`} open={showEdit} onClose={() => setShowEdit(false)} size="lg"
        footer={<ModalFooter onCancel={() => setShowEdit(false)} onConfirm={handleEdit} confirmLabel={saving ? 'Saving…' : 'Save changes'} />}>
        <ProjectForm form={form} onChange={handleChange} clients={clients} employees={employees} error={error} />
      </Modal>

      {/* Delete */}
      <Modal title="Delete project" open={showDel} onClose={() => setShowDel(false)}
        footer={<ModalFooter onCancel={() => setShowDel(false)} onConfirm={handleDelete} confirmLabel={saving ? 'Deleting…' : 'Yes, delete'} isDanger />}>
        <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#111827', marginBottom: 6 }}>Delete <strong>{selected?.name}</strong>?</p>
          <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>This will also delete all tasks in this project.<br />This cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}