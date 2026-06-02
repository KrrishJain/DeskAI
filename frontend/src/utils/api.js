/**
 * utils/api.js
 * Configured Axios instance with auth cookie support.
 * Added: api.upload() for multipart/form-data (avatar & logo uploads).
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send HttpOnly cookies automatically
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — return data directly, handle 401 globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    if (error.response?.status === 403 && error.response?.data?.errorType === 'subscription_expired') {
      if (window.location.pathname !== '/subscription-expired') {
        window.location.href = '/subscription-expired';
      }
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

/**
 * Upload multipart/form-data (files).
 * Usage: api.upload('/user/avatar', formData)
 */
api.upload = (url, formData) =>
  api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export default api;