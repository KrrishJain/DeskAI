/**
 * components/modals/AddLeaveModal.jsx
 */

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const INITIAL = { employeeId: '', startingAt: '', endingOn: '', days: '', reason: '' };

export default function AddLeaveModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) api.get('/employees?limit=200').then((d) => setEmployees(d.data || [])).catch(() => {});
  }, [open]);

  // Auto-calculate days
  useEffect(() => {
    if (form.startingAt && form.endingOn) {
      const diff = Math.ceil(
        (new Date(form.endingOn) - new Date(form.startingAt)) / (1000 * 60 * 60 * 24)
      );
      if (diff > 0) setForm((f) => ({ ...f, days: String(diff) }));
    }
  }, [form.startingAt, form.endingOn]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/leaves', form);
      toast.success('Leave request submitted!');
      setForm(INITIAL);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Leave"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button form="add-leave-form" type="submit" disabled={loading} className="btn-primary btn-sm">
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </>
      }
    >
      <form id="add-leave-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Employee <span className="text-red-500">*</span></label>
          <select {...f('employeeId')} required className="input">
            <option value="">Select Employee</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} â€” {emp.employee_id}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">From <span className="text-red-500">*</span></label>
            <input {...f('startingAt')} type="date" required className="input" />
          </div>
          <div>
            <label className="label">To <span className="text-red-500">*</span></label>
            <input {...f('endingOn')} type="date" required className="input" />
          </div>
        </div>
        <div>
          <label className="label">Number of Days</label>
          <input {...f('days')} type="number" min="1" className="input" />
        </div>
        <div>
          <label className="label">Reason <span className="text-red-500">*</span></label>
          <textarea {...f('reason')} required rows={3} className="input resize-none" placeholder="Reason for leave..." />
        </div>
      </form>
    </Modal>
  );
}