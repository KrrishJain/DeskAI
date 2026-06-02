// pages/recruitment/JobsPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  PlusIcon,
  BriefcaseIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  PencilSquareIcon,
  CloudArrowUpIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  open:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  closed:  'bg-red-50 text-red-600 ring-1 ring-red-200',
  on_hold: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

export default function JobsPage() {
  const navigate = useNavigate();

  const [jobs, setJobs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError]               = useState('');

  useEffect(() => { fetchJobs(); }, []);

  async function fetchJobs() {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/jobs');
      setJobs(data.data);
    } catch {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this job opening? This will also remove all associated candidates.')) return;
    try {
      await axios.delete(`/api/jobs/${id}`);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch {
      alert('Failed to delete job.');
    }
  }

  const filtered = jobs.filter(j => {
    const matchSearch =
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      (j.department || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus ? j.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  const counts = {
    total:   jobs.length,
    open:    jobs.filter(j => j.status === 'open').length,
    on_hold: jobs.filter(j => j.status === 'on_hold').length,
    closed:  jobs.filter(j => j.status === 'closed').length,
  };

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Job Openings</h1>
          <p className="text-sm text-surface-500 mt-1">
            Manage positions and track applicants through the ATS pipeline
          </p>
        </div>
        <button
          onClick={() => navigate('/recruitment/jobs/create')}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <PlusIcon className="w-4 h-4" />
          New Job Opening
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',   value: counts.total,   color: 'text-brand-600',   bg: 'bg-brand-50'   },
          { label: 'Open',    value: counts.open,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'On Hold', value: counts.on_hold, color: 'text-amber-600',   bg: 'bg-amber-50'   },
          { label: 'Closed',  value: counts.closed,  color: 'text-red-500',     bg: 'bg-red-50'     },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-200 px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
              <BriefcaseIcon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{s.value}</p>
              <p className="text-xs text-surface-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or department..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-surface-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-surface-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="on_hold">On Hold</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <span className="ml-auto text-sm text-surface-400">
          Showing {filtered.length} of {jobs.length}
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-surface-200 py-20 text-center">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-surface-400">Loading jobs...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 rounded-xl border border-red-100 py-10 text-center text-red-500 text-sm">{error}</div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Position</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Experience</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Skills</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Candidates</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Weights S/E/D</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-surface-400">
                    <BriefcaseIcon className="w-8 h-8 mx-auto mb-2 text-surface-200" />
                    No job openings found.
                  </td>
                </tr>
              ) : filtered.map(job => (
                <tr key={job.id} className="hover:bg-surface-50/70 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-surface-800">{job.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {job.education_required && (
                        <span className="text-xs text-surface-400">{job.education_required}</span>
                      )}
                      {job.education_strict && (
                        <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Strict</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-surface-500">
                    {job.department || <span className="text-surface-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-surface-600">
                    {job.experience_required_min ?? 0}
                    {job.experience_required_max ? `–${job.experience_required_max}` : '+'} yrs
                  </td>
                  <td className="px-5 py-4 text-surface-600">
                    {job.skill_count ?? 0} <span className="text-surface-400 text-xs">skills</span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => navigate(`/recruitment/candidates?jobId=${job.id}`)}
                      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium"
                    >
                      <BriefcaseIcon className="w-3.5 h-3.5" />
                      {job.candidate_count ?? 0}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs text-surface-500 bg-surface-100 px-2 py-1 rounded">
                      {job.skill_weight ?? 50}/{job.experience_weight ?? 30}/{job.education_weight ?? 20}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[job.status]}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => navigate(`/recruitment/upload?jobId=${job.id}`)}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-surface-400 hover:text-brand-600 transition-colors"
                        title="Upload Resumes"
                      >
                        <CloudArrowUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/recruitment/candidates?jobId=${job.id}`)}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-surface-400 hover:text-brand-600 transition-colors"
                        title="View Candidates"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/recruitment/jobs/${job.id}/edit`)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-surface-400 hover:text-amber-600 transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-surface-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}