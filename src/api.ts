const API_BASE = '/api';

async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!res.ok) {
      if (isJson) {
        const error = await res.json();
        throw new Error(error.error || error.message || `Request failed with status ${res.status}`);
      }
      throw new Error(`Request failed with status ${res.status}`);
    }

    if (isJson) {
      return res.json();
    }
    
    // If we expected JSON but got something else
    const text = await res.text();
    if (text.toLowerCase().includes('<!doctype html>')) {
      throw new Error('Received HTML instead of JSON (server might be starting up)');
    }
    return text;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
}

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    q.set(key, String(value));
  }
  const query = q.toString();
  return query ? `?${query}` : '';
}

export const api = {
  // Users
  async getUser(uid: string) {
    return safeFetch(`${API_BASE}/users/${uid}`);
  },
  async upsertUser(data: any) {
    return safeFetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async getClients() {
    return safeFetch(`${API_BASE}/users`);
  },

  // Trades
  async getTrades(userId?: string) {
    const url = userId ? `${API_BASE}/trades?userId=${userId}` : `${API_BASE}/trades`;
    return safeFetch(url);
  },
  async addTrade(data: any) {
    return safeFetch(`${API_BASE}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async updateTrade(id: string, data: any) {
    return safeFetch(`${API_BASE}/trades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Challenges
  async getChallenges() {
    return safeFetch(`${API_BASE}/challenges`);
  },
  async upsertChallenge(data: any) {
    return safeFetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async deleteChallenge(id: string) {
    return safeFetch(`${API_BASE}/challenges/${id}`, {
      method: 'DELETE',
    });
  },

  // Rules
  async getRules() {
    return safeFetch(`${API_BASE}/rules`);
  },
  async upsertRule(data: any) {
    return safeFetch(`${API_BASE}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async deleteRule(id: string) {
    return safeFetch(`${API_BASE}/rules/${id}`, {
      method: 'DELETE',
    });
  },

  // Settings
  async getSettings(id: string) {
    return safeFetch(`${API_BASE}/settings/${id}`);
  },
  async updateSettings(id: string, data: any) {
    return safeFetch(`${API_BASE}/settings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Transactions
  async getTransactions(userId?: string, status?: string) {
    const params: any = {};
    if (userId) params.userId = userId;
    if (status) params.status = status;
    const query = toQuery(params);
    return safeFetch(`${API_BASE}/transactions${query}`);
  },
  async addTransaction(data: any) {
    return safeFetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async updateTransaction(id: string, data: any) {
    return safeFetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async getChallengePurchases() {
    return safeFetch(`${API_BASE}/challenge-purchases`);
  },
  async approvePurchase(id: string, adminId = 'admin') {
    return safeFetch(`${API_BASE}/challenge-purchases/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId }),
    });
  },
  async rejectPurchase(id: string, reason?: string, adminId = 'admin') {
    return safeFetch(`${API_BASE}/challenge-purchases/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, adminId }),
    });
  },
  async adjustFunds(data: { userId: string; type: 'credit' | 'debit'; amount: number; reason?: string; referenceId?: string; adminId?: string }) {
    return safeFetch(`${API_BASE}/funds/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async getFundHistory(userId?: string) {
    const query = toQuery(userId ? { userId } : {});
    return safeFetch(`${API_BASE}/fund-history${query}`);
  },
  async getNotifications(userId?: string) {
    const query = toQuery(userId ? { userId } : {});
    return safeFetch(`${API_BASE}/notifications${query}`);
  },
  async markNotificationRead(id: string) {
    return safeFetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST',
    });
  },

  // Withdraw
  async withdraw(data: { userId: string; amount: number; method?: string }) {
    return safeFetch(`${API_BASE}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  // Market
  async getMarketQuotes(minimal = false) {
    return safeFetch(`${API_BASE}/market/quotes${minimal ? '?minimal=true' : ''}`);
  },
  async updateExpiry(symbol: string, expiry: string) {
    return safeFetch(`${API_BASE}/market/expiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, expiry }),
    });
  },
  async getChartHistory(params: {
    symbol?: string;
    securityId?: string;
    exchangeSegment?: 'IDX_I' | 'NSE_FNO';
    instrument?: 'INDEX' | 'OPTIDX';
    timeframe: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '1D';
    date?: string;
  }) {
    return safeFetch(`${API_BASE}/chart/history${toQuery(params)}`);
  },
  
  // Auth
  async login(credentials: any) {
    return safeFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  },
  async signup(data: any) {
    return safeFetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async partnerSignup(data: any) {
    // Add isPartner flag to trigger partner flow in signup endpoint
    return safeFetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, isPartner: true }),
    });
  },
  async validateReferral(code: string) {
    return safeFetch(`${API_BASE}/referral/validate?code=${encodeURIComponent(code)}`);
  },
  async recordReferralClick(data: any) {
    return safeFetch(`${API_BASE}/referral/click`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
  },
  async applyPartner(data: any) {
    return safeFetch(`${API_BASE}/partners/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async getPartners(uid?: string) {
    const q = uid ? `?uid=${encodeURIComponent(uid)}` : '';
    return safeFetch(`${API_BASE}/partners${q}`);
  },
  async approvePartner(id: string, uid: string) {
    return safeFetch(`${API_BASE}/partners/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid }) });
  },
  async getPartnerCommissions(uid: string) {
    return safeFetch(`${API_BASE}/partner/commissions?uid=${encodeURIComponent(uid)}`);
  },
  async getPartnerReferrals(uid: string) {
    return safeFetch(`${API_BASE}/partner/referrals?uid=${encodeURIComponent(uid)}`);
  },
  async requestPartnerPayout(data: any) {
    return safeFetch(`${API_BASE}/partner/payouts/request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  },
  async getPartnerPayouts(uid: string) {
    return safeFetch(`${API_BASE}/partner/payouts?uid=${encodeURIComponent(uid)}`);
  },
  async getAdminPayouts(uid: string) {
    return safeFetch(`${API_BASE}/admin/payouts?uid=${encodeURIComponent(uid)}`);
  },
  async getAllPayouts() {
    return safeFetch(`${API_BASE}/admin/payouts`);
  },
  async markPayoutPaid(id: string, uid: string, transactionRef: string) {
    return safeFetch(`${API_BASE}/admin/payouts/${id}/mark-paid`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, transactionRef }) });
  },
  async rejectPayout(id: string, uid: string, adminNote?: string) {
    return safeFetch(`${API_BASE}/admin/payouts/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, adminNote }) });
  },
  async adminLogin(mobile: string, password: string) {
    return safeFetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    });
  },
  async forgotPassword(data: { email?: string, mobile?: string }) {
    return safeFetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
};
