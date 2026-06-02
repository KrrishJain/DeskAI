/**
 * pages/Employees.jsx
 * All Employees directory â€” grid + table view toggle.
 * Mirrors employees.php
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon, Squares2X2Icon, ListBulletIcon,
  PencilSquareIcon, TrashIcon, EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../utils/api';
import DataTable from '../components/ui/DataTable';
import AddEmployeeModal from '../components/modals/AddEmployeeModal';
import EditEmployeeModal from '../components/modals/EditEmployeeModal';
import { useAuth } from '../context/AuthContext';

function AvatarPlaceholder({ name, className }) {
  const initials = name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['bg-brand-100 text-brand-700', 'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700'];
  const color = colors[initials?.charCodeAt(0) % colors.length] || colors[0];
  return (
    <div className={clsx('rounded-full flex items-center justify-center font-semibold', color, className)}>
      {initials}
    </div>
  );
}

function EmployeeActions({ employee, onEdit, onDelete, isAdmin }) {
  return (
    <Menu as="div" className="relative">
      <Menu.Button className="btn-ghost btn-icon w-8 h-8">
        <EllipsisVerticalIcon className="w-4 h-4" />
      </Menu.Button>
      <Transition as={Fragment}
        enter="transition ease-out duration-100" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
        leave="transition ease-in duration-75" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-1 w-40 rounded-xl bg-white shadow-modal border border-surface-100 p-1 z-10">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={() => onEdit(employee.id)}
                className={clsx('flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg', active && 'bg-surface-50')}
              >
                <PencilSquareIcon className="w-4 h-4 text-surface-400" /> Edit
              </button>
            )}
          </Menu.Item>
          {isAdmin && (
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => onDelete(employee.id)}
                  className={clsx('flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg text-red-600', active && 'bg-red-50')}
                >
                  <TrashIcon className="w-4 h-4" /> Delete
                </button>
              )}
            </Menu.Item>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const { isAdmin, isHR } = useAuth();

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/employees?limit=100');
      setEmployees(data.data || []);
    } catch (err) {
      toast.error('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success('Employee deactivated.');
      fetchEmployees();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'first_name',
      label: 'Employee',
      sortable: true,
      render: (row) => (
        <Link to={`/employees/${row.id}`} className="flex items-center gap-3 hover:bg-surface-50 p-1 rounded transition-colors block w-max">
          <AvatarPlaceholder name={`${row.first_name} ${row.last_name}`} className="w-9 h-9 text-sm shrink-0" />
          <div>
            <p className="font-medium text-brand-600 hover:text-brand-700 text-sm">{row.first_name} {row.last_name}</p>
            <p className="text-xs text-surface-400 font-mono">{row.employee_id}</p>
          </div>
        </Link>
      ),
    },
    { key: 'designation', label: 'Role', sortable: true },
    { key: 'department', label: 'Department', sortable: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'joining_date',
      label: 'Joined',
      sortable: true,
      render: (_, val) => val ? new Date(val).toLocaleDateString() : 'â€”',
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <EmployeeActions
          employee={row}
          onEdit={(id) => setEditEmployeeId(id)}
          onDelete={handleDelete}
          isAdmin={isAdmin}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Employees</h1>
          <nav className="breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span>/</span>
            <span className="text-surface-600">Employees</span>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx('btn-icon w-8 h-8 rounded-lg', viewMode === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-700')}
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={clsx('btn-icon w-8 h-8 rounded-lg', viewMode === 'table' ? 'bg-white shadow-sm text-brand-600' : 'text-surface-400 hover:text-surface-700')}
            >
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>
          {isHR && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm gap-1.5">
              <PlusIcon className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-5 space-y-3 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-surface-100 mx-auto" />
                <div className="h-4 bg-surface-100 rounded w-3/4 mx-auto" />
                <div className="h-3 bg-surface-100 rounded w-1/2 mx-auto" />
              </div>
            ))
            : employees.map((emp) => (
              <div key={emp.id} className="card p-5 text-center group hover:shadow-card-hover transition-shadow">
                <div className="relative inline-block mb-3">
                  {emp.picture ? (
                    <img
                      src={`/uploads/${emp.picture}`}
                      alt={emp.first_name}
                      className="w-16 h-16 rounded-full object-cover mx-auto ring-2 ring-surface-100"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <AvatarPlaceholder
                      name={`${emp.first_name} ${emp.last_name}`}
                      className="w-16 h-16 text-lg mx-auto"
                    />
                  )}
                </div>
                <h4 className="font-semibold text-surface-900 text-sm">
                  {emp.first_name} {emp.last_name}
                </h4>
                <p className="text-xs text-surface-500 mt-0.5">{emp.designation || 'â€”'}</p>
                <p className="text-xs text-brand-600 font-mono mt-1">{emp.department || 'â€”'}</p>
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <EmployeeActions
                    employee={emp}
                    onEdit={(id) => setEditEmployeeId(id)}
                    onDelete={handleDelete}
                    isAdmin={isAdmin}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to={`/employees/${emp.id}`} className="btn-secondary btn-sm text-xs">View</Link>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          pageSize={15}
          toolbar={
            isHR && (
              <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm gap-1.5">
                <PlusIcon className="w-4 h-4" /> Add Employee
              </button>
            )
          }
        />
      )}

      {/* Add Employee Modal */}
      {/* Modals */}
      <AddEmployeeModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchEmployees}
      />

      <EditEmployeeModal
        open={!!editEmployeeId}
        employeeId={editEmployeeId}
        onClose={() => setEditEmployeeId(null)}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}