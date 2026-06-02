import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import clsx from 'clsx';
import {
    BriefcaseIcon, EnvelopeIcon, PhoneIcon,
    CalendarIcon, BuildingOfficeIcon, UserIcon,
    DocumentTextIcon, BuildingLibraryIcon,
    CheckCircleIcon, ClockIcon, XCircleIcon,
    PencilSquareIcon, BellIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EditEmployeeModal from '../components/modals/EditEmployeeModal';
import toast from 'react-hot-toast';

function AvatarPlaceholder({ name, className }) {
    const initials = name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'EMP';
    const colors = ['bg-brand-100 text-brand-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700'];
    const color = colors[initials.charCodeAt(0) % colors.length] || colors[0];
    return (
        <div className={clsx('rounded-full flex items-center justify-center font-bold text-2xl', color, className)}>
            {initials}
        </div>
    );
}

export default function EmployeeProfileView() {
    const { id } = useParams();
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('personal');
    const [showEdit, setShowEdit] = useState(false);
    const { user, isHR, isAdmin } = useAuth();

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const res = await api.get(`/employees/${id}`);
                setEmployee(res.data);
            } catch (err) {
                toast.error('Failed to load employee details');
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchEmployee();
    }, [id]);

    const handleEditSuccess = async () => {
        try {
            // Refetch employee after edit
            const response = await api.get(`/employees/${id}`);
            setEmployee(response.data);
            toast.success('Employee updated successfully!');
        } catch (err) {
            toast.error('Failed to refetch employee details after update.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!employee) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-surface-700">Employee not found</h2>
                <Link to="/employees" className="text-brand-600 hover:underline mt-2 inline-block">Back to directory</Link>
            </div>
        );
    }

    // Dynamic Status Logic
    const joinDateObj = new Date(employee.joining_date);
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    let status = 'Terminated';
    let statusColor = 'bg-red-50 text-red-700 border-red-200';
    let StatusIcon = XCircleIcon;

    if (employee.is_active) {
        if (joinDateObj > threeMonthsAgo) {
            status = 'On Probation';
            statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
            StatusIcon = ClockIcon;
        } else {
            status = 'Active';
            statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            StatusIcon = CheckCircleIcon;
        }
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
            {/* Header / Breadcrumb */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-surface-900">Profile Overview</h1>
                    <nav className="flex text-sm text-surface-500 mt-1 space-x-2">
                        <Link to="/employees" className="hover:text-brand-600 transition-colors">Employees</Link>
                        <span>/</span>
                        <span className="text-surface-900">{employee.first_name} {employee.last_name}</span>
                    </nav>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-icon bg-white text-surface-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl shadow-sm border border-surface-200">
                        <BellIcon className="w-5 h-5" />
                    </button>
                    {(isHR || isAdmin) && (
                        <button onClick={() => setShowEdit(true)} className="btn-secondary btn-sm gap-2">
                            <PencilSquareIcon className="w-4 h-4" /> Edit Profile
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                </div>
            </div>

            {/* Profile Card */}
            <div className="card p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-brand-600 to-violet-600 z-0 opacity-10"></div>

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    {/* Avatar */}
                    <div className="shrink-0 relative">
                        {employee.picture ? (
                            <img
                                src={`/uploads/${employee.picture}`}
                                alt={employee.first_name}
                                className="w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-white"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        ) : (
                            <AvatarPlaceholder
                                name={`${employee.first_name} ${employee.last_name}`}
                                className="w-32 h-32 shadow-lg border-4 border-white"
                            />
                        )}
                    </div>

                    {/* Primary Info */}
                    <div className="flex-1 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <h2 className="text-3xl font-bold text-surface-900 font-display">
                                {employee.first_name} {employee.last_name}
                            </h2>
                            <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold rounded-full border", statusColor)}>
                                <StatusIcon className="w-4 h-4" />
                                {status}
                            </span>
                        </div>
                        <p className="text-lg text-brand-600 font-medium">{employee.designation || 'No Designation'}</p>
                        <div className="flex flex-wrap gap-4 text-surface-600 text-sm mt-2">
                            <div className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-100">
                                <BriefcaseIcon className="w-4 h-4 text-surface-400" />
                                <span className="font-mono text-xs">{employee.employee_id}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-100">
                                <BuildingOfficeIcon className="w-4 h-4 text-surface-400" />
                                {employee.department || 'No Department'}
                            </div>
                            <div className="flex items-center gap-1.5 bg-surface-50 px-3 py-1.5 rounded-lg border border-surface-100">
                                <CalendarIcon className="w-4 h-4 text-surface-400" />
                                Joined on {new Date(employee.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Tabs & Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-1 flex overflow-x-auto hide-scrollbar">
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={clsx("flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all", activeTab === 'personal' ? 'bg-surface-100 text-brand-700 shadow-sm' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-800')}
                        >
                            <UserIcon className="w-5 h-5" /> Personal Info
                        </button>
                        <button
                            onClick={() => setActiveTab('bank')}
                            className={clsx("flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all", activeTab === 'bank' ? 'bg-surface-100 text-brand-700 shadow-sm' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-800')}
                        >
                            <BuildingLibraryIcon className="w-5 h-5" /> Bank Details
                        </button>
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={clsx("flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all", activeTab === 'documents' ? 'bg-surface-100 text-brand-700 shadow-sm' : 'text-surface-500 hover:bg-surface-50 hover:text-surface-800')}
                        >
                            <DocumentTextIcon className="w-5 h-5" /> Documents
                        </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="card p-6 min-h-[300px]">
                        {activeTab === 'personal' && (
                            <div className="space-y-6 animate-fade-in">
                                <h3 className="text-lg font-bold text-surface-900 border-b pb-2">Contact Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block">Email Address</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <EnvelopeIcon className="w-5 h-5 text-brand-500" />
                                            <a href={`mailto:${employee.email}`} className="text-surface-900 font-medium hover:text-brand-600 transition-colors">
                                                {employee.email || '—'}
                                            </a>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block">Phone Number</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <PhoneIcon className="w-5 h-5 text-emerald-500" />
                                            <a href={`tel:${employee.phone}`} className="text-surface-900 font-medium hover:text-emerald-600 transition-colors">
                                                {employee.phone || '—'}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'bank' && (
                            <div className="space-y-6 animate-fade-in">
                                {employee.bank_name ? (
                                    <>
                                        <h3 className="text-lg font-bold text-surface-900 border-b pb-2">Financial Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-50 p-6 rounded-xl border border-surface-100">
                                            <div>
                                                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block">Bank Name</label>
                                                <div className="text-surface-900 font-medium mt-1">{employee.bank_name}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block">Account Number</label>
                                                <div className="text-surface-900 font-medium mt-1 font-mono">{employee.account_number || '—'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block">IFSC / Routing Code</label>
                                                <div className="text-surface-900 font-medium mt-1 font-mono">{employee.ifsc_code || '—'}</div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block">Branch Name</label>
                                                <div className="text-surface-900 font-medium mt-1">{employee.branch_name || '—'}</div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <BuildingLibraryIcon className="w-8 h-8 text-surface-400" />
                                        </div>
                                        <h3 className="text-lg font-bold text-surface-900">Bank Details Pending</h3>
                                        <p className="text-surface-500 max-w-sm mx-auto">
                                            Bank details have not been submitted for this employee yet. These are required for payroll processing.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="space-y-6 animate-fade-in text-center py-8">
                                <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <DocumentTextIcon className="w-8 h-8 text-surface-400" />
                                </div>
                                <h3 className="text-lg font-bold text-surface-900">No Documents Uploaded</h3>
                                <p className="text-surface-500 max-w-sm mx-auto">
                                    There are no official documents, contracts, or IDs attached to this profile.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Professional Timeline & Audit */}
                <div className="space-y-6">
                    {/* Timeline */}
                    <div className="card p-6">
                        <h3 className="text-lg font-bold text-surface-900 mb-4">Professional Timeline</h3>
                        <div className="relative border-l-2 border-surface-200 ml-3 space-y-6 pb-2">
                            {/* Account Created */}
                            <div className="relative pl-6">
                                <div className="absolute w-3 h-3 bg-brand-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                                <p className="text-xs font-bold text-brand-600 mb-0.5">
                                    {new Date(employee.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-sm font-semibold text-surface-900">Profile Created</p>
                                <p className="text-xs text-surface-500 mt-1">System account provisioned</p>
                            </div>

                            {/* Joining Date */}
                            <div className="relative pl-6">
                                <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                                <p className="text-xs font-bold text-emerald-600 mb-0.5">
                                    {new Date(employee.joining_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-sm font-semibold text-surface-900">Official Joining</p>
                                <p className="text-xs text-surface-500 mt-1">Started as {employee.designation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Audit Snapshot Footer */}
                    <div className="text-xs text-center text-surface-400 bg-surface-50 rounded-xl p-3 border border-surface-200 border-dashed">
                        Last updated on {new Date(employee.updated_at || employee.created_at).toLocaleString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                    </div>
                </div>
            </div>

            <EditEmployeeModal
                open={showEdit}
                employeeId={employee.id}
                onClose={() => setShowEdit(false)}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
}
