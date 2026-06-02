/**
 * components/modals/AddSalaryModal.jsx
 * Staff salary form with earnings & deductions.
 * Mirrors the salary add.php modal with unit calculation toggle
 * and assignee radio button logic.
 */

import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const INITIAL_EARNINGS = {
  basic: '', daPercent: '40', hraPercent: '15',
  conveyance: '', allowance: '', medicalAllow: '', otherEarnings: '',
};
const INITIAL_DEDUCTIONS = {
  tds: '', esi: '', pf: '', leaveDeduct: '',
  profTax: '', labourWelfare: '', otherDeduct: '',
};

export default function AddSalaryModal({ open, onClose, onSuccess, employeeId: initialEmpId }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmpId, setSelectedEmpId] = useState(initialEmpId || '');
  const [earnings, setEarnings] = useState(INITIAL_EARNINGS);
  const [deductions, setDeductions] = useState(INITIAL_DEDUCTIONS);
  const [loading, setLoading] = useState(false);
  const [unitCalcEnabled, setUnitCalcEnabled] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!initialEmpId) {
      api.get('/employees?limit=100').then((d) => setEmployees(d.data || [])).catch(() => {});
    }
  }, [open, initialEmpId]);

  // Calculate net salary
  const basic = parseFloat(earnings.basic) || 0;
  const da = basic * (parseFloat(earnings.daPercent) / 100);
  const hra = basic * (parseFloat(earnings.hraPercent) / 100);
  const totalEarnings =
    basic + da + hra +
    (parseFloat(earnings.conveyance) || 0) +
    (parseFloat(earnings.allowance) || 0) +
    (parseFloat(earnings.medicalAllow) || 0) +
    (parseFloat(earnings.otherEarnings) || 0);

  const totalDeductions = Object.values(deductions).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const netSalary = totalEarnings - totalDeductions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpId) { toast.error('Please select an employee.'); return; }

    setLoading(true);
    try {
      await api.post('/salary', {
        employeeId: selectedEmpId,
        ...earnings,
        ...deductions,
      });
      toast.success('Salary structure saved!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputEarning = (key) => ({
    value: earnings[key],
    onChange: (e) => setEarnings((f) => ({ ...f, [key]: e.target.value })),
  });

  const inputDeduct = (key) => ({
    value: deductions[key],
    onChange: (e) => setDeductions((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Staff Salary"
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
          <button form="salary-form" type="submit" disabled={loading} className="btn-primary btn-sm">
            {loading ? 'Saving...' : 'Save Salary Structure'}
          </button>
        </>
      }
    >
      <form id="salary-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Employee selector + Net Salary display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Select Employee <span className="text-red-500">*</span></label>
            {initialEmpId ? (
              <p className="text-sm text-surface-600">Employee ID: {initialEmpId}</p>
            ) : (
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="input"
              >
                <option value="">Choose employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-end">
            <div className="w-full p-3 rounded-xl bg-brand-50 border border-brand-100">
              <p className="text-xs text-brand-600 font-medium uppercase tracking-wide">Calculated Net Salary</p>
              <p className="text-2xl font-display font-bold text-brand-700 mt-0.5">
                ${netSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Unit Calculation Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUnitCalcEnabled((v) => !v)}
            className={clsx(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              unitCalcEnabled ? 'bg-brand-600' : 'bg-surface-200'
            )}
          >
            <span className={clsx(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
              unitCalcEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
            )} />
          </button>
          <label className="text-sm font-medium text-surface-700">
            Enable unit calculation
            <span className="text-surface-400 font-normal ml-1">(auto-compute DA & HRA from basic)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* EARNINGS */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-brand-600 text-sm uppercase tracking-wide">
              Earnings
            </h4>
            <div>
              <label className="label">Basic Salary</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                <input {...inputEarning('basic')} type="number" min="0" step="0.01" className="input pl-7" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="label">DA {unitCalcEnabled && <span className="text-surface-400">(%)</span>}</label>
              {unitCalcEnabled ? (
                <div className="flex gap-2 items-center">
                  <input {...inputEarning('daPercent')} type="number" min="0" max="100" className="input w-20" />
                  <span className="text-sm text-surface-500">% = ${da.toFixed(2)}</span>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                  <input type="number" defaultValue={da.toFixed(2)} disabled className="input pl-7 bg-surface-50" />
                </div>
              )}
            </div>
            <div>
              <label className="label">HRA {unitCalcEnabled && <span className="text-surface-400">(%)</span>}</label>
              {unitCalcEnabled ? (
                <div className="flex gap-2 items-center">
                  <input {...inputEarning('hraPercent')} type="number" min="0" max="100" className="input w-20" />
                  <span className="text-sm text-surface-500">% = ${hra.toFixed(2)}</span>
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                  <input type="number" defaultValue={hra.toFixed(2)} disabled className="input pl-7 bg-surface-50" />
                </div>
              )}
            </div>
            {[
              { key: 'conveyance', label: 'Conveyance' },
              { key: 'allowance', label: 'Allowance' },
              { key: 'medicalAllow', label: 'Medical Allowance' },
              { key: 'otherEarnings', label: 'Others' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                  <input {...inputEarning(key)} type="number" min="0" step="0.01" className="input pl-7" placeholder="0.00" />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-surface-100">
              <p className="text-sm font-semibold text-surface-700">
                Total Earnings: <span className="text-brand-600">${totalEarnings.toFixed(2)}</span>
              </p>
            </div>
          </div>

          {/* DEDUCTIONS */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-red-500 text-sm uppercase tracking-wide">
              Deductions
            </h4>
            {[
              { key: 'tds', label: 'TDS' },
              { key: 'esi', label: 'ESI' },
              { key: 'pf', label: 'PF' },
              { key: 'leaveDeduct', label: 'Leave Deduction' },
              { key: 'profTax', label: 'Prof. Tax' },
              { key: 'labourWelfare', label: 'Labour Welfare' },
              { key: 'otherDeduct', label: 'Others' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm">$</span>
                  <input {...inputDeduct(key)} type="number" min="0" step="0.01" className="input pl-7" placeholder="0.00" />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t border-surface-100">
              <p className="text-sm font-semibold text-surface-700">
                Total Deductions: <span className="text-red-500">${totalDeductions.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}