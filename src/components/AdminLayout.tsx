/**
 * AdminLayout - Professional CRM-style admin panel layout
 * 
 * Used for all /admin/* routes
 * Separate from user trading sidebar
 * Includes top header + sidebar navigation
 */

import React, { useState } from 'react';
import {
  Menu, X, LayoutDashboard, Users, CreditCard, DollarSign, 
  UserCheck, LifeBuoy, Megaphone, Bell, Settings, LogOut, Home
} from 'lucide-react';

interface AdminLayoutProps {
  user: { name?: string; email?: string } | null;
  onLogout: () => void;
  children: React.ReactNode;
}

interface NavLink {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const adminNavLinks: NavLink[] = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'CRM', path: '/admin/crm', icon: <Users size={20} /> },
    { label: 'Clients', path: '/admin/clients', icon: <UserCheck size={20} /> },
    { label: 'Payments', path: '/admin/payments', icon: <CreditCard size={20} /> },
    { label: 'Payouts', path: '/admin/payouts', icon: <DollarSign size={20} /> },
    { label: 'Partners', path: '/admin/partners', icon: <Users size={20} /> },
    { label: 'Support', path: '/admin/support', icon: <LifeBuoy size={20} /> },
    { label: 'Marketing', path: '/admin/marketing', icon: <Megaphone size={20} /> },
    { label: 'Notifications', path: '/admin/notifications', icon: <Bell size={20} />, badge: 3 },
    { label: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
  ];

  const isActive = (path: string) => {
    return window.location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:translate-x-0 md:sticky md:top-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800">
          <div className="font-bold text-lg text-slate-900 dark:text-white">Proprupee Admin</div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {adminNavLinks.map((link) => (
            <a
              key={link.path}
              href={link.path}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive(link.path)
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {link.icon}
                <span className="text-sm">{link.label}</span>
              </div>
              {link.badge && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {link.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <Home size={20} />
            <span className="text-sm">Back to App</span>
          </a>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors mt-2"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <Menu size={24} />
          </button>

          {/* Admin Info */}
          <div className="flex-1 flex items-center justify-center md:justify-start gap-4">
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">Admin Panel</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proprupee Administration</p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || 'Admin'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
        />
      )}
    </div>
  );
};
