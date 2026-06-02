// pages/recruitment/ResumeUploadPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TagIcon,
  ArrowLeftIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

const EDUCATION_OPTIONS = ['Any', 'Diploma', 'Bachelor', 'Master', 'MBA', 'PhD'];

export default function ResumeUploadPage() {
  const [searchParams]              = useSearchParams();
  const navigate                    = useNavigate();
  const jobId                       = searchParams.get('jobId');
  const fileInputRef                = useRef();

  const [jobs, setJobs]             = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [job, setJob]               = useState(null);
  const [files, setFiles]           = useState([]);         // { file, status, error }
  const [uploading, setUploading]   = useState(false);
  const [dragOver, setDragOver]     = useState(false);

  // Skill manager
  const [skills, setSkills]         = useState([]);         // { skill_name, is_mandatory }
  const [skillInput, setSkillInput] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [skillSaving, setSkillSaving] = useState(false);

  useEffect(() => { fetchJobs(); }, []);
  useEffect(() => {
    if (selectedJobId) fetchJobDetails(selectedJobId);
    else { setJob(null); setSkills([]); }
  }, [selectedJobId]);

  async function fetchJobs() {
    const { data } = await axios.get('/api/jobs');
    setJobs(data.data.filter(j => j.status === 'open'));
  }

  async function fetchJobDetails(id) {
    const { data } = await axios.get(`/api/jobs/${id}`);
    setJob(data.data);
    setSkills(data.data.skills || []);
  }

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles([...e.dataTransfer.files]);
  }

  function handleFileInput(e) {
    addFiles([...e.target.files]);
    e.target.value = '';
  }

  function addFiles(incoming) {
    const existing   = files.length;
    const max        = job?.max_resumes || 10;
    const canAdd     = max - existing;
    const pdfs       = incoming.filter(f => f.type === 'application/pdf').slice(0, canAdd);
    const newEntries = pdfs.map(f => ({ file: f, status: 'pending', error: null }));
    setFiles(prev => [...prev, ...newEntries]);
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Upload ───────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!selectedJobId) return alert('Please select a job first.');
    if (files.length === 0) return alert('Add at least one resume.');

    setUploading(true);

    const formData = new FormData();
    files.forEach(({ file }) => formData.append('resumes', file));

    try {
      // Mark all as uploading
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' })));

      const { data } = await axios.post(`/api/jobs/${selectedJobId}/upload-resumes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Map results back
      setFiles(prev => prev.map((f, i) => {
        const result = data.data[i];
        return { ...f, status: result?.status === 'uploaded' ? 'uploaded' : 'failed', error: result?.error || null };
      }));

    } catch (err) {
      setFiles(prev => prev.map(f => ({ ...f, status: 'failed', error: err.response?.data?.message || 'Upload failed' })));
    } finally {
      setUploading(false);
    }
  }

  // ── Skills ───────────────────────────────────────────────────────────────────
  async function addSkill() {
    if (!skillInput.trim() || !selectedJobId) return;
    try {
      setSkillSaving(true);
      const { data } = await axios.post(`/api/jobs/${selectedJobId}/skills`, {
        skill_name: skillInput.trim(),
        is_mandatory: isMandatory,
      });
      setSkills(prev => [...prev, data.data]);
      setSkillInput('');
      setIsMandatory(false);
    } catch { /* ignore */ }
    finally { setSkillSaving(false); }
  }

  async function removeSkill(skillId) {
    await axios.delete(`/api/job-skills/${skillId}`);
    setSkills(prev => prev.filter(s => s.id !== skillId));
  }

  const uploadedCount = files.filter(f => f.status === 'uploaded').length;
  const allDone       = files.length > 0 && files.every(f => f.status === 'uploaded' || f.status === 'failed');

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/recruitment/jobs')}
          className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Upload Resumes</h1>
          <p className="text-sm text-surface-500 mt-0.5">Resumes are processed asynchronously — UI stays responsive</p>
        </div>
      </div>

      {/* Job Selector */}
      <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-3">
        <label className="block text-sm font-medium text-surface-700">Select Job Opening *</label>
        <select
          value={selectedJobId}
          onChange={e => setSelectedJobId(e.target.value)}
          className="input-field max-w-sm"
        >
          <option value="">— Choose a job —</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>{j.title} {j.department ? `(${j.department})` : ''}</option>
          ))}
        </select>

        {job && (
          <div className="flex gap-4 text-xs text-surface-500 pt-1">
            <span>Experience: {job.experience_required_min ?? 0}–{job.experience_required_max ?? '∞'} yrs</span>
            <span>Education: {job.education_required || 'Any'}</span>
            <span>Max Resumes: {job.max_resumes}</span>
            <span>Uploaded: {job.candidate_count ?? 0}</span>
          </div>
        )}
      </div>

      {/* Skills Manager */}
      {selectedJobId && (
        <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TagIcon className="w-4 h-4 text-surface-400" />
            <h2 className="text-sm font-medium text-surface-700">Required Skills</h2>
            <span className="text-xs text-surface-400">(used for ATS scoring)</span>
          </div>

          {/* Existing skills */}
          <div className="flex flex-wrap gap-2">
            {skills.length === 0 && (
              <span className="text-xs text-surface-400">No skills added yet.</span>
            )}
            {skills.map(s => (
              <span
                key={s.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                  ${s.is_mandatory
                    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                    : 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                  }`}
              >
                {s.skill_name}
                {s.is_mandatory && <span className="text-red-400">*</span>}
                <button
                  onClick={() => removeSkill(s.id)}
                  className="ml-0.5 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add skill */}
          <div className="flex items-center gap-2">
            <input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSkill()}
              placeholder="e.g. React, Node.js..."
              className="input-field flex-1 max-w-xs text-sm"
            />
            <label className="flex items-center gap-1.5 text-xs text-surface-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMandatory}
                onChange={e => setIsMandatory(e.target.checked)}
                className="rounded"
              />
              Mandatory
            </label>
            <button
              onClick={addSkill}
              disabled={!skillInput.trim() || skillSaving}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
          <p className="text-xs text-surface-400">* = mandatory (missing mandatory skills caps ATS score at 60)</p>
        </div>
      )}

      {/* Drop Zone */}
      {selectedJobId && (
        <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
          <h2 className="text-sm font-medium text-surface-700">
            Resume Files <span className="text-surface-400 font-normal">(PDF only, max {job?.max_resumes || 10})</span>
          </h2>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragOver ? 'border-brand-400 bg-brand-50' : 'border-surface-200 hover:border-brand-300 hover:bg-surface-50'}`}
          >
            <CloudArrowUpIcon className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-brand-500' : 'text-surface-300'}`} />
            <p className="text-sm font-medium text-surface-600">Drop PDF resumes here</p>
            <p className="text-xs text-surface-400 mt-1">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-50 border border-surface-100"
                >
                  <DocumentIcon className="w-4 h-4 text-surface-400 shrink-0" />
                  <span className="flex-1 text-sm text-surface-700 truncate">{entry.file.name}</span>
                  <span className="text-xs text-surface-400">{(entry.file.size / 1024).toFixed(0)} KB</span>

                  {/* Status badge */}
                  {entry.status === 'pending' && (
                    <span className="text-xs text-surface-400">Pending</span>
                  )}
                  {entry.status === 'uploading' && (
                    <span className="text-xs text-amber-600 animate-pulse">Uploading...</span>
                  )}
                  {entry.status === 'uploaded' && (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                  )}
                  {entry.status === 'failed' && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <ExclamationCircleIcon className="w-4 h-4" />
                      {entry.error || 'Failed'}
                    </span>
                  )}

                  {entry.status === 'pending' && (
                    <button onClick={() => removeFile(idx)} className="text-surface-300 hover:text-red-400 transition-colors">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress summary */}
          {files.length > 0 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-surface-500">
                {uploadedCount}/{files.length} processed
              </span>
              <div className="flex gap-2">
                {allDone && uploadedCount > 0 && (
                  <button
                    onClick={() => navigate(`/recruitment/candidates?jobId=${selectedJobId}`)}
                    className="px-4 py-2 text-sm font-medium text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
                  >
                    View Candidates →
                  </button>
                )}
                <button
                  onClick={handleUpload}
                  disabled={uploading || files.every(f => f.status !== 'pending')}
                  className="px-4 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} Resume(s)`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}