const API_BASE = '/api';

export const api = {
  // Users
  async getUser(uid: string) {
    const res = await fetch(`${API_BASE}/users/${uid}`);
    if (!res.ok) throw new Error('User not found');
    return res.json();
  },
  async upsertUser(data: any) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getClients() {
    const res = await fetch(`${API_BASE}/users`);
    return res.json();
  },

  // Trades
  async getTrades(userId?: string) {
    const url = userId ? `${API_BASE}/trades?userId=${userId}` : `${API_BASE}/trades`;
    const res = await fetch(url);
    return res.json();
  },
  async addTrade(data: any) {
    const res = await fetch(`${API_BASE}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateTrade(id: string, data: any) {
    const res = await fetch(`${API_BASE}/trades/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Challenges
  async getChallenges() {
    const res = await fetch(`${API_BASE}/challenges`);
    return res.json();
  },
  async upsertChallenge(data: any) {
    const res = await fetch(`${API_BASE}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteChallenge(id: string) {
    const res = await fetch(`${API_BASE}/challenges/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Rules
  async getRules() {
    const res = await fetch(`${API_BASE}/rules`);
    return res.json();
  },
  async upsertRule(data: any) {
    const res = await fetch(`${API_BASE}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteRule(id: string) {
    const res = await fetch(`${API_BASE}/rules/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },

  // Settings
  async getSettings(id: string) {
    const res = await fetch(`${API_BASE}/settings/${id}`);
    return res.json();
  },
  async updateSettings(id: string, data: any) {
    const res = await fetch(`${API_BASE}/settings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Transactions
  async getTransactions(userId?: string) {
    const url = userId ? `${API_BASE}/transactions?userId=${userId}` : `${API_BASE}/transactions`;
    const res = await fetch(url);
    return res.json();
  },
  async addTransaction(data: any) {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  
  // Auth
  async login(credentials: any) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Login failed');
    }
    return res.json();
  },
  async signup(data: any) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Signup failed');
    }
    return res.json();
  },
  async adminLogin(mobile: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Admin login failed');
    }
    return res.json();
  }
};
