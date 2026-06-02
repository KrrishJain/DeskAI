/**
 * pages/Documents.jsx
 * Administration → Documents
 * Upload / manage company documents (policies, handbooks, etc.)
 * Admins/HR can upload; all users can download.
 *
 * Upload form defined OUTSIDE main component to prevent focus-loss bug.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    DocumentTextIcon, ArrowUpTrayIcon, TrashIcon,
    ArrowDownTrayIcon, MagnifyingGlassIcon, PencilIcon,
    FolderOpenIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const CATEGORIES = ['policy', 'handbook', 'contract', 'template', 'other'];
const CATEGORY_COLORS = {
    policy: 'bg-brand-100 text-brand-700',
    handbook: 'bg-violet-100 text-violet-700',
    contract: 'bg-amber-100 text-amber-700',
    template: 'bg-emerald-100 text-emerald-700',
    other: 'bg-surface-100 text-surface-600',
};

function formatBytes(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FileIcon({ mime }) {
    const color = mime?.includes('pdf') ? 'text-red-500' : mime?.includes('word') ? 'text-brand-600' : 'text-amber-500';
    return <DocumentTextIcon className={clsx('w-8 h-8', color)} />;
}

// ─── Upload Form — STANDALONE ────────────────────────────────────────────────
function UploadForm({ form, onChange, fileRef }) {
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    Title <span className="text-red-500">*</span>
                </label>
                <input name="title" value={form.title} onChange={onChange}
                    className="input w-full" placeholder="Employee Handbook 2025" />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Description</label>
                <textarea name="description" value={form.description} onChange={onChange} rows={2}
                    className="input w-full resize-none" placeholder="Brief description…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Category</label>
                    <select name="category" value={form.category} onChange={onChange} className="input w-full">
                        {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Visibility</label>
                    <select name="is_public" value={form.is_public} onChange={onChange} className="input w-full">
                        <option value={true}>All Employees</option>
                        <option value={false}>Admin Only</option>
                    </select>
                </div>
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    File <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-surface-200 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer"
                    onClick={() => fileRef.current?.click()}>
                    <ArrowUpTrayIcon className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-sm text-surface-500">Click to select or drag & drop</p>
                    <p className="text-xs text-surface-400 mt-1">PDF, Word, Excel, TXT — max 20 MB</p>
                    <input ref={fileRef} type="file" name="file" className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={onChange} />
                </div>
                {form._fileName && (
                    <p className="text-xs text-brand-600 font-medium mt-1">📎 {form._fileName}</p>
                )}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const EMPTY = { title: '', description: '', category: 'policy', is_public: true, _fileName: '', _file: null };

export default function Documents() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'hr';

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDel, setShowDel] = useState(false);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/documents');
            setDocs(res.data || []);
        } catch { toast.error('Failed to load documents.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleChange = e => {
        if (e.target.type === 'file') {
            const file = e.target.files[0];
            if (file) setForm(f => ({ ...f, _file: file, _fileName: file.name }));
        } else {
            setForm(f => ({ ...f, [e.target.name]: e.target.value }));
        }
    };

    const handleUpload = async () => {
        if (!form.title.trim()) return toast.error('Title is required.');
        if (!form._file) return toast.error('Please select a file.');
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('file', form._file);
            fd.append('title', form.title.trim());
            fd.append('description', form.description || '');
            fd.append('category', form.category);
            fd.append('is_public', form.is_public);
            await api.upload('/documents', fd);
            toast.success('Document uploaded!');
            setShowUpload(false);
            setForm(EMPTY);
            load();
        } catch (err) { toast.error(err.message || 'Upload failed.'); }
        finally { setSaving(false); }
    };

    const handleMetaEdit = async () => {
        setSaving(true);
        try {
            await api.put(`/documents/${selected.id}`, {
                title: form.title, description: form.description,
                category: form.category, is_public: form.is_public,
            });
            toast.success('Updated!');
            setShowEdit(false);
            load();
        } catch (err) { toast.error(err.message || 'Update failed.'); }
        finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await api.delete(`/documents/${selected.id}`);
            toast.success('Document deleted.');
            setShowDel(false);
            load();
        } catch (err) { toast.error(err.message || 'Delete failed.'); }
        finally { setSaving(false); }
    };

    const visible = docs.filter(d => {
        const q = search.toLowerCase();
        return (!q || d.title?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q))
            && (!catFilter || d.category === catFilter);
    });

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">Documents</h1>
                    <nav className="breadcrumb"><span>Dashboard</span><span>/</span><span className="text-surface-800 font-medium">Documents</span></nav>
                </div>
                {isAdmin && (
                    <button onClick={() => { setForm(EMPTY); setShowUpload(true); }}
                        className="btn-primary flex items-center gap-2">
                        <ArrowUpTrayIcon className="w-4 h-4" /> Upload Document
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-48 max-w-sm">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input type="text" placeholder="Search documents…"
                        value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
                </div>
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input w-auto">
                    <option value="">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-7 h-7 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                </div>
            ) : visible.length === 0 ? (
                <div className="card p-16 text-center">
                    <FolderOpenIcon className="w-12 h-12 text-surface-200 mx-auto mb-3" />
                    <p className="text-surface-500 font-medium">No documents found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {visible.map(doc => (
                        <div key={doc.id} className="card p-5 flex flex-col gap-3 hover:shadow-card-hover transition-shadow">
                            {/* Top */}
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-xl bg-surface-50 flex items-center justify-center shrink-0">
                                    <FileIcon mime={doc.mime_type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-surface-900 text-sm leading-tight truncate">{doc.title}</h4>
                                    <p className="text-xs text-surface-400 mt-0.5 truncate">{doc.file_name}</p>
                                </div>
                            </div>

                            {/* Description */}
                            {doc.description && (
                                <p className="text-xs text-surface-500 line-clamp-2 leading-relaxed">{doc.description}</p>
                            )}

                            {/* Tags */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold capitalize', CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other)}>
                                    {doc.category}
                                </span>
                                <span className="text-xs text-surface-400">{formatBytes(doc.file_size)}</span>
                                {!doc.is_public && (
                                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600 font-medium">Admin only</span>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-surface-50">
                                <div>
                                    <p className="text-xs text-surface-400">Uploaded by {doc.uploader_name || 'Admin'}</p>
                                    <p className="text-xs text-surface-400">{new Date(doc.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <a href={`${BASE_URL}${doc.file_path}`} target="_blank" rel="noopener noreferrer"
                                        className="btn-icon w-8 h-8 text-brand-600 hover:bg-brand-50 rounded-lg flex items-center justify-center"
                                        title="Download">
                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                    </a>
                                    {isAdmin && (
                                        <>
                                            <button onClick={() => { setSelected(doc); setForm({ ...EMPTY, ...doc }); setShowEdit(true); }}
                                                className="btn-icon w-8 h-8 text-surface-500 hover:bg-surface-100 rounded-lg">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => { setSelected(doc); setShowDel(true); }}
                                                className="btn-icon w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            <Modal title="Upload Document" open={showUpload} onClose={() => setShowUpload(false)} size="lg"
                footer={<><button className="btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handleUpload} disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</button></>}>
                <UploadForm form={form} onChange={handleChange} fileRef={fileRef} />
            </Modal>

            {/* Edit Metadata Modal */}
            <Modal title="Edit Document" open={showEdit} onClose={() => setShowEdit(false)} size="md"
                footer={<><button className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                    <button className="btn-primary" onClick={handleMetaEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></>}>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Title</label>
                        <input name="title" value={form.title || ''} onChange={handleChange} className="input w-full" />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Description</label>
                        <textarea name="description" value={form.description || ''} onChange={handleChange} rows={2} className="input w-full resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Category</label>
                            <select name="category" value={form.category || 'policy'} onChange={handleChange} className="input w-full">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">Visibility</label>
                            <select name="is_public" value={form.is_public} onChange={handleChange} className="input w-full">
                                <option value={true}>All Employees</option>
                                <option value={false}>Admin Only</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Modal */}
            <Modal title="Delete Document" open={showDel} onClose={() => setShowDel(false)}
                footer={<><button className="btn-secondary" onClick={() => setShowDel(false)}>Cancel</button>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                        onClick={handleDelete} disabled={saving}>{saving ? 'Deleting…' : 'Yes, Delete'}</button></>}>
                <p className="text-surface-600 text-sm">Permanently delete <strong className="text-surface-900">{selected?.title}</strong>?<br />
                    <span className="text-surface-400 text-xs">The file will be removed from storage.</span></p>
            </Modal>
        </div>
    );
}
