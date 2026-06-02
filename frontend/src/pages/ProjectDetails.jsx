/**
 * ProjectDetails.jsx — Enhanced UI + Drag & Drop Kanban
 * Uses native HTML5 drag-and-drop API (no external deps)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api';
const apiFetch = async (url, opts = {}) => {
  const r = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    credentials: 'include',
    ...opts,
  });
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { return { success: false }; }
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

const COL = {
  todo:  { label: 'To Do',   accent: '#7c3aed', light: '#f5f3ff', border: '#ede9fe', dot: '#7c3aed' },
  doing: { label: 'In Progress', accent: '#d97706', light: '#fffbeb', border: '#fde68a', dot: '#d97706' },
  done:  { label: 'Done',    accent: '#059669', light: '#ecfdf5', border: '#a7f3d0', dot: '#059669' },
};

const PRIORITY_STYLE = {
  high:   { bg: '#FCEBEB', color: '#A32D2D' },
  medium: { bg: '#FAEEDA', color: '#633806' },
  low:    { bg: '#EAF3DE', color: '#3B6D11' },
};

const STATUS_STYLE = {
  active:    { bg: '#EAF3DE', color: '#3B6D11' },
  inactive:  { bg: '#FCEBEB', color: '#A32D2D' },
  completed: { bg: '#E6F1FB', color: '#185FA5' },
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 36 }) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const c = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div title={name} style={{
      width: size, height: size, borderRadius: '50%',
      background: c.bg, color: c.text, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontSize: Math.round(size * 0.36),
    }}>{initials}</div>
  );
};

// ── Progress ring ─────────────────────────────────────────────────────────────
const ProgressRing = ({ pct = 0, size = 88 }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? '#059669' : pct >= 40 ? '#4f46e5' : '#d97706';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={7} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset .6s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        fontSize={15} fontWeight="700" fill="#111827" style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {pct}%
      </text>
    </svg>
  );
};

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onDelete, onStatusChange, onTitleChange, isDragging, dragHandlers }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const saveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) { setTitle(task.title); return; }
    await apiFetch(`${API}/projects/${task.project_id}/tasks/${task.id}`, {
      method: 'PUT', body: JSON.stringify({ title: trimmed }),
    });
    onTitleChange(task.id, trimmed);
  };

  return (
    <div
      draggable
      {...dragHandlers}
      style={{
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #f0f0f0',
        padding: '12px 14px',
        marginBottom: 8,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity .15s, box-shadow .15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Drag handle indicator */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ color: '#d1d5db', fontSize: 14, marginTop: 1, cursor: 'grab', flexShrink: 0 }}>⠿</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={() => { setEditing(false); saveTitle(); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setEditing(false); saveTitle(); }
                if (e.key === 'Escape') { setTitle(task.title); setEditing(false); }
              }}
              style={{
                width: '100%', padding: '4px 8px', border: '1.5px solid #818cf8',
                borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
          ) : (
            <p onClick={() => setEditing(true)} title="Click to edit" style={{
              margin: 0, fontWeight: 500, fontSize: 13, lineHeight: 1.4,
              cursor: 'text',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
              color: task.status === 'done' ? '#9ca3af' : '#111827',
            }}>{title}</p>
          )}
        </div>
      </div>

      {/* Assigned person */}
      {task.assigned_name && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Avatar name={task.assigned_name} size={20} />
          <span style={{ fontSize: 11, color: '#6b7280' }}>{task.assigned_name}</span>
        </div>
      )}

      {/* Due date */}
      {task.due_date && (
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
          📅 {new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={e => { e.stopPropagation(); onDelete(task.id); }}
          style={{
            fontSize: 11, borderRadius: 6, padding: '3px 8px', border: '1px solid #fecaca',
            background: 'transparent', color: '#dc2626', cursor: 'pointer',
          }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ status, tasks, onDelete, onStatusChange, onTitleChange, onAdd, onDrop }) {
  const cfg = COL[status];
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState(null);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await onAdd(status, newTitle.trim());
    setNewTitle(''); setAddOpen(false);
  };

  return (
    <div style={{ flex: '1 1 0', minWidth: 0 }}>
      {/* Column header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px', borderRadius: '10px 10px 0 0',
        background: cfg.light, borderBottom: `2px solid ${cfg.accent}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.accent }} />
          <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{cfg.label}</span>
        </div>
        <span style={{
          background: cfg.accent, color: '#fff',
          fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '1px 8px',
        }}>{tasks.length}</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setDragOver(false);
          const taskId = parseInt(e.dataTransfer.getData('taskId'));
          const fromStatus = e.dataTransfer.getData('fromStatus');
          if (fromStatus !== status) onDrop(taskId, fromStatus, status);
        }}
        style={{
          background: dragOver ? cfg.light : '#fafafa',
          border: `1px solid ${dragOver ? cfg.border : '#f0f0f0'}`,
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: 10, minHeight: 240,
          transition: 'background .15s, border-color .15s',
        }}
      >
        {tasks.map(t => (
          <TaskCard
            key={t.id}
            task={t}
            isDragging={draggingId === t.id}
            dragHandlers={{
              onDragStart: e => {
                setDraggingId(t.id);
                e.dataTransfer.setData('taskId', t.id);
                e.dataTransfer.setData('fromStatus', status);
                e.dataTransfer.effectAllowed = 'move';
              },
              onDragEnd: () => setDraggingId(null),
            }}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onTitleChange={onTitleChange}
          />
        ))}

        {dragOver && tasks.length === 0 && (
          <div style={{
            border: `2px dashed ${cfg.accent}`, borderRadius: 8,
            padding: '20px 0', textAlign: 'center',
            color: cfg.accent, fontSize: 12, fontWeight: 500,
          }}>Drop here</div>
        )}

        {/* Add task */}
        {addOpen ? (
          <div style={{ background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #e5e7eb', marginTop: 4 }}>
            <textarea autoFocus rows={2} placeholder="Task title…" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
              style={{
                width: '100%', padding: '7px 9px', border: '1px solid #e5e7eb',
                borderRadius: 7, fontSize: 13, resize: 'none', outline: 'none',
                boxSizing: 'border-box', marginBottom: 8,
              }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleAdd} style={{
                padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: cfg.accent, color: '#fff', border: 'none', cursor: 'pointer',
              }}>Add</button>
              <button onClick={() => { setAddOpen(false); setNewTitle(''); }} style={{
                padding: '5px 12px', borderRadius: 7, fontSize: 12,
                background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer',
              }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddOpen(true)} style={{
            width: '100%', border: '1.5px dashed #d1d5db', borderRadius: 8,
            background: 'transparent', color: '#9ca3af', fontSize: 12,
            padding: '8px', cursor: 'pointer', marginTop: 6,
            transition: 'border-color .15s, color .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = cfg.accent; e.currentTarget.style.color = cfg.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProjectDetails({ projectId, onBack, employees = [] }) {
  const [project, setProject] = useState(null);
  const [kanban, setKanban] = useState({ todo: [], doing: [], done: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API}/projects/${projectId}`);
      if (res.success) {
        setProject(res.data.project);
        setKanban(res.data.tasks || { todo: [], doing: [], done: [] });
      }
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  // ── Task handlers ──────────────────────────────────────────────────────────
  const handleAddTask = async (status, title) => {
    const res = await apiFetch(`${API}/projects/${projectId}/tasks`, {
      method: 'POST', body: JSON.stringify({ title, status }),
    });
    if (res.success) setKanban(prev => ({ ...prev, [status]: [...prev[status], res.data] }));
  };

  const handleDeleteTask = async (taskId) => {
    await apiFetch(`${API}/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
    setKanban(prev => {
      const next = {};
      for (const col of ['todo', 'doing', 'done']) next[col] = prev[col].filter(t => t.id !== taskId);
      return next;
    });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const res = await apiFetch(`${API}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT', body: JSON.stringify({ status: newStatus }),
    });
    if (res.success) {
      setKanban(prev => {
        let task;
        const next = {};
        for (const col of ['todo', 'doing', 'done']) {
          next[col] = prev[col].filter(t => { if (t.id === taskId) { task = { ...t, status: newStatus }; return false; } return true; });
        }
        if (task) next[newStatus] = [...next[newStatus], task];
        return next;
      });
    }
  };

  // ── Drag & drop handler ────────────────────────────────────────────────────
  const handleDrop = async (taskId, fromStatus, toStatus) => {
    // Optimistic UI update first
    setKanban(prev => {
      let task;
      const next = {};
      for (const col of ['todo', 'doing', 'done']) {
        next[col] = prev[col].filter(t => { if (t.id === taskId) { task = { ...t, status: toStatus }; return false; } return true; });
      }
      if (task) next[toStatus] = [...next[toStatus], task];
      return next;
    });
    // Persist to backend
    await apiFetch(`${API}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT', body: JSON.stringify({ status: toStatus }),
    });
  };

  const handleTitleChange = (taskId, title) => {
    setKanban(prev => {
      const next = {};
      for (const col of ['todo', 'doing', 'done']) next[col] = prev[col].map(t => t.id === taskId ? { ...t, title } : t);
      return next;
    });
  };

  // ── Computed ───────────────────────────────────────────────────────────────
  const totalTasks = Object.values(kanban).reduce((s, a) => s + a.length, 0);
  const doneTasks  = kanban.done.length;
  const progressPct = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      Loading project…
    </div>
  );

  if (!project) return (
    <div style={{ textAlign: 'center', padding: 80, color: '#ef4444' }}>Project not found.</div>
  );

  const members = project.members || [];
  const priStyle = PRIORITY_STYLE[project.priority] || PRIORITY_STYLE.medium;
  const stStyle  = STATUS_STYLE[project.status]    || STATUS_STYLE.active;

  return (
    <div style={{ fontFamily: 'inherit' }}>

      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: '#f5f3ff', border: 'none', borderRadius: 8,
          padding: '7px 16px', fontWeight: 600, cursor: 'pointer',
          color: '#4f46e5', fontSize: 13,
        }}>← Back</button>
        <nav style={{ fontSize: 12, color: '#9ca3af' }}>
          Projects / <span style={{ color: '#4f46e5', fontWeight: 500 }}>{project.name}</span>
        </nav>
      </div>

      {/* ── Top layout: sidebar + right panels ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 20, flexWrap: 'wrap' }}>

        {/* LEFT sidebar */}
        <div style={{
          background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0',
          padding: '22px', flex: '0 0 280px', minWidth: 260,
        }}>
          <h4 style={{ fontWeight: 700, margin: '0 0 4px', fontSize: 17, color: '#111827' }}>{project.name}</h4>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
            {project.description || 'No description provided.'}
          </p>

          {/* Progress ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f5f5f5' }}>
            <ProgressRing pct={progressPct} size={90} />
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
              {doneTasks} of {totalTasks} tasks completed
            </div>
          </div>

          {/* Info rows */}
          {[
            { label: 'Code',     value: project.project_code || '—' },
            { label: 'Client',   value: project.client_name  || '—' },
            { label: 'Rate',     value: project.rate ? `$${project.rate} / ${project.rate_type}` : '—' },
            { label: 'Start',    value: project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
            { label: 'Deadline', value: project.end_date    ? new Date(project.end_date).toLocaleDateString('en-GB',   { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', paddingBlock: 9, borderBottom: '1px solid #f9f9f9', fontSize: 13 }}>
              <span style={{ color: '#9ca3af', fontWeight: 500 }}>{label}</span>
              <span style={{ color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
            </div>
          ))}

          {/* Priority + Status badges */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <span style={{ background: priStyle.bg, color: priStyle.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
              {project.priority}
            </span>
            <span style={{ background: stStyle.bg, color: stStyle.color, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
              {project.status}
            </span>
          </div>
        </div>

        {/* RIGHT panels */}
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Task stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Total',       value: totalTasks,          color: '#4f46e5', bg: '#f5f3ff' },
              { label: 'To Do',       value: kanban.todo.length,  color: '#7c3aed', bg: '#ede9fe' },
              { label: 'In Progress', value: kanban.doing.length, color: '#d97706', bg: '#fef3c7' },
              { label: 'Done',        value: doneTasks,           color: '#059669', bg: '#d1fae5' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Leader + Team row */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {/* Leader */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '16px 18px', flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Project Leader</div>
              {project.leader_name ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={project.leader_name} size={38} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{project.leader_name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>Lead</div>
                  </div>
                </div>
              ) : <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>No leader assigned</p>}
            </div>

            {/* Team */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '16px 18px', flex: 2, minWidth: 220 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Team · {members.length} member{members.length !== 1 ? 's' : ''}
              </div>
              {members.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>No members assigned</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {members.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={m.name} size={32} />
                      <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Client card */}
          {project.client_name && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Client</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={project.client_name} size={38} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{project.client_name}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{project.client_email || 'No email'} · {project.client_code}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Kanban Board ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0f0f0', padding: '20px 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h5 style={{ fontWeight: 700, margin: 0, fontSize: 16, color: '#111827' }}>Task Board</h5>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>Drag tasks between columns to update status</p>
          </div>
          <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#9ca3af', alignItems: 'center' }}>
            <span style={{ background: '#f0f0f0', padding: '3px 10px', borderRadius: 20 }}>⠿ Drag to move</span>
            <span style={{ background: '#f0f0f0', padding: '3px 10px', borderRadius: 20 }}>Click title to edit</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {['todo', 'doing', 'done'].map(col => (
            <KanbanColumn
              key={col}
              status={col}
              tasks={kanban[col]}
              projectId={projectId}
              employees={employees}
              onDelete={handleDeleteTask}
              onStatusChange={handleStatusChange}
              onTitleChange={handleTitleChange}
              onAdd={handleAddTask}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>
    </div>
  );
}