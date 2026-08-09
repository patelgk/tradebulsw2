import React, { useEffect, useState } from 'react';
import { Copy, CheckCircle2, AlertCircle, TrendingUp, Users, DollarSign, Link2, Lock } from 'lucide-react';
import { api } from '../api';

export default function PartnerDashboard({ user }: { user: any }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ clicks: 0, signups: 0, earnings: 0 });
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Partner details from user
  const partnerCode = user?.partnerCode || user?.referralCode || `PARTNER_${user?.uid?.slice(0, 8).toUpperCase() || 'XXXXX'}`;
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${encodeURIComponent(partnerCode)}`;
  const partnerName = user?.name || 'Partner';

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const loadData = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load referrals data
      const referralData = await api.getPartnerReferrals(user.uid);
      if (referralData && Array.isArray(referralData)) {
        setReferrals(referralData);
        const clicks = referralData.filter((r: any) => r.type === 'click').length;
        const signups = referralData.filter((r: any) => r.type === 'signup').length;
        setStats({ clicks, signups, earnings: signups * 100 }); // 100 per signup as default
      }
    } catch (err: any) {
      console.error('Error loading partner data:', err);
      setError(null); // Don't show error, just use empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.uid]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 md:pb-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-black tracking-tight mb-2">Partner Portal</h1>
        <p className="text-slate-500 text-lg">Welcome, <span className="font-bold text-slate-700 dark:text-slate-300">{partnerName}</span></p>
      </div>

      {/* Referral Link Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Referral Link Card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-3xl border-2 border-primary/30 dark:border-primary/40 p-8 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/20 rounded-2xl">
              <Link2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Referral Link</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Share to earn commissions</p>
            </div>
          </div>
          <div className="flex gap-2 flex-col">
            <input
              readOnly
              value={referralLink}
              className="w-full px-4 py-3 bg-white/50 dark:bg-white/10 border border-primary/30 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 truncate"
            />
            <button
              onClick={() => copyToClipboard(referralLink, 'link')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition active:scale-95"
            >
              {copiedLink ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Partner Code Card */}
        <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/10 dark:to-white/5 rounded-3xl border-2 border-slate-200 dark:border-white/20 p-8 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-slate-200 dark:bg-white/20 rounded-2xl">
              <Lock className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Partner Code</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Your unique identifier</p>
            </div>
          </div>
          <div className="flex gap-2 flex-col">
            <input
              readOnly
              value={partnerCode}
              className="w-full px-4 py-3 bg-white/50 dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-xl text-sm font-bold font-mono text-slate-700 dark:text-slate-300"
            />
            <button
              onClick={() => copyToClipboard(partnerCode, 'code')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-white/20 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-300 dark:hover:bg-white/30 transition active:scale-95"
            >
              {copiedCode ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Code
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Clicks */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-40 dark:from-blue-500/20 dark:to-blue-500/10 rounded-3xl border-2 border-blue-200 dark:border-blue-500/30 p-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-500/30 rounded-2xl">
              <TrendingUp className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Clicks</p>
              <p className="text-4xl font-black text-blue-700 dark:text-blue-300 mt-1">{stats.clicks}</p>
            </div>
          </div>
        </div>

        {/* Total Signups */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-40 dark:from-emerald-500/20 dark:to-emerald-500/10 rounded-3xl border-2 border-emerald-200 dark:border-emerald-500/30 p-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-500/30 rounded-2xl">
              <Users className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Signups</p>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{stats.signups}</p>
            </div>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-3xl border-2 border-primary/30 dark:border-primary/40 p-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-primary/20 rounded-2xl">
              <DollarSign className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider">Total Earnings</p>
              <p className="text-4xl font-black text-primary mt-1">₹{stats.earnings.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referred Users Section */}
      <div className="bg-white dark:bg-white/5 rounded-3xl border-2 border-slate-200 dark:border-white/10 p-8 space-y-6">
        <div>
          <h2 className="text-2xl font-black mb-1">Your Referred Users</h2>
          <p className="text-slate-500">List of users who signed up using your referral link</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-slate-500 text-lg">Loading...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-slate-100 dark:bg-white/10 rounded-full mb-4">
              <Users className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-slate-500 text-lg font-semibold mb-2">No referrals yet</p>
            <p className="text-slate-400 mb-6">Share your referral link to start earning</p>
            <button
              onClick={() => copyToClipboard(referralLink, 'link')}
              className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition"
            >
              Copy Link Again
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    {ref.userId ? `User ${ref.userId.slice(0, 8)}...` : 'Site Visitor'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{new Date(ref.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  ref.userId 
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                }`}>
                  {ref.userId ? 'Signed Up' : 'Clicked'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-500/10 rounded-3xl border-2 border-blue-200 dark:border-blue-500/30 p-8 flex gap-4">
        <AlertCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
        <div>
          <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">How to Earn</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Share your referral link with friends and earn ₹100 for each successful signup. The more people you refer, the more you earn!
          </p>
        </div>
      </div>
    </div>
  );
}
