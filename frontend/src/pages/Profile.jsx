/**
 * pages/Profile.jsx
 * User profile page — mirrors legacy profile.php UI.
 *
 * CRITICAL: All form sub-components are defined as standalone named functions
 * OUTSIDE the main Profile component to prevent the "one-character focus loss" bug.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
    UserCircleIcon,
    PencilSquareIcon,
    CameraIcon,
    LockClosedIcon,
    BriefcaseIcon,
    BuildingLibraryIcon,
} from '@heroicons/react/24/outline';

// ─── Standalone Form: Personal Information ────────────────────────────────────
function PersonalInfoForm({ profile, onSaved }) {
    const [form, setForm] = useState({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.split('T')[0] : '',
        gender: profile.gender || '',
        nationality: profile.nationality || '',
        marital_status: profile.marital_status || '',
    });
    const [saving, setSaving] = useState(false);

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = await api.put('/user/profile', form);
            if (data.success) {
                toast.success('Profile updated!');
                onSaved(data.user);
            } else {
                toast.error(data.message || 'Update failed.');
            }
        } catch (err) {
            toast.error(err.message || 'Network error.');
        } finally {
            setSaving(false);
        }
    };

    const Field = ({ label, name, type = 'text', children }) => (
        <div className="space-y-1">
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
            {children || (
                <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handle}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400
                     transition-all"
                />
            )}
        </div>
    );

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" name="first_name" />
                <Field label="Last Name" name="last_name" />
                <Field label="Email" name="email" type="email" />
                <Field label="Phone" name="phone" />
                <Field label="Date of Birth" name="date_of_birth" type="date" />
                <Field label="Gender" name="gender">
                    <select name="gender" value={form.gender} onChange={handle}
                        className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400">
                        <option value="">Select Gender</option>
                        <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                </Field>
                <Field label="Nationality" name="nationality" />
                <Field label="Marital Status" name="marital_status">
                    <select name="marital_status" value={form.marital_status} onChange={handle}
                        className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                       focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400">
                        <option value="">Select Status</option>
                        <option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option>
                    </select>
                </Field>
            </div>
            <Field label="Address" name="address">
                <textarea name="address" value={form.address} onChange={handle} rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
            </Field>
            <div className="flex justify-end">
                <button type="submit" disabled={saving}
                    className="px-6 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold
                     hover:bg-brand-700 disabled:opacity-60 transition-colors">
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </form>
    );
}

// ─── Standalone Form: Change Password ────────────────────────────────────────
function ChangePasswordForm({ onPasswordChanged }) {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [saving, setSaving] = useState(false);

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (form.newPassword !== form.confirmPassword) {
            toast.error('New passwords do not match.');
            return;
        }
        if (form.newPassword.length < 8) {
            toast.error('New password must be at least 8 characters.');
            return;
        }
        setSaving(true);
        try {
            const data = await api.put('/auth/change-password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            if (data.success) {
                toast.success('Password changed! Please log in again.');
                setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                onPasswordChanged?.();
            } else {
                toast.error(data.message || 'Failed to change password.');
            }
        } catch (err) {
            toast.error(err.message || 'Network error.');
        } finally {
            setSaving(false);
        }
    };

    const PwField = ({ label, name }) => (
        <div className="space-y-1">
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
            <input type="password" name={name} value={form[name]} onChange={handle} autoComplete="off"
                className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
        </div>
    );

    return (
        <form onSubmit={submit} className="space-y-4 max-w-md">
            <PwField label="Current Password" name="currentPassword" />
            <PwField label="New Password (min 8 chars)" name="newPassword" />
            <PwField label="Confirm New Password" name="confirmPassword" />
            <div className="flex justify-start">
                <button type="submit" disabled={saving}
                    className="px-6 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold
                     hover:bg-red-700 disabled:opacity-60 transition-colors">
                    {saving ? 'Updating…' : 'Change Password'}
                </button>
            </div>
        </form>
    );
}

// ─── Standalone Form: Avatar Upload ──────────────────────────────────────────
function AvatarUploadForm({ currentPicture, onUploaded }) {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef();

    const handleFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    };

    const upload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const data = await api.upload('/user/avatar', formData);
            if (data.success) {
                toast.success('Avatar updated!');
                onUploaded(data.picture);
                setPreview(null);
                setFile(null);
            } else {
                toast.error(data.message || 'Upload failed.');
            }
        } catch (err) {
            toast.error(err.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const imgSrc = preview
        || (currentPicture ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${currentPicture}` : null);

    return (
        <div className="flex items-center gap-6">
            <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-brand-100 flex items-center justify-center overflow-hidden border-2 border-brand-200">
                    {imgSrc
                        ? <img src={imgSrc} alt="Avatar" className="w-full h-full object-cover" />
                        : <UserCircleIcon className="w-14 h-14 text-brand-400" />
                    }
                </div>
                <button type="button" onClick={() => inputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-brand-600 text-white
                     flex items-center justify-center shadow-md hover:bg-brand-700 transition-colors">
                    <CameraIcon className="w-4 h-4" />
                </button>
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium text-surface-700">Profile Photo</p>
                <p className="text-xs text-surface-400">JPG, PNG, WebP · Max 2MB</p>
                {file && (
                    <button onClick={upload} disabled={uploading}
                        className="px-4 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold
                       hover:bg-brand-700 disabled:opacity-60 transition-colors">
                        {uploading ? 'Uploading…' : 'Upload Photo'}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Main Profile Page Component ──────────────────────────────────────────────
const TABS = [
    { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    { id: 'security', label: 'Security', icon: LockClosedIcon },
    { id: 'bank', label: 'Bank & Statutory', icon: BuildingLibraryIcon },
];

export default function Profile() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');

    useEffect(() => {
        (async () => {
            try {
                const data = await api.get('/user/profile');
                if (data.success) setProfile(data.user);
            } catch {
                toast.error('Failed to load profile.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleProfileSaved = (updatedUser) => {
        setProfile((prev) => ({ ...prev, ...updatedUser }));
    };

    const handleAvatarUploaded = (picturePath) => {
        setProfile((prev) => ({ ...prev, picture: picturePath }));
    };

    const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const avatarSrc = profile?.picture ? `${BASE_URL}${profile.picture}` : null;
    const initials = `${profile?.first_name?.[0] || ''}${profile?.last_name?.[0] || ''}`.toUpperCase() || '?';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-display font-bold text-surface-900">My Profile</h1>
                <p className="text-sm text-surface-400 mt-1">Manage your personal information and account security</p>
            </div>

            {/* Hero Card */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Avatar */}
                    <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center overflow-hidden border-2 border-brand-200 shrink-0">
                        {avatarSrc
                            ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                            : <span className="text-brand-700 font-display font-bold text-2xl">{initials}</span>
                        }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-display font-bold text-surface-900">
                            {profile?.first_name} {profile?.last_name}
                        </h2>
                        <p className="text-sm text-surface-500 capitalize mt-0.5">{profile?.role}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm text-surface-600">
                            {profile?.email && <span>✉ {profile.email}</span>}
                            {profile?.phone && <span>📞 {profile.phone}</span>}
                            {profile?.company_name && <span>🏢 {profile.company_name}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
                {/* Tab bar */}
                <div className="border-b border-surface-200 px-6">
                    <div className="flex gap-6 -mb-px">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id
                                        ? 'border-brand-600 text-brand-600'
                                        : 'border-transparent text-surface-400 hover:text-surface-700'
                                    }`}
                            >
                                <t.icon className="w-4 h-4" />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div className="p-6">
                    {activeTab === 'profile' && profile && (
                        <div className="space-y-8">
                            {/* Avatar upload */}
                            <div>
                                <h3 className="text-base font-semibold text-surface-800 mb-4 flex items-center gap-2">
                                    <CameraIcon className="w-5 h-5 text-brand-500" /> Profile Photo
                                </h3>
                                <AvatarUploadForm
                                    currentPicture={profile.picture}
                                    onUploaded={handleAvatarUploaded}
                                />
                            </div>

                            <hr className="border-surface-100" />

                            {/* Personal Info */}
                            <div>
                                <h3 className="text-base font-semibold text-surface-800 mb-4 flex items-center gap-2">
                                    <PencilSquareIcon className="w-5 h-5 text-brand-500" /> Personal Information
                                </h3>
                                <PersonalInfoForm profile={profile} onSaved={handleProfileSaved} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h3 className="text-base font-semibold text-surface-800 mb-4 flex items-center gap-2">
                                <LockClosedIcon className="w-5 h-5 text-red-500" /> Change Password
                            </h3>
                            <p className="text-sm text-surface-400 mb-6">
                                After changing your password you will be redirected to login.
                            </p>
                            <ChangePasswordForm onPasswordChanged={logout} />
                        </div>
                    )}

                    {activeTab === 'bank' && (
                        <div className="text-center py-12 text-surface-400">
                            <BuildingLibraryIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">Bank & Statutory information is managed by HR.</p>
                            <p className="text-xs mt-1">Contact your HR admin to update banking details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
