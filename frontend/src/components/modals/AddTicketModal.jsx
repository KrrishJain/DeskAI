// components/modals/AddTicketModal.jsx

import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AddTicketModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
  });

  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      if (!open) return;

      try {
        setEmpLoading(true);
        const res = await api.get('/tickets/employees/list');
        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
            ? res.data
            : [];
        setEmployees(list);
      } catch (err) {
        console.error(err);
        toast.error('Unable to load employees list.');
      } finally {
        setEmpLoading(false);
      }
    };

    fetchEmployees();
  }, [open]);

  const filteredEmployees = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return employees;

    return employees.filter((emp) => {
      const fullName = (emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase();
      const empCode = (emp.employee_id || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      return fullName.includes(text) || empCode.includes(text) || email.includes(text);
    });
  }, [employees, search]);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.subject || !form.description) {
      toast.error('Subject and description required.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/tickets', {
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined,
      });

      toast.success('Ticket created successfully.');
      onSuccess?.();
      onClose();
      setForm({
        subject: '',
        description: '',
        priority: 'medium',
        assigned_to: '',
      });
      setSearch('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating ticket.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Ticket"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            form="ticket-form"
            type="submit"
            disabled={loading}
            className="btn-primary btn-sm"
          >
            {loading ? 'Saving...' : 'Create'}
          </button>
        </>
      }
    >
      <form
        id="ticket-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="label">Subject *</label>
          <input
            type="text"
            className="input"
            value={form.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Description *</label>
          <textarea
            rows="4"
            className="input"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </div>

        <div>
          <label className="label">Priority</label>
          <select
            className="input"
            value={form.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="label">Assign To</label>
          <input
            type="text"
            className="input"
            placeholder="Search by name, employee id, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-surface-200 bg-white">
            {empLoading ? (
              <p className="px-3 py-2 text-sm text-surface-500">Loading employees...</p>
            ) : filteredEmployees.length === 0 ? (
              <p className="px-3 py-2 text-sm text-surface-500">No employees found.</p>
            ) : (
              filteredEmployees.map((emp) => {
                const fullName = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                const selected = Number(form.assigned_to) === Number(emp.id);

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleChange('assigned_to', String(emp.id))}
                    className={`w-full px-3 py-2 text-left text-sm border-b border-surface-100 last:border-b-0 hover:bg-surface-50 ${selected ? 'bg-brand-50 text-brand-700 font-medium' : 'text-surface-700'}`}
                  >
                    <div>{fullName || `Employee #${emp.id}`}</div>
                    <div className="text-xs text-surface-500">{emp.employee_id || `ID: ${emp.id}`}{emp.email ? ` · ${emp.email}` : ''}</div>
                  </button>
                );
              })
            )}
          </div>

          {form.assigned_to && (
            <button
              type="button"
              className="mt-2 text-xs text-red-500 hover:text-red-600"
              onClick={() => handleChange('assigned_to', '')}
            >
              Clear selection
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}