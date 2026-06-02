/**
 * Clients.jsx — improved UI
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
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
  catch { return { success: false, message: `Server error ${r.status}: ${text.slice(0, 200) || '(empty)'}` }; }
};

const generateUsernamePreview = (firstName, lastName) => {
  if (!firstName && !lastName) return '';
  return `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`.replace(/\s+/g, '');
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#B5D4F4', text: '#0C447C' },
  { bg: '#9FE1CB', text: '#085041' },
  { bg: '#F4C0D1', text: '#72243E' },
  { bg: '#FAC775', text: '#633806' },
  { bg: '#CECBF6', text: '#3C3489' },
  { bg: '#F0997B', text: '#712B13' },
];

const Avatar = ({ name = '', size = 40 }) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const c = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 500, fontSize: size * 0.35, flexShrink: 0,
    }}>{initials}</div>
  );
};

const StatCard = ({ label, value, valueColor }) => (
  <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 18px', flex: 1, minWidth: 130 }}>
    <div style={{ fontSize: 24, fontWeight: 500, color: valueColor || '#111827' }}>{value}</div>
    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const active = status === 'active' || status === 1 || status === '1';
  return (
    <span style={{
      background: active ? '#EAF3DE' : '#FCEBEB',
      color: active ? '#3B6D11' : '#A32D2D',
      fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
};

const ProjectsBadge = ({ count }) => (
  <span style={{
    background: '#E6F1FB', color: '#185FA5',
    fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
  }}>
    {count || 0} project{count !== 1 ? 's' : ''}
  </span>
);

// ── Form ──────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  first_name: '', last_name: '', username: '', email: '',
  password: '', confirmpass: '', phone: '', company: '', address: '',
};

const inputSt = (extra = {}) => ({
  width: '100%', padding: '8px 11px',
  border: '1px solid #e5e7eb', borderRadius: 8,
  fontSize: 13, color: '#111827', background: '#fff',
  outline: 'none', boxSizing: 'border-box', ...extra,
});

const Field = ({ label, required, hint, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 500, color: '#6b7280',
      marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4,
    }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
    {hint && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{hint}</div>}
  </div>
);

function ClientForm({ form, onChange, isNew, error, usernameAuto }) {
  const [showPass, setShowPass] = useState(false);
  const passMismatch = form.confirmpass && form.password !== form.confirmpass;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="First name" required>
          <input name="first_name" type="text" style={inputSt()} value={form.first_name} onChange={onChange} placeholder="John" />
        </Field>
        <Field label="Last name" required>
          <input name="last_name" type="text" style={inputSt()} value={form.last_name} onChange={onChange} placeholder="Doe" />
        </Field>
      </div>

      <Field label="Username"
        hint={isNew && usernameAuto && !form.username ? `Auto-generated: "${usernameAuto}" if left blank` : undefined}>
        <div style={{ position: 'relative' }}>
          <input name="username" type="text"
            style={inputSt({ paddingRight: isNew && usernameAuto && !form.username ? 120 : 11 })}
            value={form.username} onChange={onChange} placeholder={usernameAuto || 'john.doe'} />
          {isNew && usernameAuto && !form.username && (
            <span style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              fontSize: 10, background: '#E6F1FB', color: '#185FA5',
              padding: '2px 7px', borderRadius: 20, fontWeight: 500, pointerEvents: 'none',
            }}>auto: {usernameAuto}</span>
          )}
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Email" required>
          <input name="email" type="email" style={inputSt()} value={form.email} onChange={onChange} placeholder="john@example.com" />
        </Field>
        <Field label="Phone">
          <input name="phone" type="text" style={inputSt()} value={form.phone} onChange={onChange} placeholder="+91 98765 43210" />
        </Field>
      </div>

      {isNew && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Password" required>
            <div style={{ position: 'relative' }}>
              <input name="password" type={showPass ? 'text' : 'password'}
                style={inputSt({ paddingRight: 36 })} value={form.password} onChange={onChange} placeholder="Min 8 chars" />
              <button type="button" onClick={() => setShowPass(p => !p)} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9ca3af', padding: 0,
              }}>{showPass ? '🙈' : '👁'}</button>
            </div>
          </Field>
          <Field label="Confirm password" required>
            <input name="confirmpass" type={showPass ? 'text' : 'password'}
              style={inputSt({ borderColor: passMismatch ? '#ef4444' : undefined })}
              value={form.confirmpass} onChange={onChange} placeholder="Re-enter" />
            {passMismatch && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Passwords don't match</div>}
          </Field>
        </div>
      )}

      <Field label="Company name" required>
        <input name="company" type="text" style={inputSt()} value={form.company} onChange={onChange} placeholder="Acme Pvt. Ltd." />
      </Field>

      <Field label="Address">
        <textarea name="address" rows={2} style={inputSt({ resize: 'none', lineHeight: 1.5 })}
          value={form.address} onChange={onChange} placeholder="Street, City, State" />
      </Field>

      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '9px 13px', fontSize: 13, color: '#dc2626', display: 'flex', gap: 7,
        }}>
          <span style={{ flexShrink: 0 }}>⚠</span><span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Clients({ onSelectProject }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/clients`);
      if (res.success) setClients(res.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalProjects = clients.reduce((s, c) => s + (parseInt(c.project_count) || 0), 0);
  const active = clients.filter(c => c.status === 1 || c.status === '1' || c.status === 'active').length;

  const isActive = c => c.status === 1 || c.status === '1' || c.status === 'active';

  const visible = clients.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q
      || (c.company || '').toLowerCase().includes(q)
      || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q);
    const matchS = !statusFilter
      || (statusFilter === 'active' && isActive(c))
      || (statusFilter === 'inactive' && !isActive(c));
    return matchQ && matchS;
  });

  const usernameAuto = generateUsernamePreview(form.first_name, form.last_name);
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async () => {
    setError('');
    if (!form.first_name || !form.last_name || !form.email || !form.company)
      return setError('First name, last name, email and company are required.');
    if (!form.password) return setError('Password is required.');
    if (form.password !== form.confirmpass) return setError('Passwords do not match.');
    setSaving(true);
    try {
      const payload = { ...form }; delete payload.confirmpass;
      const res = await apiFetch(`${API}/clients`, { method: 'POST', body: JSON.stringify(payload) });
      if (res.success) { setShowAdd(false); setForm(EMPTY_FORM); load(); }
      else setError(res.message || 'Failed to add client.');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = { ...form }; delete payload.password; delete payload.confirmpass;
      const res = await apiFetch(`${API}/clients/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      if (res.success) { setShowEdit(false); load(); }
      else setError(res.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await apiFetch(`${API}/clients/${selected.id}`, { method: 'DELETE' });
      setShowDel(false); load();
    } finally { setSaving(false); }
  };

  const openEdit = (client) => {
    setSelected(client);
    setForm({ ...EMPTY_FORM, ...client, password: '', confirmpass: '' });
    setError(''); setShowEdit(true);
  };

  const ModalFooter = ({ onCancel, onConfirm, confirmLabel, isDanger }) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button onClick={onCancel} style={{
        padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', cursor: 'pointer',
      }}>Cancel</button>
      <button onClick={onConfirm} disabled={saving} style={{
        padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: isDanger ? 'transparent' : '#4f46e5',
        color: isDanger ? '#dc2626' : '#fff',
        border: isDanger ? '1px solid #fca5a5' : 'none',
        cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, minWidth: 110,
      }}>
        {saving && <span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} />}
        {confirmLabel}
      </button>
    </div>
  );

  // ── List row ──────────────────────────────────────────────────────────────
  const ListRow = ({ client }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: '#fff', border: '0.5px solid #f3f4f6', borderRadius: 10,
      padding: '12px 16px', transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#e5e7eb'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#f3f4f6'}
    >
      <Avatar name={`${client.first_name} ${client.last_name}`} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {client.company}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {client.first_name} {client.last_name} · {client.email}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
        <ProjectsBadge count={client.project_count} />
        <StatusBadge status={client.status} />
        <span style={{ fontSize: 11, color: '#d1d5db', fontFamily: 'monospace', display: 'none' }} className="d-md-inline">{client.client_id}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'transparent', color: '#374151', cursor: 'pointer' }}
          onClick={() => openEdit(client)}>Edit</button>
        {isAdmin && (
          <button style={{ fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', cursor: 'pointer' }}
            onClick={() => { setSelected(client); setShowDel(true); }}>Delete</button>
        )}
      </div>
    </div>
  );

  // ── Grid card ─────────────────────────────────────────────────────────────
  const GridCard = ({ client }) => (
    <div style={{
      background: '#fff', border: '0.5px solid #f3f4f6',
      borderRadius: 14, padding: '20px 16px', textAlign: 'center',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#e5e7eb'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#f3f4f6'}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <div className="dropdown">
          <button className="btn btn-sm btn-light" data-bs-toggle="dropdown"
            style={{ width: 28, height: 28, padding: 0, borderRadius: 7 }}>⋮</button>
          <ul className="dropdown-menu dropdown-menu-end" style={{ fontSize: 13 }}>
            <li><button className="dropdown-item" onClick={() => openEdit(client)}>Edit</button></li>
            {isAdmin && <li>
              <button className="dropdown-item text-danger"
                onClick={() => { setSelected(client); setShowDel(true); }}>Delete</button>
            </li>}
          </ul>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <Avatar name={`${client.first_name} ${client.last_name}`} size={56} />
      </div>
      <div style={{ fontWeight: 500, fontSize: 14, color: '#111827', marginBottom: 2 }}>{client.company}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 1 }}>{client.first_name} {client.last_name}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>{client.phone || '—'}</div>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <ProjectsBadge count={client.project_count} />
        <StatusBadge status={client.status} />
      </div>
      <div style={{ fontSize: 11, color: '#e5e7eb', fontFamily: 'monospace', marginBottom: 12 }}>{client.client_id}</div>
      <button style={{
        width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
        background: '#f5f3ff', color: '#4f46e5', border: 'none', cursor: 'pointer',
      }} onClick={() => onSelectProject && onSelectProject({ client_id: client.id })}>
        View profile
      </button>
    </div>
  );

  const ViewBtn = ({ mode, label }) => (
    <button onClick={() => setViewMode(mode)} style={{
      padding: '5px 12px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
      background: viewMode === mode ? '#f5f3ff' : 'transparent',
      color: viewMode === mode ? '#4f46e5' : '#6b7280',
      borderRadius: 7,
    }}>{label}</button>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontWeight: 600, margin: 0, fontSize: 20, color: '#111827' }}>Clients</h3>
          <nav style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
            Dashboard / <span style={{ color: '#4f46e5' }}>Clients</span>
          </nav>
        </div>
        <button style={{
          padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 600,
          background: '#4f46e5', color: '#fff', border: 'none', cursor: 'pointer',
        }} onClick={() => { setForm(EMPTY_FORM); setError(''); setShowAdd(true); }}>
          + Add client
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Total clients" value={clients.length} />
        <StatCard label="Active" value={active} valueColor="#3B6D11" />
        <StatCard label="Total projects" value={totalProjects} valueColor="#185FA5" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af' }}>⌕</span>
          <input type="text" placeholder="Search by name, company or email…" value={search}
            onChange={e => setSearch(e.target.value)} style={{
              width: '100%', padding: '8px 12px 8px 30px',
              border: '1px solid #e5e7eb', borderRadius: 9,
              fontSize: 13, color: '#111827', background: '#fff',
              outline: 'none', boxSizing: 'border-box',
            }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{
          padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 9,
          fontSize: 13, color: '#374151', background: '#fff', cursor: 'pointer',
        }}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
          <ViewBtn mode="list" label="☰ List" />
          <ViewBtn mode="grid" label="⊞ Grid" />
        </div>
      </div>

      {/* Count row */}
      <div style={{
        fontSize: 11, fontWeight: 500, color: '#9ca3af',
        textTransform: 'uppercase', letterSpacing: 0.5,
        paddingBottom: 8, borderBottom: '0.5px solid #f3f4f6', marginBottom: 10,
      }}>
        {visible.length} client{visible.length !== 1 ? 's' : ''}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
          <div className="spinner-border spinner-border-sm text-primary mb-2" />
          <div style={{ fontSize: 13 }}>Loading clients…</div>
        </div>
      ) : visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 14 }}>
          No clients found.
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map(c => <ListRow key={c.id} client={c} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {visible.map(c => <GridCard key={c.id} client={c} />)}
        </div>
      )}

      {/* Add Modal */}
      <Modal title="Add new client" open={showAdd} onClose={() => setShowAdd(false)}
        footer={<ModalFooter onCancel={() => setShowAdd(false)} onConfirm={handleAdd}
          confirmLabel={saving ? 'Saving…' : 'Add client'} />}>
        <ClientForm form={form} onChange={handleChange} isNew error={error} usernameAuto={usernameAuto} />
      </Modal>

      {/* Edit Modal */}
      <Modal title={`Edit — ${selected?.company || ''}`} open={showEdit} onClose={() => setShowEdit(false)}
        footer={<ModalFooter onCancel={() => setShowEdit(false)} onConfirm={handleEdit}
          confirmLabel={saving ? 'Saving…' : 'Save changes'} />}>
        <ClientForm form={form} onChange={handleChange} isNew={false} error={error} usernameAuto={usernameAuto} />
      </Modal>

      {/* Delete Modal */}
      <Modal title="Delete client" open={showDel} onClose={() => setShowDel(false)}
        footer={<ModalFooter onCancel={() => setShowDel(false)} onConfirm={handleDelete}
          confirmLabel={saving ? 'Deleting…' : 'Yes, delete'} isDanger />}>
        <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
          <p style={{ fontSize: 15, fontWeight: 500, color: '#111827', marginBottom: 6 }}>
            Delete <strong>{selected?.company}</strong>?
          </p>
          <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
            Their projects will remain but the client link will be cleared.<br />This cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}