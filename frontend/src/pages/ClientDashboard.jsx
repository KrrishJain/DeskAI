/**
 * pages/ClientDashboard.jsx
 * Professional Client Dashboard with project milestones and invoice center.
 */
import { useState, useEffect } from 'react';
import {
    FolderIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    ChatBubbleLeftRightIcon,
    ArrowDownTrayIcon,
    CreditCardIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';

export default function ClientDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        activeProjects: 0,
        outstandingInvoices: 0,
        lastPayment: 0,
        projects: [],
        invoices: [],
        updates: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/dashboard/client');
            if (res.success && res.data) {
                setData(res.data);
            }
        } catch (err) {
            console.error('Failed to load client dashboard', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-surface-500">Loading Client Dashboard...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-surface-900">Client Portal</h1>
                <p className="text-sm text-surface-500">Welcome back. Here is the latest on your projects.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">My Active Projects</p>
                        <p className="text-3xl font-bold text-surface-900 mt-2">{data.activeProjects}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <FolderIcon className="w-6 h-6" />
                    </div>
                </div>
                <div className="card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">Outstanding Invoices</p>
                        <p className="text-3xl font-bold text-surface-900 mt-2">${data.outstandingInvoices.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                </div>
                <div className="card p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-surface-500">Last Payment Received</p>
                        <p className="text-3xl font-bold text-surface-900 mt-2">${data.lastPayment.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CurrencyDollarIcon className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project Milestones */}
                <div className="card p-6 lg:col-span-2">
                    <h3 className="text-lg font-bold text-surface-900 mb-4">Project Milestones</h3>
                    <div className="space-y-6">
                        {data.projects.map((proj) => (
                            <div key={proj.id} className="relative">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <h4 className="font-semibold text-surface-900">{proj.name}</h4>
                                        <p className="text-xs text-surface-500">Due {new Date(proj.dueDate).toLocaleDateString()}</p>
                                    </div>
                                    <span className="text-sm font-medium text-brand-600">{proj.progress}%</span>
                                </div>
                                <div className="w-full bg-surface-100 h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-brand-500 h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${proj.progress}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Support Feed */}
                <div className="card p-6">
                    <h3 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="w-5 h-5 text-brand-500" />
                        Latest Updates
                    </h3>
                    <div className="space-y-4">
                        {data.updates.length === 0 ? (
                            <p className="text-surface-500 text-sm">No recent updates.</p>
                        ) : (
                            data.updates.map((update) => (
                                <div key={update.id} className="relative pl-4 border-l-2 border-brand-200 pb-2">
                                    <div className="absolute w-2 h-2 bg-brand-500 rounded-full -left-[5px] top-1" />
                                    <p className="text-sm text-surface-800">{update.text}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-semibold text-surface-900">{update.author}</span>
                                        <span className="text-xs text-surface-400">• {update.time}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Invoice Center */}
            <div className="card p-6">
                <h3 className="text-lg font-bold text-surface-900 mb-4">Invoice Center</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-surface-200">
                                <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Invoice ID</th>
                                <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider">Date</th>
                                <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-center">Status</th>
                                <th className="py-3 px-4 text-xs font-semibold text-surface-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {data.invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-surface-50/50 transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium text-surface-900">{inv.id}</td>
                                    <td className="py-3 px-4 text-sm text-surface-600">{new Date(inv.date).toLocaleDateString()}</td>
                                    <td className="py-3 px-4 text-sm font-semibold text-surface-900 text-right">${inv.amount.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                      ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 flex justify-end gap-2">
                                        <button className="p-1.5 rounded-lg text-surface-500 hover:text-brand-600 hover:bg-brand-50 transition-colors tooltip-trigger" title="Download PDF">
                                            <ArrowDownTrayIcon className="w-5 h-5" />
                                        </button>
                                        {inv.status !== 'Paid' && (
                                            <button className="p-1.5 rounded-lg text-surface-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors tooltip-trigger" title="Pay Now">
                                                <CreditCardIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
