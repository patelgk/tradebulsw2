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

import React, { useState, useEffect } from 'react';
import { Users, CreditCard, DollarSign, LifeBuoy, Megaphone, Bell, Settings, Database, BarChart3, AlertTriangle, ChevronDown, ChevronUp, Eye, Ban, RefreshCw } from 'lucide-react';

interface AdminPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ClientData {
  _id: string;
  uid: string;
  email: string;
  name: string;
  phoneNumber?: string;
  accountStatus: string;
  role: string;
  createdAt: string;
  balance: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
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

export const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'funded' | 'no-fund'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState<number>(0);
  const [editReason, setEditReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    fetchClients();
  }, [filterType]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get admin user from localStorage
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      // Fetch all users with POST request sending uid in body
      const response = await fetch(`/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, page: 1, limit: 10000 }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch clients: ${response.statusText}`);
      }

      const data = await response.json();
      let filteredUsers = data.users || [];
      
      // Apply funding filter
      if (filterType === 'funded') {
        filteredUsers = filteredUsers.filter((u: ClientData) => u.balance > 0);
      } else if (filterType === 'no-fund') {
        filteredUsers = filteredUsers.filter((u: ClientData) => u.balance === 0);
      }

      setClients(filteredUsers);
      setPagination({
        page: 1,
        limit: filteredUsers.length,
        total: data.pagination.total,
        pages: 1,
      });
      setLastRefresh(new Date());
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'rejected': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-primary/10 text-primary';
      case 'partner': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const handleEditFund = async (clientId: string, client: ClientData) => {
    if (!editBalance && editBalance !== 0) {
      alert('Please enter a balance amount');
      return;
    }
    if (!window.confirm(`Change ${client.email}'s balance from ₹${client.balance} to ₹${editBalance}?`)) return;
    
    try {
      setActionLoading(clientId);
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      const response = await fetch(`/api/admin/users/${clientId}/edit-fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: user.uid, 
          newBalance: editBalance, 
          reason: editReason || 'Admin adjustment'
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update balance');
      }
      
      setEditingClient(null);
      setEditBalance(0);
      setEditReason('');
      await fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to update user balance');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (clientId: string, client: ClientData) => {
    if (!window.confirm(`Are you SURE you want to permanently delete ${client.email}? This cannot be undone.`)) return;
    
    try {
      setActionLoading(clientId);
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      const response = await fetch(`/api/admin/users/${clientId}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: user.uid, 
          reason: deleteReason || 'Admin deletion',
          confirmPassword: 'DELETE_CONFIRM'
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete user');
      }
      
      setShowDeleteConfirm(null);
      setDeleteReason('');
      await fetchClients();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAccountStatus = async (clientId: string, newStatus: string, client: ClientData, reason: string) => {
    try {
      setActionLoading(`status-${clientId}`);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/users/${clientId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          uid: user.uid, 
          newStatus, 
          reason
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update account status');
      }
      
      await fetchClients();
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to toggle account status');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Users size={24} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Clients</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Manage and monitor all registered clients</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{pagination.total}</div>
          <div className="text-sm text-slate-600 dark:text-slate-400">Total Clients</div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Error loading clients</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            filterType === 'all'
              ? 'bg-primary text-white'
              : 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          All Users
        </button>
        <button
          onClick={() => setFilterType('funded')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            filterType === 'funded'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          Funded Users
        </button>
        <button
          onClick={() => setFilterType('no-fund')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            filterType === 'no-fund'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700'
          }`}
        >
          No Funds
        </button>
        <div className="flex-1" />
        <button
          onClick={() => fetchClients()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Last Update */}
      {lastRefresh && (
        <div className="text-xs text-slate-600 dark:text-slate-400">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      )}

      {/* Clients Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No clients found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Joined</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-900 dark:text-white uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <React.Fragment key={client._id}>
                    <tr className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-300">{client.email}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{client.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{client.phoneNumber || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(client.accountStatus)}`}>
                          {client.accountStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${getRoleColor(client.role)}`}>
                          {client.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        ₹{(client.balance || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setExpandedClient(expandedClient === client._id ? null : client._id)}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          {expandedClient === client._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Details */}
                    {expandedClient === client._id && (
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <td colSpan={8} className="px-6 py-6">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">User ID</p>
                              <p className="font-mono text-sm text-slate-900 dark:text-white break-all">{client.uid}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Phone Number</p>
                              <p className="text-sm text-slate-900 dark:text-white">{client.phoneNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Account Status</p>
                              <p className="text-sm text-slate-900 dark:text-white capitalize">{client.accountStatus}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Joined Date</p>
                              <p className="text-sm text-slate-900 dark:text-white">{new Date(client.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="md:col-span-3">
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Quick Actions</p>
                              <div className="flex gap-2 flex-wrap">
                                <button 
                                  onClick={() => {
                                    setEditingClient(client._id);
                                    setEditBalance(client.balance);
                                    setEditReason('');
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  <DollarSign size={14} />
                                  Edit Balance
                                </button>
                                <button 
                                  onClick={() => {
                                    if (client.accountStatus === 'active') {
                                      if (!window.confirm(`Deactivate ${client.email}? They won't be able to trade.`)) return;
                                      handleToggleAccountStatus(client._id, 'inactive', client, 'Admin deactivation');
                                    } else {
                                      if (!window.confirm(`Activate ${client.email}? They will be able to trade.`)) return;
                                      handleToggleAccountStatus(client._id, 'active', client, 'Admin activation');
                                    }
                                  }}
                                  disabled={actionLoading === `status-${client._id}`}
                                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    client.accountStatus === 'active'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                                      : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  } disabled:opacity-50`}
                                >
                                  {actionLoading === `status-${client._id}` ? (
                                    <>Updating...</>
                                  ) : (
                                    <>
                                      {client.accountStatus === 'active' ? '🔴 Deactivate' : '🟢 Activate'}
                                    </>
                                  )}
                                </button>
                                <button 
                                  onClick={() => {
                                    if (client.role === 'admin') {
                                      alert('Cannot delete admin users');
                                      return;
                                    }
                                    setShowDeleteConfirm(client._id);
                                    setDeleteReason('');
                                  }}
                                  disabled={client.role === 'admin'}
                                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <Ban size={14} />
                                  Delete Permanently
                                </button>
                              </div>

                              {/* Edit Balance Form */}
                              {editingClient === client._id && (
                                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900/50">
                                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-3">Edit Balance</h4>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">Current Balance</label>
                                      <input type="text" disabled value={`₹${client.balance.toLocaleString('en-IN')}`} className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">New Balance</label>
                                      <input type="number" value={editBalance} onChange={(e) => setEditBalance(parseFloat(e.target.value) || 0)} placeholder="Enter new balance" className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white" />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 mb-1">Reason (Optional)</label>
                                      <input type="text" value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="e.g., Deposit, Refund" className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white" />
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleEditFund(client._id, client)} disabled={actionLoading === client._id} className="flex-1 px-3 py-2 text-sm font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors">{actionLoading === client._id ? 'Saving...' : 'Save Changes'}</button>
                                      <button onClick={() => setEditingClient(null)} className="flex-1 px-3 py-2 text-sm font-bold bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Delete Confirmation */}
                              {showDeleteConfirm === client._id && (
                                <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-900/50">
                                  <h4 className="font-bold text-red-900 dark:text-red-200 mb-2">Confirm Permanent Deletion</h4>
                                  <p className="text-sm text-red-800 dark:text-red-300 mb-3">You are about to permanently delete <strong>{client.email}</strong>. This cannot be undone.</p>
                                  <div className="mb-3">
                                    <label className="block text-xs font-bold text-red-900 dark:text-red-200 mb-1">Deletion Reason (Optional)</label>
                                    <input type="text" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} placeholder="e.g., Fraudulent, User request" className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 rounded text-slate-900 dark:text-white" />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleDeleteUser(client._id, client)} disabled={actionLoading === client._id} className="flex-1 px-3 py-2 text-sm font-bold bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors">{actionLoading === client._id ? 'Deleting...' : 'Yes, Delete'}</button>
                                    <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-3 py-2 text-sm font-bold bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {/* Pagination removed - now loading all users at once */}
    </div>
  );
};

// Payment interface
interface PaymentData {
  _id: string;
  userId: string;
  type: string;
  amount: number;
  paymentMethod: string;
  paymentReference: string;
  status: string;
  time: string;
  userName: string;
  userEmail: string;
  invoiceNumber?: string;
  challengeName?: string;
  planName?: string;
}

interface StatusCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
}

export const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ all: 0, pending: 0, approved: 0, rejected: 0 });
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  useEffect(() => {
    fetchPayments();
  }, [filterStatus, page, searchTerm]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, status: filterStatus, page, limit: 20, search: searchTerm }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch payments');
      }
      
      const data = await response.json();
      setPayments(data.payments || []);
      setTotalPages(data.pagination?.pages || 1);
      setStatusCounts(data.statusCounts || { all: 0, pending: 0, approved: 0, rejected: 0 });
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      setError(err.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to approve this payment? The amount will be added to the user\'s balance.')) return;
    
    try {
      setActionLoading(paymentId);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to approve payment');
      }
      
      const result = await response.json();
      console.log('Payment approved:', result);
      
      // Close modal and refresh
      setShowDetailsModal(false);
      setShowApproveConfirm(null);
      await fetchPayments();
    } catch (err: any) {
      setError(err.message || 'Failed to approve payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason');
      return;
    }
    
    if (!window.confirm('Are you sure you want to reject this payment? The user will NOT receive the funds.')) return;
    
    try {
      setActionLoading(paymentId);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, reason: rejectReason }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reject payment');
      }
      
      const result = await response.json();
      console.log('Payment rejected:', result);
      
      // Close modal and refresh
      setShowRejectModal(null);
      setRejectReason('');
      setShowDetailsModal(false);
      await fetchPayments();
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'challenge_purchase': return 'Challenge Purchase';
      case 'deposit': return 'Deposit';
      default: return type;
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard size={28} className="text-primary" />
            Payments & Deposits
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage user payment requests and approvals</p>
        </div>
        <button 
          onClick={() => fetchPayments()} 
          disabled={loading} 
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-400">All</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{statusCounts.all}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900/50">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Pending</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">{statusCounts.pending}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-900/50">
          <div className="text-sm font-medium text-green-600 dark:text-green-400">Approved</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-2">{statusCounts.approved}</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-900/50">
          <div className="text-sm font-medium text-red-600 dark:text-red-400">Rejected</div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-2">{statusCounts.rejected}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name, email, or reference..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-900 dark:text-white uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-slate-900 dark:text-white uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment._id} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-300">{payment.userEmail}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{payment.userName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{getTypeLabel(payment.type)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">₹{(payment.amount).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600 dark:text-slate-400">{payment.paymentReference}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(payment.time).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        {payment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowApproveConfirm(payment._id);
                              }}
                              disabled={actionLoading === payment._id}
                              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 transition-colors"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowRejectModal(true);
                              }}
                              disabled={actionLoading === payment._id}
                              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-slate-50 dark:bg-slate-800 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">User Email</p>
                  <p className="font-mono text-sm text-slate-900 dark:text-white">{selectedPayment.userEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">User Name</p>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedPayment.userName}</p>
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Amount</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">₹{(selectedPayment.amount).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Payment Type</p>
                  <p className="text-sm text-slate-900 dark:text-white">{getTypeLabel(selectedPayment.type)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Reference/UTR</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-white">{selectedPayment.paymentReference}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(selectedPayment.status)}`}>
                    {selectedPayment.status}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Date</p>
                  <p className="text-sm text-slate-900 dark:text-white">{new Date(selectedPayment.time).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {selectedPayment.challengeName && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Challenge</p>
                  <p className="text-sm text-slate-900 dark:text-white">{selectedPayment.challengeName}</p>
                </div>
              )}

              {selectedPayment.invoiceNumber && (
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Invoice</p>
                  <p className="text-sm font-mono text-slate-900 dark:text-white">{selectedPayment.invoiceNumber}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            {selectedPayment.status === 'pending' && (
              <div className="bg-slate-50 dark:bg-slate-800 p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 justify-end">
                <button onClick={() => setShowDetailsModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors">Close</button>
                <button onClick={() => {
                  setShowApproveConfirm(selectedPayment._id);
                }} disabled={actionLoading === selectedPayment._id} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition-colors">Approve</button>
                <button onClick={() => {
                  setShowRejectModal(true);
                }} disabled={actionLoading === selectedPayment._id} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 transition-colors">Reject</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      {showApproveConfirm && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Confirm Approval</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You are about to approve this payment for <strong>{selectedPayment.userEmail}</strong>
            </p>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-600 dark:text-slate-400">Amount to add to balance:</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{(selectedPayment.amount).toLocaleString('en-IN')}</p>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This action will credit the amount to the user's account and cannot be undone. Make sure all details are correct.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowApproveConfirm(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedPayment._id)}
                disabled={actionLoading === selectedPayment._id}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {actionLoading === selectedPayment._id ? '...' : '✓ Approve Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Reject Payment</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Rejecting payment for <strong>{selectedPayment.userEmail}</strong>
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4 border border-red-200 dark:border-red-900/50">
              <p className="text-sm text-red-700 dark:text-red-300">The user will NOT receive these funds (₹{(selectedPayment.amount).toLocaleString('en-IN')}). Please provide a reason for rejection.</p>
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection (required)..."
              className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary mb-6 resize-none"
              rows={4}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedPayment._id)}
                disabled={actionLoading === selectedPayment._id || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {actionLoading === selectedPayment._id ? '...' : '✕ Reject Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPayouts: React.FC = () => {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'processing' | 'paid' | 'rejected'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<{ type: 'reject' | 'paid', payoutId: string } | null>(null);
  const [modalData, setModalData] = useState({ reason: '', transactionRef: '' });

  useEffect(() => {
    fetchPayouts();
  }, [filterStatus]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      const response = await fetch(`/api/admin/payouts-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, status: filterStatus }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch payouts');
      const data = await response.json();
      setPayouts(data.payouts || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'paid' | 'reject', payoutId: string) => {
    try {
      setActionLoading(payoutId);
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      let url = '';
      let body: any = { uid: user.uid };

      if (action === 'approve') {
        url = `/api/admin/payouts/${payoutId}/approve-payout`;
        if (!window.confirm('Approve this payout request?')) throw new Error('Cancelled');
      } else if (action === 'paid') {
        url = `/api/admin/payouts/${payoutId}/mark-paid-new`;
        body.transactionRef = modalData.transactionRef;
      } else {
        url = `/api/admin/payouts/${payoutId}/reject-payout`;
        body.reason = modalData.reason;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Action failed');
      setShowModal(null);
      setModalData({ reason: '', transactionRef: '' });
      await fetchPayouts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    pending: payouts.filter(p => p.status === 'pending').length,
    processing: payouts.filter(p => p.status === 'processing').length,
    paid: payouts.filter(p => p.status === 'paid').length,
    rejected: payouts.filter(p => p.status === 'rejected').length,
  };

  if (loading && payouts.length === 0) {
    return <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign size={28} className="text-primary" />
            Withdrawals & Payouts
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage partner withdrawal requests</p>
        </div>
        <button onClick={fetchPayouts} disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
          <RefreshCw size={16} className={`inline ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400">{error}</div>}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg"><div className="text-2xl font-bold text-blue-600">{stats.pending}</div><div className="text-sm text-blue-700">Pending</div></div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg"><div className="text-2xl font-bold text-yellow-600">{stats.processing}</div><div className="text-sm text-yellow-700">Processing</div></div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"><div className="text-2xl font-bold text-green-600">{stats.paid}</div><div className="text-sm text-green-700">Paid</div></div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg"><div className="text-2xl font-bold text-red-600">{stats.rejected}</div><div className="text-sm text-red-700">Rejected</div></div>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'processing', 'paid', 'rejected'] as const).map(status => (
          <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-lg font-medium text-sm ${filterStatus === status ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr className="border-b">
              <th className="px-4 py-3 text-left">Partner</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Requested</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map(payout => (
              <React.Fragment key={payout._id}>
                <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">{payout.partnerEmail}</td>
                  <td className="px-4 py-3 font-semibold">₹{(payout.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{new Date(payout.requestedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${payout.status === 'pending' ? 'bg-blue-100 text-blue-700' : payout.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : payout.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {payout.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {payout.status === 'pending' && (
                      <button onClick={() => handleAction('approve', payout._id)} disabled={actionLoading === payout._id} className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50">Approve</button>
                    )}
                    {payout.status === 'processing' && (
                      <button onClick={() => setShowModal({ type: 'paid', payoutId: payout._id })} disabled={actionLoading === payout._id} className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:opacity-50">Mark Paid</button>
                    )}
                    {(payout.status === 'pending' || payout.status === 'processing') && (
                      <button onClick={() => setShowModal({ type: 'reject', payoutId: payout._id })} disabled={actionLoading === payout._id} className="ml-1 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50">Reject</button>
                    )}
                    <button onClick={() => setExpandedId(expandedId === payout._id ? null : payout._id)} className="ml-2 text-primary text-xs">Details</button>
                  </td>
                </tr>
                {expandedId === payout._id && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-semibold">Partner:</span> {payout.partnerName}</div>
                        <div><span className="font-semibold">Method:</span> {payout.paymentMethod || 'N/A'}</div>
                        <div><span className="font-semibold">UTR:</span> {payout.transactionRef || 'Pending'}</div>
                        <div><span className="font-semibold">Note:</span> {payout.adminNote || 'N/A'}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              {showModal.type === 'paid' ? 'Mark Payout as Paid' : 'Reject Payout'}
            </h3>
            {showModal.type === 'paid' ? (
              <input type="text" placeholder="UTR / Transaction Reference" value={modalData.transactionRef} onChange={(e) => setModalData({ ...modalData, transactionRef: e.target.value })} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-white mb-4" />
            ) : (
              <textarea value={modalData.reason} onChange={(e) => setModalData({ ...modalData, reason: e.target.value })} placeholder="Reason for rejection..." className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-white mb-4" />
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(null)} className="px-4 py-2 bg-slate-300 dark:bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={() => handleAction(showModal.type === 'paid' ? 'paid' : 'reject', showModal.payoutId)} disabled={actionLoading === showModal.payoutId} className={`px-4 py-2 text-white rounded-lg ${showModal.type === 'paid' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-50`}>
                {showModal.type === 'paid' ? 'Mark Paid' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminPartners: React.FC = () => (
  <AdminPageTemplate
    title="Partners"
    description="Partner management and commissions"
    icon={<BarChart3 size={24} />}
  />
);

export const AdminChallenges: React.FC = () => {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    capital: 0,
    profit_target: 0,
    max_dd: 0,
    daily_dd: 0,
    tag: '',
    recommended: false,
    leverage: 1,
    profit_split: 0,
    min_trading_days: 0,
    max_trading_days: 365,
    max_loss_amount: null,
    daily_loss_limit: null,
    position_size_limit: null,
    max_open_positions: null,
    status: 'active',
  });

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('/api/challenges');
      if (!response.ok) throw new Error('Failed to fetch challenges');
      const data = await response.json();
      setChallenges(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChallenge = async () => {
    if (!formData.name.trim()) {
      setError('Challenge name is required');
      return;
    }
    if (formData.price <= 0) {
      setError('Price must be greater than 0');
      return;
    }

    try {
      setActionLoading('add');
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');

      const response = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, uid: user.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create challenge');
      }

      setShowAddModal(false);
      setFormData({
        name: '',
        price: 0,
        capital: 0,
        profit_target: 0,
        max_dd: 0,
        daily_dd: 0,
        tag: '',
        recommended: false,
        leverage: 1,
        profit_split: 0,
        min_trading_days: 0,
        max_trading_days: 365,
        max_loss_amount: null,
        daily_loss_limit: null,
        position_size_limit: null,
        max_open_positions: null,
        status: 'active',
      });
      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to create challenge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditChallenge = async () => {
    if (!formData.name.trim()) {
      setError('Challenge name is required');
      return;
    }

    try {
      setActionLoading('edit');
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');

      const response = await fetch(`/api/challenges/${editingChallenge._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, uid: user.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update challenge');
      }

      setShowEditModal(false);
      setEditingChallenge(null);
      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to update challenge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteChallenge = async (id: string, name: string) => {
    if (!window.confirm(`Delete challenge "${name}"? This cannot be undone.`)) return;

    try {
      setActionLoading(id);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');

      const response = await fetch(`/api/challenges/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete challenge');
      }

      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to delete challenge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (challenge: any) => {
    try {
      setActionLoading(challenge._id);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      const newStatus = challenge.status === 'active' ? 'inactive' : 'active';

      const response = await fetch(`/api/challenges/${challenge._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, uid: user.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update challenge status');
      }

      await fetchChallenges();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && challenges.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={28} className="text-primary" />
            Challenge Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage trading challenges and risk parameters</p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setFormData({
              name: '',
              price: 0,
              capital: 0,
              profit_target: 0,
              max_dd: 0,
              daily_dd: 0,
              tag: '',
              recommended: false,
              leverage: 1,
              profit_split: 0,
              min_trading_days: 0,
              max_trading_days: 365,
              max_loss_amount: null,
              daily_loss_limit: null,
              position_size_limit: null,
              max_open_positions: null,
              status: 'active',
            });
          }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
        >
          + Add Challenge
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Challenges Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {challenges.length === 0 ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">
            No challenges found. Create your first challenge to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Price</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Capital</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Max DD %</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Status</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-slate-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {challenges.map((challenge) => (
                  <tr key={challenge._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-semibold">{challenge.name}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">₹{challenge.price?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">₹{challenge.capital?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{challenge.max_dd}%</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          challenge.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {challenge.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingChallenge(challenge);
                          setFormData(challenge);
                          setShowEditModal(true);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                        disabled={actionLoading === challenge._id}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(challenge)}
                        className="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600 transition-colors"
                        disabled={actionLoading === challenge._id}
                      >
                        {challenge.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteChallenge(challenge._id, challenge.name)}
                        className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                        disabled={actionLoading === challenge._id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Challenge Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add New Challenge</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Challenge Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                    placeholder="e.g., Gold Challenge"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Price *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Trading Capital *</label>
                  <input
                    type="number"
                    value={formData.capital}
                    onChange={(e) => setFormData({ ...formData, capital: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Profit Target %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.profit_target}
                    onChange={(e) => setFormData({ ...formData, profit_target: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Max Drawdown %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.max_dd}
                    onChange={(e) => setFormData({ ...formData, max_dd: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Daily Drawdown %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.daily_dd}
                    onChange={(e) => setFormData({ ...formData, daily_dd: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Leverage</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.leverage}
                    onChange={(e) => setFormData({ ...formData, leverage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Profit Split %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.profit_split}
                    onChange={(e) => setFormData({ ...formData, profit_split: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Min Trading Days</label>
                  <input
                    type="number"
                    value={formData.min_trading_days}
                    onChange={(e) => setFormData({ ...formData, min_trading_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Max Trading Days</label>
                  <input
                    type="number"
                    value={formData.max_trading_days}
                    onChange={(e) => setFormData({ ...formData, max_trading_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Tag</label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                    placeholder="e.g., Beginner, Advanced"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recommended"
                  checked={formData.recommended}
                  onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="recommended" className="text-slate-900 dark:text-white">
                  Recommended Challenge
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChallenge}
                disabled={actionLoading === 'add'}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add' ? 'Creating...' : 'Create Challenge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Challenge Modal */}
      {showEditModal && editingChallenge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Challenge</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Challenge Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Price</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Trading Capital</label>
                  <input
                    type="number"
                    value={formData.capital}
                    onChange={(e) => setFormData({ ...formData, capital: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Profit Target %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.profit_target}
                    onChange={(e) => setFormData({ ...formData, profit_target: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Max Drawdown %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.max_dd}
                    onChange={(e) => setFormData({ ...formData, max_dd: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Daily Drawdown %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.daily_dd}
                    onChange={(e) => setFormData({ ...formData, daily_dd: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Leverage</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.leverage}
                    onChange={(e) => setFormData({ ...formData, leverage: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Profit Split %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.profit_split}
                    onChange={(e) => setFormData({ ...formData, profit_split: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Min Trading Days</label>
                  <input
                    type="number"
                    value={formData.min_trading_days}
                    onChange={(e) => setFormData({ ...formData, min_trading_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Max Trading Days</label>
                  <input
                    type="number"
                    value={formData.max_trading_days}
                    onChange={(e) => setFormData({ ...formData, max_trading_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Tag</label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recommended-edit"
                  checked={formData.recommended}
                  onChange={(e) => setFormData({ ...formData, recommended: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="recommended-edit" className="text-slate-900 dark:text-white">
                  Recommended Challenge
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditChallenge}
                disabled={actionLoading === 'edit'}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'edit' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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


export const AdminRiskManagement: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  
  const [riskSettings, setRiskSettings] = useState({
    max_dd: null as number | null,
    daily_dd: null as number | null,
    max_loss_amount: null as number | null,
    daily_loss_limit: null as number | null,
    position_size_limit: null as number | null,
    max_open_positions: null as number | null,
    leverage_limit: null as number | null,
    trading_permissions: 'unrestricted',
    risk_status: 'normal',
    custom_risk_rules: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, page: 1, limit: 10000 }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      setClients(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const openRiskSettings = async (client: any) => {
    try {
      setActionLoading('loading-risk');
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/risk-management/${client._id}?uid=${user.uid}`);
      if (!response.ok) throw new Error('Failed to fetch risk settings');
      
      const settings = await response.json();
      setSelectedClient(client);
      setRiskSettings({
        max_dd: settings.max_dd || null,
        daily_dd: settings.daily_dd || null,
        max_loss_amount: settings.max_loss_amount || null,
        daily_loss_limit: settings.daily_loss_limit || null,
        position_size_limit: settings.position_size_limit || null,
        max_open_positions: settings.max_open_positions || null,
        leverage_limit: settings.leverage_limit || null,
        trading_permissions: settings.trading_permissions || 'unrestricted',
        risk_status: settings.risk_status || 'normal',
        custom_risk_rules: settings.custom_risk_rules || '',
      });
      setShowRiskModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load risk settings');
    } finally {
      setActionLoading(null);
    }
  };

  const saveRiskSettings = async () => {
    if (!selectedClient) return;

    try {
      setActionLoading('save-risk');
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/risk-management/${selectedClient._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...riskSettings, uid: user.uid }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save risk settings');
      }

      setShowRiskModal(false);
      setSelectedClient(null);
      alert('Risk settings updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save risk settings');
    } finally {
      setActionLoading(null);
    }
  };

  const resetToDefaults = async () => {
    if (!window.confirm('Reset this user\'s risk settings to challenge defaults?')) return;

    try {
      setActionLoading('reset-risk');
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      
      const response = await fetch(`/api/admin/risk-management/${selectedClient._id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to reset risk settings');

      setShowRiskModal(false);
      setSelectedClient(null);
      alert('Risk settings reset to challenge defaults');
    } catch (err: any) {
      setError(err.message || 'Failed to reset risk settings');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredClients = clients.filter(c => 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle size={28} className="text-primary" />
          User Risk Management
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Configure individual risk parameters per user/account</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
        />
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">
            {searchTerm ? 'No matching clients found' : 'No clients found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Challenge</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-slate-900 dark:text-white">Status</th>
                  <th className="px-6 py-3 text-center text-sm font-bold text-slate-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredClients.map((client) => (
                  <tr key={client._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-900 dark:text-white">{client.email}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{client.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{client.currentChallengeName || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          client.accountStatus === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {client.accountStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openRiskSettings(client)}
                        disabled={actionLoading?.startsWith('loading') || actionLoading === 'save-risk'}
                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'loading-risk' ? 'Loading...' : 'Configure Risk'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Risk Settings Modal */}
      {showRiskModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Risk Settings</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedClient.email}</p>
              </div>
              <button
                onClick={() => setShowRiskModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Challenge Info */}
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3">Current Challenge</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {selectedClient.currentChallengeName || 'No challenge assigned'}
                </p>
              </div>

              {/* Risk Settings */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white">Custom Risk Parameters</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Leave blank to use challenge defaults</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Max Overall Drawdown %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskSettings.max_dd ?? ''}
                      onChange={(e) => setRiskSettings({ ...riskSettings, max_dd: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Daily Drawdown %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskSettings.daily_dd ?? ''}
                      onChange={(e) => setRiskSettings({ ...riskSettings, daily_dd: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Max Loss Amount (₹)</label>
                    <input
                      type="number"
                      value={riskSettings.max_loss_amount ?? ''}
                      onChange={(e) => setRiskSettings({ ...riskSettings, max_loss_amount: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., 50000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Daily Loss Limit (₹)</label>
                    <input
                      type="number"
                      value={riskSettings.daily_loss_limit ?? ''}
                      onChange={(e) => setRiskSettings({ ...riskSettings, daily_loss_limit: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., 10000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Position Size Limit (₹)</label>
                    <input
                      type="number"
                      value={riskSettings.position_size_limit ?? ''}
                      onChange={(e) => setRiskSettings({ ...riskSettings, position_size_limit: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., 100000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Max Open Positions</label>
                    <input
                      type="number"
                      value={riskSettings.max_open_positions ?? ''}
                      onChange={(e) => setRiskSettings({ ...riskSettings, max_open_positions: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., 5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Leverage Limit</label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskSettings.leverage_limit ?? ''}
                      onChange={(e) => setRiskSettings({ ...riskSettings, leverage_limit: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                      placeholder="e.g., 1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Risk Status</label>
                    <select
                      value={riskSettings.risk_status}
                      onChange={(e) => setRiskSettings({ ...riskSettings, risk_status: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="restricted">Restricted</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Custom Risk Rules / Notes</label>
                  <textarea
                    value={riskSettings.custom_risk_rules}
                    onChange={(e) => setRiskSettings({ ...riskSettings, custom_risk_rules: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-800 dark:text-white"
                    placeholder="Add any custom risk rules or admin notes here..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 justify-between sticky bottom-0 bg-white dark:bg-slate-900">
              <button
                onClick={resetToDefaults}
                disabled={actionLoading === 'reset-risk'}
                className="px-4 py-2 border border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'reset-risk' ? 'Resetting...' : 'Reset to Challenge Defaults'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRiskModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRiskSettings}
                  disabled={actionLoading === 'save-risk'}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'save-risk' ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

