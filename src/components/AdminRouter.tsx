/**
 * AdminRouter - Handles all /admin/* routes
 * 
 * Checks current pathname and renders appropriate admin page
 * Handles auth and route protection
 */

import React from 'react';
import { AdminLayout } from './AdminLayout';
import { ProtectedAdminRoute } from './ProtectedAdminRoute';
import { AdminLogin } from '../pages/AdminLogin';
import { AdminDashboard } from '../pages/AdminDashboard';
import {
  AdminCRM,
  AdminClients,
  AdminPayments,
  AdminPayouts,
  AdminPartners,
  AdminChallenges,
  AdminRiskManagement,
  AdminSupport,
  AdminMarketing,
  AdminNotifications,
  AdminSettings,
} from '../pages/AdminPages';

interface AdminRouterProps {
  user: { uid: string; email?: string; name?: string; role?: string } | null;
  onLoginSuccess: (user: any) => void;
  onLogout: () => void;
  onError: (message: string) => void;
}

export const AdminRouter: React.FC<AdminRouterProps> = ({
  user,
  onLoginSuccess,
  onLogout,
  onError,
}) => {
  const pathname = window.location.pathname;

  // /admin login page (always accessible)
  if (pathname === '/admin' || pathname === '/admin/') {
    return (
      <AdminLogin
        onLoginSuccess={onLoginSuccess}
        onError={onError}
      />
    );
  }

  // All other /admin/* routes require authentication and admin role
  const adminRoutes: Record<string, React.ComponentType> = {
    '/admin/dashboard': AdminDashboard,
    '/admin/crm': AdminCRM,
    '/admin/clients': AdminClients,
    '/admin/payments': AdminPayments,
    '/admin/payouts': AdminPayouts,
    '/admin/partners': AdminPartners,
    '/admin/challenges': AdminChallenges,
    '/admin/risk-management': AdminRiskManagement,
    '/admin/support': AdminSupport,
    '/admin/marketing': AdminMarketing,
    '/admin/notifications': AdminNotifications,
    '/admin/settings': AdminSettings,
  };

  const AdminPageComponent = adminRoutes[pathname];

  if (!AdminPageComponent) {
    // Unknown admin route - redirect to dashboard
    setTimeout(() => {
      window.location.href = '/admin/dashboard';
    }, 100);
    return null;
  }

  // Render with protection and layout
  return (
    <ProtectedAdminRoute
      user={user}
      onRedirectToLogin={() => {
        window.location.href = '/admin';
      }}
    >
      <AdminLayout
        user={user}
        onLogout={onLogout}
      >
        <AdminPageComponent />
      </AdminLayout>
    </ProtectedAdminRoute>
  );
};

/**
 * Check if current path is an admin route
 */
export const isAdminPath = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};
