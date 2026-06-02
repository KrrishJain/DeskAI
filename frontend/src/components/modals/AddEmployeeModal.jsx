/**
 * components/modals/AddEmployeeModal.jsx
 * Mirrors add_employee.php modal with all fields.
 */

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const INITIAL = {
  firstName: '', lastName: '', username: '', email: '',
  password: '', confirmPass: '', phone: '',
  departmentId: '', designationId: '',
  bankName: '', accountNumber: '', ifscCode: '', branchName: ''
};

function generateEmployeeId() {
  return 'EMP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function AddEmployeeModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [employeeId] = useState(generateEmployeeId);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [picture, setPicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    api.get('/departments').then((d) => setDepartments(d.data || [])).catch(() => { });
    api.get('/designations').then((d) => setDesignations(d.data || [])).catch(() => { });
  }, [open]);

  // Filter designations by selected department
  const filteredDesignations = form.departmentId
    ? designations.filter((d) => d.department_id === parseInt(form.departmentId))
    : designations;

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!form.username.trim()) errs.username = 'Username is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    if (!form.password) errs.password = 'Password is required.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPass) errs.confirmPass = 'Passwords do not match.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        firstName: form.firstName, lastName: form.lastName,
        username: form.username, email: form.email,
        password: form.password, employeeId,
        phone: form.phone, departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
        bankName: form.bankName || undefined,
        accountNumber: form.accountNumber || undefined,
        ifscCode: form.ifscCode || undefined,
        branchName: form.branchName || undefined,
      };

      console.log('Sending AddEmployee payload:', payload);
      await api.post('/employees', payload);
      toast.success('Employee added successfully!');
      setForm(INITIAL);
      setErrors({});
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((er) => ({ ...er, [key]: undefined }));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Employee"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button
            form="add-employee-form"
            type="submit"
            disabled={loading}
            className="btn-primary btn-sm"
          >
            {loading ? 'Saving...' : 'Add Employee'}
          </button>
        </>
      }
    >
      <form id="add-employee-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label className="label">First Name <span className="text-red-500">*</span></label>
            <input {...field('firstName')} type="text" className={`input ${errors.firstName ? 'input-error' : ''}`} placeholder="John" />
            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
          </div>

          {/* Last Name */}
          <div>
            <label className="label">Last Name <span className="text-red-500">*</span></label>
            <input {...field('lastName')} type="text" className={`input ${errors.lastName ? 'input-error' : ''}`} placeholder="Doe" />
            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
          </div>

          {/* Username */}
          <div>
            <label className="label">Username <span className="text-red-500">*</span></label>
            <input {...field('username')} type="text" className={`input ${errors.username ? 'input-error' : ''}`} placeholder="johndoe" />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label">Email <span className="text-red-500">*</span></label>
            <input {...field('email')} type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="john@company.com" />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="label">Password <span className="text-red-500">*</span></label>
            <input {...field('password')} type="password" className={`input ${errors.password ? 'input-error' : ''}`} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="label">Confirm Password <span className="text-red-500">*</span></label>
            <input {...field('confirmPass')} type="password" className={`input ${errors.confirmPass ? 'input-error' : ''}`} />
            {errors.confirmPass && <p className="text-red-500 text-xs mt-1">{errors.confirmPass}</p>}
          </div>

          {/* Employee ID (readonly) */}
          <div>
            <label className="label">Employee ID</label>
            <input type="text" value={employeeId} readOnly className="input bg-surface-50 text-surface-400 cursor-not-allowed font-mono" />
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone</label>
            <input {...field('phone')} type="tel" className="input" placeholder="+1 234 567 8900" />
          </div>

          {/* Department */}
          <div>
            <label className="label">Department</label>
            <select {...field('departmentId')} className="input">
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Designation */}
          <div>
            <label className="label">Designation</label>
            <select {...field('designationId')} className="input">
              <option value="">Select Designation</option>
              {filteredDesignations.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
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

        {/* Picture upload */}
        <div>
          <label className="label">Employee Picture</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPicture(e.target.files[0])}
            className="input py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0
                       file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700
                       hover:file:bg-brand-100 cursor-pointer"
          />
        </div>
      </form>
    </Modal>
  );
}