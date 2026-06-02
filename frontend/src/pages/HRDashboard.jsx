/**
 * pages/HRDashboard.jsx
 * Professional HR Dashboard with stats, attendance ring, and action centers.
 */
import { useState, useEffect } from 'react';
import {
    UsersIcon,
    CurrencyDollarIcon,
    AcademicCapIcon,
    CheckCircleIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';

export default function HRDashboard() {
    const [stats, setStats] = useState({
        pendingLeaves: 0,
        monthlyPayrollCost: 0,
        activeTrainings: 0,
        attendancePct: 0,
    });
    const [pendingResignations, setPendingResignations] = useState([]);
    const [pendingPromotions, setPendingPromotions] = useState([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/dashboard/hr');
            if (res.success) {
                setStats(res.stats);
                setPendingResignations(res.pendingResignations || []);
                setPendingPromotions(res.pendingPromotions || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-surface-500">Loading HR Dashboard...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">HR Dashboard</h1>
                <p className="text-sm text-surface-500">Overview of human resources and payroll operations.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">Pending Leave Requests</p>
                        <p className="text-3xl font-bold text-surface-900 mt-2">{stats.pendingLeaves}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                </div>
                <div className="card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">Monthly Payroll Cost</p>
                        <p className="text-3xl font-bold text-surface-900 mt-2">${stats.monthlyPayrollCost.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CurrencyDollarIcon className="w-6 h-6" />
                    </div>
                </div>
                <div className="card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">Active Training Sessions</p>
                        <p className="text-3xl font-bold text-surface-900 mt-2">{stats.activeTrainings}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <AcademicCapIcon className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Attendance Summary (Progress Ring) */}
                <div className="card p-6 flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-surface-900 mb-6 self-start">Daily Attendance</h3>

                    <div className="relative w-40 h-40">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-surface-100"
                            />
                            <circle
                                cx="80"
                                cy="80"
                                r="70"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={440}
                                strokeDashoffset={440 - (440 * stats.attendancePct) / 100}
                                strokeLinecap="round"
                                className="text-brand-600 transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-surface-900">{stats.attendancePct}%</span>
                            <span className="text-xs text-surface-500">Clocked In</span>
                        </div>
                    </div>
                </div>

                {/* Action Center */}
                <div className="card p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-surface-900 mb-4">Action Center</h3>
                    <div className="space-y-4">
                        {pendingResignations.length === 0 && pendingPromotions.length === 0 && (
                            <p className="text-surface-500 text-sm">No pending actions requiring your attention.</p>
                        )}

                        {pendingResignations.map((resig) => (
                            <div key={`resig-${resig.id}`} className="p-4 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-surface-900">Pending Resignation - {resig.first_name} {resig.last_name}</p>
                                    <p className="text-sm text-surface-500">Requested on {new Date(resig.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <a href={`/resignations`} className="btn-secondary btn-sm">Review</a>
                                </div>
                            </div>
                        ))}

                        {pendingPromotions.map((prom) => (
                            <div key={`prom-${prom.id}`} className="p-4 rounded-xl border border-surface-200 bg-surface-50 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-surface-900">Pending Promotion - {prom.first_name} {prom.last_name}</p>
                                    <p className="text-sm text-surface-500">To {prom.new_designation}</p>
                                </div>
                                <div className="flex gap-2">
                                    <a href={`/promotions`} className="btn-secondary btn-sm">Review</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Financial Overview */}
            <div className="card p-6">
                <h3 className="text-lg font-bold text-surface-900 mb-4">Financial Overview</h3>
                <p className="text-sm text-surface-600 mb-6">
                    Next payout date is scheduled for <strong className="text-surface-900">October 31st, 2026</strong>.
                </p>
                <a href="/salary" className="btn-primary inline-flex">
                    Go to Payroll Module
                </a>
            </div>
        </div>
    );
}
