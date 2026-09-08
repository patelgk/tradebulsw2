/**
 * Generic Admin Pages
 * 
 * Used for all admin sub-sections:
 * - /admin/crm
 * - /admin/clients
 * - /admin/payments
 * - /admin/payouts
 * - /admin/partners
 * - /admin/support
 * - /admin/marketing
 * - /admin/notifications
 * - /admin/settings
 */

import React from 'react';
import { Users, CreditCard, DollarSign, LifeBuoy, Megaphone, Bell, Settings, Database, BarChart3 } from 'lucide-react';

interface AdminPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const AdminPageTemplate: React.FC<AdminPageProps> = ({ title, description, icon }) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {icon}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>

      {/* Coming Soon / Placeholder */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-12 border border-slate-200 dark:border-slate-800 text-center">
        <div className="inline-block p-4 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
          <Database size={32} className="text-slate-600 dark:text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Coming Soon
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          This section is under development. Check back soon for full functionality.
        </p>
        <button className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors">
          Refresh
        </button>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Dashboard', href: '/admin/dashboard' },
            { label: 'CRM', href: '/admin/crm' },
            { label: 'Clients', href: '/admin/clients' },
            { label: 'Payments', href: '/admin/payments' },
            { label: 'Payouts', href: '/admin/payouts' },
            { label: 'Back to App', href: '/' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm text-center"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Export individual page components
export const AdminCRM: React.FC = () => (
  <AdminPageTemplate
    title="CRM"
    description="Customer Relationship Management"
    icon={<Users size={24} />}
  />
);

export const AdminClients: React.FC = () => (
  <AdminPageTemplate
    title="Clients"
    description="Manage and monitor your clients"
    icon={<Users size={24} />}
  />
);

export const AdminPayments: React.FC = () => (
  <AdminPageTemplate
    title="Payments"
    description="Payment processing and history"
    icon={<CreditCard size={24} />}
  />
);

export const AdminPayouts: React.FC = () => (
  <AdminPageTemplate
    title="Payouts"
    description="Manage partner and user payouts"
    icon={<DollarSign size={24} />}
  />
);

export const AdminPartners: React.FC = () => (
  <AdminPageTemplate
    title="Partners"
    description="Partner management and commissions"
    icon={<BarChart3 size={24} />}
  />
);

export const AdminSupport: React.FC = () => (
  <AdminPageTemplate
    title="Support"
    description="Customer support and tickets"
    icon={<LifeBuoy size={24} />}
  />
);

export const AdminMarketing: React.FC = () => (
  <AdminPageTemplate
    title="Marketing"
    description="Marketing campaigns and analytics"
    icon={<Megaphone size={24} />}
  />
);

export const AdminNotifications: React.FC = () => (
  <AdminPageTemplate
    title="Notifications"
    description="System notifications and alerts"
    icon={<Bell size={24} />}
  />
);

export const AdminSettings: React.FC = () => (
  <AdminPageTemplate
    title="Settings"
    description="System settings and configuration"
    icon={<Settings size={24} />}
  />
);
