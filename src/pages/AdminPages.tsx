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
                        <td colSpan={7} className="px-6 py-6">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">User ID</p>
                              <p className="font-mono text-sm text-slate-900 dark:text-white break-all">{client.uid}</p>
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
                              <div className="flex gap-2">
                                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                  <Eye size={14} />
                                  View Details
                                </button>
                                {client.accountStatus !== 'suspended' && (
                                  <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                                    <Ban size={14} />
                                    Suspend
                                  </button>
                                )}
                              </div>
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

export const AdminPayments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [filterStatus]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      const response = await fetch(`/api/admin/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, status: filterStatus }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    if (!window.confirm('Approve this payment?')) return;
    try {
      setActionLoading(paymentId);
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      const response = await fetch(`/api/admin/payments/${paymentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to approve payment');
      await fetchPayments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      setActionLoading(paymentId);
      const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
      const response = await fetch(`/api/admin/payments/${paymentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, reason: rejectReason }),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to reject payment');
      setShowRejectModal(null);
      setRejectReason('');
      await fetchPayments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    pending: payments.filter(p => p.status === 'pending').length,
    approved: payments.filter(p => p.status === 'approved').length,
    rejected: payments.filter(p => p.status === 'rejected').length,
  };

  if (loading && payments.length === 0) {
    return <div className="flex justify-center p-8"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard size={28} className="text-primary" />
            Payments & Deposits
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage user payment approvals</p>
        </div>
        <button onClick={fetchPayments} disabled={loading} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50">
          <RefreshCw size={16} className={`inline ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400">{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg"><div className="text-2xl font-bold text-blue-600">{stats.pending}</div><div className="text-sm text-blue-700 dark:text-blue-300">Pending</div></div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg"><div className="text-2xl font-bold text-green-600">{stats.approved}</div><div className="text-sm text-green-700 dark:text-green-300">Approved</div></div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg"><div className="text-2xl font-bold text-red-600">{stats.rejected}</div><div className="text-sm text-red-700 dark:text-red-300">Rejected</div></div>
      </div>

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-lg font-medium text-sm ${filterStatus === status ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr className="border-b">
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(payment => (
              <React.Fragment key={payment._id}>
                <tr className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">{payment.userEmail}</td>
                  <td className="px-4 py-3 font-semibold">₹{(payment.amount || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{new Date(payment.time).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${payment.status === 'pending' ? 'bg-blue-100 text-blue-700' : payment.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {payment.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {payment.status === 'pending' && (
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleApprove(payment._id)} disabled={actionLoading === payment._id} className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50">Approve</button>
                        <button onClick={() => setShowRejectModal(payment._id)} disabled={actionLoading === payment._id} className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:opacity-50">Reject</button>
                      </div>
                    )}
                    <button onClick={() => setExpandedId(expandedId === payment._id ? null : payment._id)} className="text-primary hover:underline text-xs">Details</button>
                  </td>
                </tr>
                {expandedId === payment._id && (
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><span className="font-semibold">Name:</span> {payment.userName}</div>
                        <div><span className="font-semibold">Type:</span> {payment.type}</div>
                        <div><span className="font-semibold">Reference:</span> {payment.paymentReference || 'N/A'}</div>
                        <div><span className="font-semibold">Plan:</span> {payment.planName || 'N/A'}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Reject Payment</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:text-white mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="px-4 py-2 bg-slate-300 dark:bg-slate-700 rounded-lg">Cancel</button>
              <button onClick={() => handleReject(showRejectModal)} disabled={actionLoading === showRejectModal} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">Reject</button>
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
