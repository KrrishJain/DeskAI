/**
 * components/modals/EditEmployeeModal.jsx
 * Allows HR to update an Employee's profile, including their Bank Details.
 */

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function EditEmployeeModal({ open, onClose, employeeId, onSuccess }) {
    const [form, setForm] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (!open || !employeeId) return;

        const loadDefaults = async () => {
            setFetching(true);
            try {
                const [depRes, desRes, empRes] = await Promise.all([
                    api.get('/departments'),
                    api.get('/designations'),
                    api.get(`/employees/${employeeId}`)
                ]);

                setDepartments(depRes.data || []);
                setDesignations(desRes.data || []);

                const emp = empRes.data;
                setForm({
                    firstName: emp.first_name || '',
                    lastName: emp.last_name || '',
                    email: emp.email || '',
                    phone: emp.phone || '',
                    departmentId: emp.department_id || '',
                    designationId: emp.designation_id || '',
                    joiningDate: emp.joining_date ? emp.joining_date.split('T')[0] : '',
                    // Financial Profiles
                    bankName: emp.bank_name || '',
                    accountNumber: emp.account_number || '',
                    ifscCode: emp.ifsc_code || '',
                    branchName: emp.branch_name || ''
                });
            } catch (err) {
                toast.error('Failed to load employee data');
                onClose();
            } finally {
                setFetching(false);
            }
        };

        loadDefaults();
    }, [open, employeeId, onClose]);

    // Filter designations by selected department
    const filteredDesignations = form?.departmentId
        ? designations.filter((d) => d.department_id === parseInt(form.departmentId))
        : designations;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/employees/${employeeId}`, {
                ...form,
                departmentId: form.departmentId || undefined,
                designationId: form.designationId || undefined,
            });
            toast.success('Employee details updated successfully!');
            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.message || 'Failed to update employee');
        } finally {
            setLoading(false);
        }
    };

    const field = (key) => ({
        value: form[key],
        onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Edit Employee Profile"
            size="xl"
            footer={
                <>
                    <button onClick={onClose} className="btn-secondary btn-sm" disabled={loading}>Cancel</button>
                    <button
                        form="edit-employee-form"
                        type="submit"
                        disabled={loading || fetching}
                        className="btn-primary btn-sm"
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </>
            }
        >
            {fetching || !form ? (
                <div className="flex justify-center p-6">
                    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <form id="edit-employee-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Section 1: Personal Info */}
                    <div>
                        <h3 className="text-sm font-bold text-surface-900 mb-3 border-b pb-1">Personal Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">First Name</label>
                                <input {...field('firstName')} type="text" className="input" required />
                            </div>
                            <div>
                                <label className="label">Last Name</label>
                                <input {...field('lastName')} type="text" className="input" required />
                            </div>
                            <div>
                                <label className="label">Email Address</label>
                                <input {...field('email')} type="email" className="input" required />
                            </div>
                            <div>
                                <label className="label">Phone Number</label>
                                <input {...field('phone')} type="tel" className="input" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Corporate Info */}
                    <div>
                        <h3 className="text-sm font-bold text-surface-900 mb-3 border-b pb-1">Company Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="label">Department</label>
                                <select {...field('departmentId')} className="input">
                                    <option value="">Select Department</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Designation</label>
                                <select {...field('designationId')} className="input">
                                    <option value="">Select Designation</option>
                                    {filteredDesignations.map((d) => (
                                        <option key={d.id} value={d.id}>{d.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label">Joining Date</label>
                                <input {...field('joiningDate')} type="date" className="input" required />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Bank Details */}
                    <div>
                        <h3 className="text-sm font-bold text-surface-900 mb-3 border-b pb-1">Financial & Bank Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-brand-50/50 p-4 rounded-xl border border-brand-100">
                            <div>
                                <label className="label">Bank Name</label>
                                <input {...field('bankName')} type="text" className="input bg-white" placeholder="e.g. Chase Bank" />
                            </div>
                            <div>
                                <label className="label">Account Number</label>
                                <input {...field('accountNumber')} type="text" className="input bg-white" placeholder="e.g. 1234567890" />
                            </div>
                            <div>
                                <label className="label">IFSC / Routing Code</label>
                                <input {...field('ifscCode')} type="text" className="input bg-white" placeholder="e.g. CHASUS33" />
                            </div>
                            <div>
                                <label className="label">Branch Name</label>
                                <input {...field('branchName')} type="text" className="input bg-white" placeholder="e.g. Downtown Branch" />
                            </div>
                        </div>
                    </div>
                </form>
            )}
        </Modal>
    );
}
