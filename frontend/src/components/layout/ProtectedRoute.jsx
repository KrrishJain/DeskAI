/**
 * components/layout/ProtectedRoute.jsx
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center animate-pulse">
            <span className="text-white font-display font-bold">S</span>
          </div>
          <p className="text-sm text-surface-400">Loading SmartHR...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'hr') return <Navigate to="/hr/dashboard" replace />;
    if (user.role === 'client') return <Navigate to="/client/dashboard" replace />;
    if (user.role === 'superadmin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}