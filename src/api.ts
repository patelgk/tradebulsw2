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
  async getTransactions(userId?: string) {
    const url = userId ? `${API_BASE}/transactions?userId=${userId}` : `${API_BASE}/transactions`;
    return safeFetch(url);
  },
  async addTransaction(data: any) {
    return safeFetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
