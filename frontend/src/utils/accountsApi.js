/**
 * utils/accountsApi.js
 * Thin wrappers around the accounts section endpoints.
 * All functions return { data } on success and throw on error.
 */

import api from './api';

// ── TAXES ─────────────────────────────────────────────────────
export const taxesApi = {
  getAll:        ()           => api.get('/taxes'),
  getActive:     ()           => api.get('/taxes/active'),
  create:        (payload)    => api.post('/taxes', payload),
  update:        (id, payload)=> api.put(`/taxes/${id}`, payload),
  toggleStatus:  (id)         => api.patch(`/taxes/${id}/status`),
  remove:        (id)         => api.delete(`/taxes/${id}`),
};

// ── INVOICES ──────────────────────────────────────────────────
export const invoicesApi = {
  getAll:        (params)     => api.get('/invoices', { params }),
  getById:       (id)         => api.get(`/invoices/${id}`),
  create:        (payload)    => api.post('/invoices', payload),
  update:        (id, payload)=> api.put(`/invoices/${id}`, payload),
  updateStatus:  (id, status) => api.patch(`/invoices/${id}/status`, { status }),
  remove:        (id)         => api.delete(`/invoices/${id}`),
};

// ── PAYMENTS ──────────────────────────────────────────────────
export const paymentsApi = {
  getAll:  (params)   => api.get('/payments', { params }),
  create:  (payload)  => api.post('/payments', payload),
  remove:  (id)       => api.delete(`/payments/${id}`),
};

// ── EXPENSES ──────────────────────────────────────────────────
export const expensesApi = {
  getAll:       (params)     => api.get('/expenses', { params }),
  getById:      (id)         => api.get(`/expenses/${id}`),
  create:       (payload)    => api.post('/expenses', payload),
  update:       (id, payload)=> api.put(`/expenses/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/expenses/${id}/status`, { status }),
  remove:       (id)         => api.delete(`/expenses/${id}`),
};

// ── PROVIDENT FUND ────────────────────────────────────────────
export const pfApi = {
  getAll:       (params)     => api.get('/provident-fund', { params }),
  getById:      (id)         => api.get(`/provident-fund/${id}`),
  create:       (payload)    => api.post('/provident-fund', payload),
  update:       (id, payload)=> api.put(`/provident-fund/${id}`, payload),
  updateStatus: (id, status) => api.patch(`/provident-fund/${id}/status`, { status }),
  remove:       (id)         => api.delete(`/provident-fund/${id}`),
};
