/**
 * AdminLogin - Dedicated admin login page
 * 
 * Separate from user trading login
 * Only allows users with admin/super_admin roles
 */

import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Loader } from 'lucide-react';
import { api } from '../api';

interface AdminLoginProps {
  onLoginSuccess: (user: any) => void;
  onError: (message: string) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Login with credentials
      const userData = await api.login({ email, password });

      // Check if user has admin role
      const adminRoles = ['admin', 'super_admin'];
      if (!adminRoles.includes(userData.role)) {
        throw new Error('This account does not have admin access. Please contact support.');
      }

      // Success - store and redirect
      localStorage.setItem('trader_user', JSON.stringify(userData));
      onLoginSuccess(userData);
    } catch (err: any) {
      const message = err.message || 'Login failed. Please try again.';
      setError(message);
      onError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl -top-20 -right-20" />
        <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -bottom-20 -left-20" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-white/10 dark:border-slate-700/50 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-black text-white">Admin Login</h1>
            </div>
            <p className="text-slate-300 text-sm">
              Secure access to Proprupee administration panel
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@proprupee.com"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-4 py-3 bg-primary text-white font-bold rounded-lg hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader size={18} className="animate-spin" />}
              {loading ? 'Signing In...' : 'Sign In as Admin'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-slate-400">
              For security inquiries, contact{' '}
              <a href="mailto:admin@proprupee.com" className="text-primary hover:underline">
                admin@proprupee.com
              </a>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck size={14} />
            Secure, encrypted connection
          </p>
        </div>
      </div>
    </div>
  );
};
