// pages/recruitment/CandidatesPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeftIcon,
  ArrowsUpDownIcon,
  FunnelIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['uploaded', 'parsing', 'parsed', 'scoring', 'scored', 'reviewed', 'shortlisted', 'rejected'];

const STATUS_STYLE = {
  uploaded:   'bg-slate-100 text-slate-600',
  parsing:    'bg-blue-50 text-blue-600 animate-pulse',
  parsed:     'bg-blue-100 text-blue-700',
  scoring:    'bg-violet-50 text-violet-600 animate-pulse',
  scored:     'bg-emerald-50 text-emerald-700',
  reviewed:   'bg-amber-50 text-amber-700',
  shortlisted:'bg-green-100 text-green-700',
  rejected:   'bg-red-50 text-red-500',
};

const PROCESSING = ['uploaded', 'parsing', 'parsed', 'scoring'];

function ScoreBar({ value, max = 100, color = 'bg-brand-500' }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-surface-600 w-8 text-right">{value ?? '—'}</span>
    </div>
  );
}

function ProcessingBadge({ status }) {
  if (!PROCESSING.includes(status)) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
      <ArrowPathIcon className="w-3 h-3 animate-spin" />
      Processing
    </span>
  );
}

export default function CandidatesPage() {
  const [searchParams]           = useSearchParams();
  const navigate                 = useNavigate();
  const jobId                    = searchParams.get('jobId');

  const [jobs, setJobs]          = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [job, setJob]            = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]    = useState(false);

  // Filters & sort
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy]      = useState('final_score');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Inline edit state: { [candidateId]: { hr_notes, manual_score_override } }
  const [edits, setEdits]        = useState({});
  const [saving, setSaving]      = useState({});

  // Auto-refresh while any candidate is still processing
  const hasProcessing = candidates.some(c => PROCESSING.includes(c.status));

  useEffect(() => { fetchJobs(); }, []);
  useEffect(() => {
    if (selectedJobId) { fetchCandidates(); fetchJobDetails(); }
  }, [selectedJobId, filterStatus, sortBy, sortOrder]);

  // Poll every 4s if any resume is still being processed
  useEffect(() => {
    if (!hasProcessing) return;
    const timer = setInterval(fetchCandidates, 4000);
    return () => clearInterval(timer);
  }, [hasProcessing, selectedJobId]);

  async function fetchJobs() {
    const { data } = await axios.get('/api/jobs');
    setJobs(data.data);
  }

  async function fetchJobDetails() {
    const { data } = await axios.get(`/api/jobs/${selectedJobId}`);
    setJob(data.data);
  }

  const fetchCandidates = useCallback(async () => {
    if (!selectedJobId) return;
    try {
      setLoading(true);
      const params = { sort_by: sortBy, order: sortOrder };
      if (filterStatus) params.status = filterStatus;
      const { data } = await axios.get(`/api/jobs/${selectedJobId}/candidates`, { params });
      setCandidates(data.data);
    } catch { /* ignore polling errors */ }
    finally { setLoading(false); }
  }, [selectedJobId, filterStatus, sortBy, sortOrder]);

  // ── Inline edit helpers ──────────────────────────────────────────────────────
  function getEdit(id, field, fallback) {
    return edits[id]?.[field] !== undefined ? edits[id][field] : fallback;
  }

  function setEdit(id, field, value) {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  }

  async function saveEdits(candidateId) {
    const changes = edits[candidateId];
    if (!changes) return;
    try {
      setSaving(prev => ({ ...prev, [candidateId]: true }));
      const { data } = await axios.patch(`/api/candidates/${candidateId}`, changes);
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, ...data.data } : c));
      setEdits(prev => { const n = { ...prev }; delete n[candidateId]; return n; });
    } catch { alert('Failed to save.'); }
    finally { setSaving(prev => ({ ...prev, [candidateId]: false })); }
  }

  async function updateStatus(candidateId, status) {
    try {
      const { data } = await axios.patch(`/api/candidates/${candidateId}/status`, { status });
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, ...data.data } : c));
    } catch { alert('Failed to update status.'); }
  }

  function toggleSort(col) {
    if (sortBy === col) {
      setSortOrder(o => o === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortBy(col);
      setSortOrder('DESC');
    }
  }

  // ── Progress summary ─────────────────────────────────────────────────────────
  const scored     = candidates.filter(c => !PROCESSING.includes(c.status)).length;
  const total      = candidates.length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/recruitment/jobs')}
          className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-surface-900">Candidates</h1>
          {job && <p className="text-sm text-surface-500 mt-0.5">{job.title}</p>}
        </div>

        {/* Progress pill */}
        {total > 0 && (
          <div className="flex items-center gap-2 bg-surface-100 rounded-full px-3 py-1.5 text-sm text-surface-600">
            {hasProcessing && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin text-blue-500" />}
            <span className="font-medium">{scored}/{total}</span>
            <span>processed</span>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedJobId}
          onChange={e => setSelectedJobId(e.target.value)}
          className="input-field text-sm max-w-[220px]"
        >
          <option value="">— Select Job —</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <FunnelIcon className="w-4 h-4 text-surface-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {!selectedJobId ? (
        <div className="py-16 text-center text-surface-400 text-sm">Select a job to view candidates.</div>
      ) : loading && candidates.length === 0 ? (
        <div className="py-16 text-center text-surface-400 text-sm">Loading candidates...</div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50 text-xs text-surface-500 font-medium uppercase">
                <th className="text-left px-4 py-3">Candidate</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">
                  <button onClick={() => toggleSort('total_experience')} className="flex items-center gap-1 hover:text-surface-800">
                    Exp <ArrowsUpDownIcon className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Rel. Exp</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Skill Match</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">
                  <button onClick={() => toggleSort('ats_score')} className="flex items-center gap-1 hover:text-surface-800">
                    ATS Score <ArrowsUpDownIcon className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 whitespace-nowrap">
                  <button onClick={() => toggleSort('final_score')} className="flex items-center gap-1 hover:text-surface-800">
                    Final Score <ArrowsUpDownIcon className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">HR Notes</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Manual Override</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-surface-50">
              {candidates.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-surface-400">
                    No candidates found.
                  </td>
                </tr>
              )}

              {candidates.map(c => {
                const missingMandatory = c.missing_mandatory_skills || [];
                const hasMissingMandatory = Array.isArray(missingMandatory) && missingMandatory.length > 0;
                const isDirty   = !!edits[c.id];
                const isSaving  = saving[c.id];
                const isProcessing = PROCESSING.includes(c.status);

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-surface-50 transition-colors ${hasMissingMandatory ? 'border-l-2 border-l-red-300' : ''}`}
                  >
                    {/* Name + email */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-surface-800">
                          {c.full_name || <span className="text-surface-400 italic">Processing...</span>}
                        </span>
                        <span className="text-xs text-surface-400">{c.email || '—'}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ProcessingBadge status={c.status} />
                          {hasMissingMandatory && !isProcessing && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                              <ExclamationTriangleIcon className="w-3 h-3" />
                              Missing: {missingMandatory.slice(0, 2).join(', ')}
                              {missingMandatory.length > 2 ? ` +${missingMandatory.length - 2}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-surface-500">{c.phone || '—'}</td>

                    {/* Total exp */}
                    <td className="px-4 py-3 text-surface-600">
                      {c.total_experience != null ? `${c.total_experience} yrs` : '—'}
                    </td>

                    {/* Relevant exp */}
                    <td className="px-4 py-3 text-surface-600">
                      {c.relevant_experience != null ? `${c.relevant_experience} yrs` : '—'}
                    </td>

                    {/* Skill match */}
                    <td className="px-4 py-3 min-w-[120px]">
                      {c.skill_match_percent != null
                        ? <ScoreBar value={c.skill_match_percent} color="bg-violet-400" />
                        : <span className="text-surface-300 text-xs">—</span>
                      }
                    </td>

                    {/* ATS score */}
                    <td className="px-4 py-3 min-w-[120px]">
                      {c.ats_score != null
                        ? <ScoreBar value={c.ats_score} color={c.ats_score >= 70 ? 'bg-emerald-500' : c.ats_score >= 50 ? 'bg-amber-400' : 'bg-red-400'} />
                        : <span className="text-surface-300 text-xs">—</span>
                      }
                    </td>

                    {/* Final score */}
                    <td className="px-4 py-3">
                      {c.final_score != null ? (
                        <span className="flex items-center gap-1 font-semibold text-surface-800">
                          {c.manual_score_override != null && (
                            <CheckBadgeIcon className="w-3.5 h-3.5 text-brand-500" title="Manual override active" />
                          )}
                          {c.final_score}
                        </span>
                      ) : '—'}
                    </td>

                    {/* Status dropdown */}
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={e => updateStatus(c.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:ring-1 focus:ring-brand-400 ${STATUS_STYLE[c.status]}`}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>

                    {/* HR Notes */}
                    <td className="px-4 py-3 min-w-[160px]">
                      <input
                        value={getEdit(c.id, 'hr_notes', c.hr_notes || '')}
                        onChange={e => setEdit(c.id, 'hr_notes', e.target.value)}
                        placeholder="Add note..."
                        className="w-full text-xs px-2 py-1.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 bg-transparent"
                      />
                    </td>

                    {/* Manual score override */}
                    <td className="px-4 py-3 min-w-[110px]">
                      <input
                        type="number"
                        min="0" max="100"
                        value={getEdit(c.id, 'manual_score_override', c.manual_score_override ?? '')}
                        onChange={e => setEdit(c.id, 'manual_score_override', e.target.value)}
                        placeholder="0–100"
                        className="w-full text-xs px-2 py-1.5 border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 bg-transparent"
                      />
                    </td>

                    {/* Save button */}
                    <td className="px-4 py-3">
                      {isDirty && (
                        <button
                          onClick={() => saveEdits(c.id)}
                          disabled={isSaving}
                          className="text-xs px-2.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}