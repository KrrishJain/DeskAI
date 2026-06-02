/**
 * pages/Leaves.jsx
 * Leave management â€” mirrors leaves-employee.php
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../utils/api';
import DataTable from '../components/ui/DataTable';
import AddLeaveModal from '../components/modals/AddLeaveModal';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const STATUS_BADGE = {
  pending:  'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

export default function Leaves() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { isHR, isAdmin } = useAuth();

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/leaves?limit=100');
      setLeaves(data.data || []);
    } catch {
      toast.error('Failed to load leaves.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/leaves/${id}/status`, { status });
      toast.success(`Leave ${status}.`);
      fetchLeaves();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this leave record?')) return;
    try {
      await api.delete(`/leaves/${id}`);
      toast.success('Leave deleted.');
      fetchLeaves();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'first_name',
      label: 'Employee',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-surface-900 text-sm">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-surface-400">{row.department}</p>
        </div>
      ),
    },
    {
      key: 'starting_at',
      label: 'From',
      sortable: true,
      render: (_, val) => val ? format(new Date(val), 'MMM d, yyyy') : 'â€”',
    },
    {
      key: 'ending_on',
      label: 'To',
      render: (_, val) => val ? format(new Date(val), 'MMM d, yyyy') : 'â€”',
    },
    { key: 'days', label: 'Days', render: (_, v) => `${v} day${v !== 1 ? 's' : ''}` },
    { key: 'reason', label: 'Reason', render: (_, v) => <span className="text-surface-500 line-clamp-1 max-w-xs">{v}</span> },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_, val) => (
        <span className={clsx('badge capitalize', STATUS_BADGE[val] || 'badge-neutral')}>{val}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          {isHR && row.status === 'pending' && (
            <>
              <button
                onClick={() => handleStatus(row.id, 'approved')}
                title="Approve"
                className="btn-ghost btn-icon w-7 h-7 text-emerald-600 hover:bg-emerald-50"
              >
                <CheckIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleStatus(row.id, 'rejected')}
                title="Reject"
                className="btn-ghost btn-icon w-7 h-7 text-red-500 hover:bg-red-50"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => handleDelete(row.id)}
              className="btn-ghost btn-icon w-7 h-7 text-surface-400 hover:text-red-500"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Stats
  const pending = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Employee Leaves</h1>
          <nav className="breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span>/</span>
            <span className="text-surface-600">Leaves</span>
          </nav>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm gap-1.5">
          <PlusIcon className="w-4 h-4" /> Add Leave
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Requests', value: leaves.length, color: 'text-surface-900' },
          { label: 'Pending Review', value: pending, color: 'text-amber-600' },
          { label: 'Approved', value: approved, color: 'text-emerald-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={clsx('text-2xl font-display font-bold', s.color)}>{s.value}</p>
            <p className="text-sm text-surface-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <DataTable columns={columns} data={leaves} loading={loading} pageSize={12} />

      <AddLeaveModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchLeaves}
      />
    </div>
  );
}

// Stub import for TrashIcon used inside render
import { TrashIcon } from '@heroicons/react/24/outline';