/**
 * AdminDashboard - Main admin dashboard
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, CreditCard, DollarSign, TrendingUp, Activity, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeTraders: number;
  totalRevenue: number;
  totalPayouts: number;
  totalPayoutAmount?: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeTraders: 0,
    totalRevenue: 0,
    totalPayouts: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError('');
        const user = JSON.parse(localStorage.getItem('trader_user') || '{}');
        const response = await fetch('/api/admin/stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }
        
        const data = await response.json();
        setStats({
          totalUsers: data.totalUsers || 0,
          activeTraders: data.activeTraders || 0,
          totalRevenue: data.totalRevenue || 0,
          totalPayouts: data.totalPayoutAmount || 0,
        });
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { label: 'Active Traders', value: stats.activeTraders, icon: Activity, color: 'green' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'emerald' },
    { label: 'Total Payouts', value: `₹${stats.totalPayouts.toLocaleString()}`, icon: CreditCard, color: 'purple' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Error loading statistics</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Welcome to Proprupee Administration</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const colorClass = {
            blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
            green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
            emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
            purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
          }[card.color as keyof typeof colorClass];

          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${colorClass}`}>
                  <Icon size={24} />
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 flex items-center gap-1">
                <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
                +12% from last month
              </p>
            </div>
          );
        })}
      </div>

      {/* Activity Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div>
                <p className="font-medium text-slate-900 dark:text-white text-sm">
                  User {1000 + i} purchased a challenge
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  2 hours ago
                </p>
              </div>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{(Math.random() * 50000 + 5000).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
