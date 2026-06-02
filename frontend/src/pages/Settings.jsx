/**
 * pages/Settings.jsx
 * Company settings page with 4 tabs: General | Theme | Invoice | Salary
 *
 * CRITICAL: Every sub-form is a standalone named function defined OUTSIDE
 * the Settings component to prevent the "one-character focus loss" bug.
 */

import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
    BuildingOfficeIcon,
    SwatchIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    PhotoIcon,
} from '@heroicons/react/24/outline';

// ─── Reusable field components (DEFINED OUTSIDE to prevent focus loss) ────────
function FieldRow({ label, children }) {
    return (
        <div className="space-y-1">
            <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

function TextInput({ name, value, onChange, type = 'text', placeholder }) {
    return (
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
        />
    );
}

function SaveBtn({ saving }) {
    return (
        <button type="submit" disabled={saving}
            className="px-6 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold
                 hover:bg-brand-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
        </button>
    );
}

// ─── Standalone Form: General Settings ───────────────────────────────────────
function GeneralForm({ company, onSaved }) {
    const [form, setForm] = useState({
        name: company?.name || '',
        currency_symbol: company?.currency_symbol || '$',
        contact_person: company?.contact_person || '',
        address: company?.address || '',
        email: company?.email || '',
        phone: company?.phone || '',
        mobile: company?.mobile || '',
        fax: company?.fax || '',
        website: company?.website || '',
    });
    const [saving, setSaving] = useState(false);

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = await api.put('/settings', form);
            if (data.success) {
                toast.success('General settings saved!');
                onSaved(form, {});
            } else {
                toast.error(data.message || 'Save failed.');
            }
        } catch (err) {
            toast.error(err.message || 'Network error.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Company Name *">
                    <TextInput name="name" value={form.name} onChange={handle} />
                </FieldRow>
                <FieldRow label="Currency Symbol">
                    <TextInput name="currency_symbol" value={form.currency_symbol} onChange={handle} placeholder="$" />
                </FieldRow>
                <FieldRow label="Contact Person">
                    <TextInput name="contact_person" value={form.contact_person} onChange={handle} />
                </FieldRow>
                <FieldRow label="Email">
                    <TextInput name="email" value={form.email} onChange={handle} type="email" />
                </FieldRow>
                <FieldRow label="Phone">
                    <TextInput name="phone" value={form.phone} onChange={handle} />
                </FieldRow>
                <FieldRow label="Mobile">
                    <TextInput name="mobile" value={form.mobile} onChange={handle} />
                </FieldRow>
                <FieldRow label="Fax">
                    <TextInput name="fax" value={form.fax} onChange={handle} />
                </FieldRow>
                <FieldRow label="Website">
                    <TextInput name="website" value={form.website} onChange={handle} placeholder="https://" />
                </FieldRow>
            </div>
            <FieldRow label="Address">
                <textarea name="address" value={form.address} onChange={handle} rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
            </FieldRow>
            <div className="flex justify-end"><SaveBtn saving={saving} /></div>
        </form>
    );
}

// ─── Standalone Form: Logo Upload ─────────────────────────────────────────────
function LogoUploadForm({ currentLogo, onLogoSaved }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
            formData.append('logo', file);
            const data = await api.upload('/settings/logo', formData);
            if (data.success) {
                toast.success('Company logo updated!');
                onLogoSaved(data.logo_url);
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

    const logoSrc = preview || (currentLogo ? `${BASE_URL}${currentLogo}` : null);

    return (
        <div className="flex items-center gap-6 p-4 rounded-xl border border-surface-200 bg-surface-50">
            <div className="w-16 h-16 rounded-xl border-2 border-surface-200 bg-white flex items-center justify-center overflow-hidden">
                {logoSrc
                    ? <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
                    : <PhotoIcon className="w-8 h-8 text-surface-300" />
                }
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium text-surface-700">Company Logo</p>
                <p className="text-xs text-surface-400">PNG, SVG, JPG · Max 2MB</p>
                <div className="flex gap-2">
                    <label className="px-3 py-1.5 rounded-lg border border-surface-200 text-xs font-medium cursor-pointer hover:bg-surface-100 transition-colors">
                        Choose File
                        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </label>
                    {file && (
                        <button onClick={upload} disabled={uploading}
                            className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors">
                            {uploading ? 'Uploading…' : 'Upload'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Standalone Form: Theme Settings ─────────────────────────────────────────
function ThemeForm({ settings, onSaved }) {
    const [form, setForm] = useState({
        theme_sidebar_color: settings.theme_sidebar_color || '#1e293b',
        theme_accent_color: settings.theme_accent_color || '#6366f1',
    });
    const [saving, setSaving] = useState(false);

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = await api.put('/settings', form);
            if (data.success) {
                toast.success('Theme preferences saved!');
                onSaved({}, form);
            } else {
                toast.error(data.message || 'Save failed.');
            }
        } catch (err) {
            toast.error(err.message || 'Network error.');
        } finally {
            setSaving(false);
        }
    };

    const ColorField = ({ label, name }) => (
        <FieldRow label={label}>
            <div className="flex items-center gap-3">
                <input type="color" name={name} value={form[name]} onChange={handle}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent" />
                <TextInput name={name} value={form[name]} onChange={handle} placeholder="#000000" />
            </div>
        </FieldRow>
    );

    return (
        <form onSubmit={submit} className="space-y-6 max-w-md">
            <div className="p-4 rounded-xl border border-surface-200 bg-surface-50 space-y-1">
                <p className="text-xs text-surface-400">
                    Theme colours are stored per-company. Apply CSS variables on the frontend if you want live colour changes.
                </p>
            </div>
            <div className="grid grid-cols-1 gap-4">
                <ColorField label="Sidebar Background Colour" name="theme_sidebar_color" />
                <ColorField label="Accent / Brand Colour" name="theme_accent_color" />
            </div>
            {/* Preview strip */}
            <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg" style={{ background: form.theme_sidebar_color }} />
                <div className="w-8 h-8 rounded-lg" style={{ background: form.theme_accent_color }} />
                <span className="text-xs text-surface-400">Colour preview</span>
            </div>
            <div className="flex justify-end"><SaveBtn saving={saving} /></div>
        </form>
    );
}

// ─── Standalone Form: Invoice Settings ────────────────────────────────────────
function InvoiceForm({ settings, onSaved }) {
    const [form, setForm] = useState({
        invoice_prefix: settings.invoice_prefix || '#INV-',
        invoice_tax_percent: settings.invoice_tax_percent || '0',
        invoice_footer_notes: settings.invoice_footer_notes || '',
    });
    const [saving, setSaving] = useState(false);

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = await api.put('/settings', form);
            if (data.success) {
                toast.success('Invoice settings saved!');
                onSaved({}, form);
            } else {
                toast.error(data.message || 'Save failed.');
            }
        } catch (err) {
            toast.error(err.message || 'Network error.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Invoice Number Prefix">
                    <TextInput name="invoice_prefix" value={form.invoice_prefix} onChange={handle} placeholder="#INV-" />
                </FieldRow>
                <FieldRow label="Default Tax (%)">
                    <TextInput name="invoice_tax_percent" value={form.invoice_tax_percent} onChange={handle} type="number" placeholder="0" />
                </FieldRow>
            </div>
            <FieldRow label="Invoice Footer Notes">
                <textarea name="invoice_footer_notes" value={form.invoice_footer_notes} onChange={handle} rows={3}
                    placeholder="e.g. Thank you for your business!"
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
            </FieldRow>
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-100 text-xs text-brand-700">
                Preview: <strong>{form.invoice_prefix}0001</strong>
            </div>
            <div className="flex justify-end"><SaveBtn saving={saving} /></div>
        </form>
    );
}

// ─── Standalone Form: Salary Settings ────────────────────────────────────────
function SalaryForm({ settings, onSaved }) {
    const [form, setForm] = useState({
        salary_tax_percent: settings.salary_tax_percent || '0',
        salary_pf_rate: settings.salary_pf_rate || '12',
        salary_payslip_prefix: settings.salary_payslip_prefix || '#PS-',
    });
    const [saving, setSaving] = useState(false);

    const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = await api.put('/settings', form);
            if (data.success) {
                toast.success('Salary settings saved!');
                onSaved({}, form);
            } else {
                toast.error(data.message || 'Save failed.');
            }
        } catch (err) {
            toast.error(err.message || 'Network error.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4 max-w-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FieldRow label="Default Tax (%)">
                    <TextInput name="salary_tax_percent" value={form.salary_tax_percent} onChange={handle} type="number" placeholder="0" />
                </FieldRow>
                <FieldRow label="PF Contribution Rate (%)">
                    <TextInput name="salary_pf_rate" value={form.salary_pf_rate} onChange={handle} type="number" placeholder="12" />
                </FieldRow>
                <FieldRow label="Payslip Number Prefix">
                    <TextInput name="salary_payslip_prefix" value={form.salary_payslip_prefix} onChange={handle} placeholder="#PS-" />
                </FieldRow>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 space-y-1">
                <p>Salary deduction: <strong>{form.salary_tax_percent}%</strong> income tax + <strong>{form.salary_pf_rate}%</strong> PF from gross.</p>
                <p>Payslip preview: <strong>{form.salary_payslip_prefix}0001</strong></p>
            </div>
            <div className="flex justify-end"><SaveBtn saving={saving} /></div>
        </form>
    );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
const TABS = [
    { id: 'general', label: 'General', icon: BuildingOfficeIcon },
    { id: 'theme', label: 'Theme', icon: SwatchIcon },
    { id: 'invoice', label: 'Invoice', icon: DocumentTextIcon },
    { id: 'salary', label: 'Salary', icon: CurrencyDollarIcon },
];

export default function Settings() {
    const { company, settings, loading, refreshSettings, applyLocalUpdate } = useSettings();
    const [activeTab, setActiveTab] = useState('general');

    const handleSaved = (companyFields, kvFields) => {
        applyLocalUpdate(companyFields, kvFields);
        refreshSettings();
    };

    const handleLogoSaved = (logo_url) => {
        applyLocalUpdate({ logo_url }, {});
        refreshSettings();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-display font-bold text-surface-900">Company Settings</h1>
                <p className="text-sm text-surface-400 mt-1">Configure company-wide preferences. Admin access required to save.</p>
            </div>

            <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
                {/* Tab bar */}
                <div className="border-b border-surface-200 px-6">
                    <div className="flex gap-6 -mb-px overflow-x-auto">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === t.id
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
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <LogoUploadForm currentLogo={company?.logo_url} onLogoSaved={handleLogoSaved} />
                            <hr className="border-surface-100" />
                            <GeneralForm company={company} onSaved={handleSaved} />
                        </div>
                    )}
                    {activeTab === 'theme' && (
                        <ThemeForm settings={settings} onSaved={handleSaved} />
                    )}
                    {activeTab === 'invoice' && (
                        <InvoiceForm settings={settings} onSaved={handleSaved} />
                    )}
                    {activeTab === 'salary' && (
                        <SalaryForm settings={settings} onSaved={handleSaved} />
                    )}
                </div>
            </div>
        </div>
    );
}
