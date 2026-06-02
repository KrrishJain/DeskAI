// pages/recruitment/JobFormPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const EMPTY_FORM = {
  title:                   '',
  department:              '',
  description:             '',
  experience_required_min: '',
  experience_required_max: '',
  education_required:      '',
  education_strict:        false,
  max_resumes:             10,
  skill_weight:            50,
  experience_weight:       30,
  education_weight:        20,
  project_keywords:        [],
  status:                  'open',
};

function Field({ label, hint, required, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {hint && (
          <span className="text-xs text-surface-400 flex items-center gap-1">
            <InformationCircleIcon className="w-3.5 h-3.5" />
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/50">
        <h2 className="text-sm font-semibold text-surface-800">{title}</h2>
        {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

export default function JobFormPage() {
  const navigate      = useNavigate();
  const { id }        = useParams();           // present when editing
  const isEdit        = Boolean(id);

  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEdit) loadJob();
  }, [id]);

  async function loadJob() {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/jobs/${id}`);
      const j = data.data;
      setForm({
        title:                   j.title,
        department:              j.department              || '',
        description:             j.description             || '',
        experience_required_min: j.experience_required_min ?? '',
        experience_required_max: j.experience_required_max ?? '',
        education_required:      j.education_required      || '',
        education_strict:        j.education_strict        || false,
        max_resumes:             j.max_resumes             || 10,
        skill_weight:            j.skill_weight            ?? 50,
        experience_weight:       j.experience_weight       ?? 30,
        education_weight:        j.education_weight        ?? 20,
        project_keywords:        j.project_keywords        || [],
        status:                  j.status                  || 'open',
      });
    } catch {
      setError('Failed to load job details.');
    } finally {
      setLoading(false);
    }
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit() {
    if (!form.title.trim()) return setError('Job title is required.');

    const weightSum = Number(form.skill_weight) + Number(form.experience_weight) + Number(form.education_weight);
    if (weightSum !== 100) return setError(`ATS scoring weights must sum to 100. Current total: ${weightSum}`);

    try {
      setSaving(true);
      setError('');

      if (isEdit) {
        await axios.put(`/api/jobs/${id}`, form);
        setSuccess('Job updated successfully.');
      } else {
        await axios.post('/api/jobs', form);
        setSuccess('Job created successfully.');
      }

      setTimeout(() => navigate('/recruitment/jobs'), 1200);
    } catch (e) {
      setError(e.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  const weightSum = Number(form.skill_weight || 0) + Number(form.experience_weight || 0) + Number(form.education_weight || 0);
  const weightOk  = weightSum === 100;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/recruitment/jobs')}
          className="p-2 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            {isEdit ? 'Edit Job Opening' : 'Create Job Opening'}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {isEdit ? 'Update the details for this position' : 'Fill in the details to post a new position'}
          </p>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-700">
          <CheckCircleIcon className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      {/* ── Section 1: Basic Info ────────────────────────────────────────── */}
      <SectionCard
        title="Basic Information"
        description="Core details about the position"
      >
        <Field label="Job Title" required>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Senior React Developer"
            className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <input
              value={form.department}
              onChange={e => set('department', e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="open">Open</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
        </div>

        <Field label="Job Description">
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={4}
            placeholder="Describe the role, responsibilities, and what you're looking for..."
            className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
        </Field>
      </SectionCard>

      {/* ── Section 2: Requirements ──────────────────────────────────────── */}
      <SectionCard
        title="Requirements"
        description="Experience, education, and resume limits"
      >
        <div className="grid grid-cols-3 gap-4">
          <Field label="Min Experience (yrs)">
            <input
              type="number" min="0"
              value={form.experience_required_min}
              onChange={e => set('experience_required_min', e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Max Experience (yrs)">
            <input
              type="number" min="0"
              value={form.experience_required_max}
              onChange={e => set('experience_required_max', e.target.value)}
              placeholder="No limit"
              className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <Field label="Max Resumes" hint="Per job">
            <input
              type="number" min="1" max="10"
              value={form.max_resumes}
              onChange={e => set('max_resumes', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Education Required">
            <select
              value={form.education_required}
              onChange={e => set('education_required', e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Any</option>
              <option>Diploma</option>
              <option>Bachelor</option>
              <option>Master</option>
              <option>MBA</option>
              <option>PhD</option>
            </select>
          </Field>
          <Field label="Education Mode">
            <div className="flex items-center h-[42px]">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={form.education_strict}
                    onChange={e => set('education_strict', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-surface-200 peer-checked:bg-brand-600 rounded-full transition-colors" />
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-700">Strict Education</p>
                  <p className="text-xs text-surface-400">Auto-reject below required level</p>
                </div>
              </label>
            </div>
          </Field>
        </div>

        <Field label="Project Keywords" hint="boosts ATS score when found in resume">
          <input
            value={(form.project_keywords || []).join(', ')}
            onChange={e => set(
              'project_keywords',
              e.target.value.split(',').map(k => k.trim()).filter(Boolean)
            )}
            placeholder="e.g. fintech, microservices, real-time, payments"
            className="w-full px-3.5 py-2.5 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {form.project_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.project_keywords.map((kw, i) => (
                <span key={i} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                  {kw}
                </span>
              ))}
            </div>
          )}
        </Field>
      </SectionCard>

      {/* ── Section 3: ATS Weights ───────────────────────────────────────── */}
      <SectionCard
        title="ATS Scoring Weights"
        description="Control how much each factor contributes to the final ATS score. Must sum to 100."
      >
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: 'skill_weight',      label: 'Skills',     color: 'text-violet-600', bg: 'bg-violet-50',  bar: 'bg-violet-400' },
            { key: 'experience_weight', label: 'Experience', color: 'text-blue-600',   bg: 'bg-blue-50',    bar: 'bg-blue-400'   },
            { key: 'education_weight',  label: 'Education',  color: 'text-emerald-600',bg: 'bg-emerald-50', bar: 'bg-emerald-400'},
          ].map(w => (
            <div key={w.key} className={`${w.bg} rounded-xl p-4 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${w.color}`}>{w.label}</span>
                <span className={`text-lg font-bold ${w.color}`}>{form[w.key]}%</span>
              </div>
              <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full ${w.bar} rounded-full transition-all`}
                  style={{ width: `${Math.min(form[w.key], 100)}%` }}
                />
              </div>
              <input
                type="range" min="0" max="100" step="5"
                value={form[w.key]}
                onChange={e => set(w.key, +e.target.value)}
                className="w-full accent-current"
              />
            </div>
          ))}
        </div>

        {/* Sum indicator */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
          ${weightOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}
        >
          {weightOk
            ? <CheckCircleIcon className="w-4 h-4" />
            : <ExclamationCircleIcon className="w-4 h-4" />
          }
          Total: {weightSum}/100
          {!weightOk && ` — adjust sliders so the total equals 100`}
          {weightOk && ' — weights look good!'}
        </div>
      </SectionCard>

      {/* ── Footer Actions ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <button
          onClick={() => navigate('/recruitment/jobs')}
          className="px-5 py-2.5 text-sm text-surface-600 hover:text-surface-900 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !weightOk}
          className="px-6 py-2.5 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving && (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Job Opening'}
        </button>
      </div>
    </div>
  );
}