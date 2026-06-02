/**
 * pages/Login.jsx
 * SmartHR Login Page - Supports legacy credentials (Vendetta, Barry)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(username, password);
      toast.success('Welcome back!');

      if (data?.user?.role === 'superadmin') {
        navigate('/super-admin');
      } else if (data?.user?.role === 'hr') {
        navigate('/hr/dashboard');
      } else if (data?.user?.role === 'admin') {
        navigate('/dashboard');
      } else if (data?.user?.role === 'client') {
        navigate('/client/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-900 via-surface-800 to-brand-950 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-800/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-600/30">
            <span className="text-white font-display font-bold text-2xl">S</span>
          </div>
          <h1 className="font-display font-bold text-white text-3xl">
            Smart<span className="text-brand-400">HR</span>
          </h1>
          <p className="text-surface-400 text-sm mt-1">Human Resource Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="font-display font-semibold text-white text-xl mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g. Vendetta"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10
                           text-white placeholder-surface-500 text-sm
                           focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                           transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/10
                           text-white placeholder-surface-500 text-sm
                           focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
                           transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 rounded-xl font-semibold text-sm
                         shadow-lg shadow-brand-600/30 disabled:opacity-60 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-6 p-3 rounded-xl bg-brand-600/10 border border-brand-500/20">
            <p className="text-xs text-brand-300 font-mono">
              Demo credentials: <strong>Vendetta / vendetta</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}