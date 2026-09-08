/**
 * ProtectedAdminRoute - Route guard for admin pages
 * 
 * Access Rules:
 * - NOT authenticated → redirect to /admin login
 * - Authenticated but role !== 'admin' or 'super_admin' → show Unauthorized
 * - role === 'admin' or 'super_admin' → allow access
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface User {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
}

interface ProtectedAdminRouteProps {
  user: User | null;
  children: React.ReactNode;
  onRedirectToLogin?: () => void;
}

/**
 * Checks if user has admin role
 */
export const isAdminUser = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'admin';
};

/**
 * Protected route component with access control
 */
export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  user,
  children,
  onRedirectToLogin,
}) => {
  // Not authenticated - show login prompt
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-800">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Admin Login Required
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please log in to access the admin panel.
          </p>
          <button
            onClick={onRedirectToLogin}
            className="w-full px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Authenticated but not admin - show access denied
  if (!isAdminUser(user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-lg p-8 text-center border border-slate-200 dark:border-slate-800">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            You do not have permission to access the admin panel.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
            Current role: <span className="font-semibold">{user.role || 'user'}</span>
          </p>
          <a
            href="/"
            className="inline-block w-full px-4 py-3 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Go Back to App
          </a>
        </div>
      </div>
    );
  }

  // Admin - render protected content
  return <>{children}</>;
};
