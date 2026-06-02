/**
 * pages/Assets.jsx
 * Asset management â€” mirrors assets.php
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '../utils/api';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['pending', 'approved', 'returned'];
const STATUS_BADGE = { pending: 'badge-warning', approved: 'badge-success', returned: 'badge-info' };

const INITIAL = {
  assetName: '', assetCode: '', purchaseDate: '', purchaseFrom: '',
  manufacturer: '', model: '', supplier: '', condition: '',
  warranty: '', price: '', assignedToId: '', description: '', status: 'pending',
};

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const { isAdmin, isHR } = useAuth();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsData, empData] = await Promise.all([
        api.get('/assets?limit=100'),
        api.get('/employees?limit=200'),
      ]);
      setAssets(assetsData.data || []);
      setEmployees(empData.data || []);
    } catch { toast.error('Failed to load assets.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/assets', form);
      toast.success('Asset added!');
      setForm(INITIAL);
      setShowModal(false);
      fetchAll();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this asset?')) return;
    try {
      await api.delete(`/assets/${id}`);
      toast.success('Asset deleted.');
      fetchAll();
    } catch (err) { toast.error(err.message); }
  };

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const columns = [
    {
      key: 'asset_name',
      label: 'Asset',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-surface-900 text-sm">{row.asset_name}</p>
          <p className="text-xs text-surface-400 font-mono">{row.asset_code}</p>
        </div>
      ),
    },
    {
      key: 'assigned_to_name',
      label: 'Assigned To',
      render: (_, v) => v || <span className="text-surface-400">Unassigned</span>,
    },
    {
      key: 'purchase_date',
      label: 'Purchase Date',
      sortable: true,
      render: (_, v) => v ? format(new Date(v), 'MMM d, yyyy') : 'â€”',
    },
    { key: 'warranty', label: 'Warranty' },
    {
      key: 'price',
      label: 'Value',
      sortable: true,
      render: (_, v) => `$${parseFloat(v).toLocaleString()}`,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_, v) => (
        <span className={clsx('badge capitalize', STATUS_BADGE[v] || 'badge-neutral')}>{v}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => isAdmin && (
        <button onClick={() => handleDelete(row.id)} className="btn-ghost btn-icon w-7 h-7 text-surface-400 hover:text-red-500">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Assets</h1>
          <nav className="breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span>/</span>
            <span className="text-surface-600">Assets</span>
          </nav>
        </div>
        {isHR && (
          <button onClick={() => setShowModal(true)} className="btn-primary btn-sm gap-1.5">
            <PlusIcon className="w-4 h-4" /> Add Asset
          </button>
        )}
      </div>

      <DataTable columns={columns} data={assets} loading={loading} pageSize={12} />

      {/* Add Asset Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Asset"
        size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary btn-sm">Cancel</button>
            <button form="asset-form" type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Saving...' : 'Add Asset'}
            </button>
          </>
        }
      >
        <form id="asset-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Asset Name <span className="text-red-500">*</span></label>
            <input {...f('assetName')} required type="text" className="input" />
          </div>
          <div>
            <label className="label">Asset Code <span className="text-red-500">*</span></label>
            <input {...f('assetCode')} required type="text" placeholder="#AST-000000" className="input font-mono" />
          </div>
          <div>
            <label className="label">Purchase Date</label>
            <input {...f('purchaseDate')} type="date" className="input" />
          </div>
          <div>
            <label className="label">Purchase From</label>
            <input {...f('purchaseFrom')} type="text" className="input" />
          </div>
          <div>
            <label className="label">Manufacturer</label>
            <input {...f('manufacturer')} type="text" className="input" />
          </div>
          <div>
            <label className="label">Model</label>
            <input {...f('model')} type="text" className="input" />
          </div>
          <div>
            <label className="label">Warranty</label>
            <input {...f('warranty')} type="text" placeholder="12 Months" className="input" />
          </div>
          <div>
            <label className="label">Price ($)</label>
            <input {...f('price')} type="number" min="0" step="0.01" className="input" />
          </div>
          <div>
            <label className="label">Assign To</label>
            <select {...f('assignedToId')} className="input">
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select {...f('status')} className="input">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea {...f('description')} rows={2} className="input resize-none" />
          </div>
        </form>
      </Modal>
    </div>
  );
}