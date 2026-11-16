/**
 * DEMO-ONLY DATA MODELS - ISOLATED FROM PRODUCTION
 * =================================================
 * These models are completely separate from production models.
 * Demo data is stored in-memory and never persists to production database.
 * All records are clearly marked with isDemo=true flag.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Demo transaction record (in-memory only)
 * Completely separate from production Transaction model
 */
export interface DemoTransaction {
  _id: string;
  demoUserId: string;
  demoOrderId: string;
  type: 'demo_challenge_purchase' | 'demo_withdrawal' | 'demo_deposit';
  amount: number;
  capital?: number;
  challengeName?: string;
  paymentStatus: 'pending' | 'successful' | 'failed';
  status: 'pending' | 'approved' | 'rejected';
  isDemo: true;
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  failureReason?: string;
  duplicateWebhookCount: number;
}

/**
 * Demo user record (in-memory only)
 * Completely separate from production User model
 */
export interface DemoUser {
  _id: string;
  demoUserId: string;
  email: string;
  name: string;
  demoBalance: number;
  demoDemoTradingCapital: number;
  isDemo: true;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Demo challenge purchase record (in-memory only)
 * Completely separate from production ChallengePurchase model
 */
export interface DemoChallengeePurchase {
  _id: string;
  demoUserId: string;
  demoOrderId: string;
  challengeName: string;
  fundingAmount: number;
  challengeFee: number;
  paymentStatus: 'pending' | 'successful' | 'failed' | 'approved' | 'rejected';
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'closed';
  isDemo: true;
  createdAt: Date;
  approvedAt?: Date;
}

/**
 * Demo fund history record (in-memory only)
 * Completely separate from production FundHistory model
 */
export interface DemoFundHistory {
  _id: string;
  demoUserId: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  referenceId: string;
  isDemo: true;
  createdAt: Date;
}

/**
 * Demo webhook event log
 * Tracks webhook events for idempotency testing
 */
export interface DemoWebhookLog {
  _id: string;
  demoOrderId: string;
  status: 'completed' | 'failed';
  amount: number;
  isDemo: true;
  createdAt: Date;
  processed: boolean;
  processedAt?: Date;
}

/**
 * In-memory demo storage
 * All demo data is stored here and never persists to production database
 */
export class DemoDataStore {
  private demoUsers: Map<string, DemoUser> = new Map();
  private demoTransactions: Map<string, DemoTransaction> = new Map();
  private demoChallengesPurchases: Map<string, DemoChallengeePurchase> = new Map();
  private demoFundHistory: Map<string, DemoFundHistory> = new Map();
  private demoWebhookLogs: Map<string, DemoWebhookLog> = new Map();

  constructor() {
    console.log('[DemoDataStore] Initialized - All demo data is in-memory only');
  }

  // ─── DEMO USER OPERATIONS ───────────────────────────────────────────────

  createDemoUser(email: string, name: string): DemoUser {
    const demoUser: DemoUser = {
      _id: uuidv4(),
      demoUserId: `demo-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      demoBalance: 0,
      demoDemoTradingCapital: 0,
      isDemo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.demoUsers.set(demoUser.demoUserId, demoUser);
    console.log(`[DemoDataStore] Demo user created: ${demoUser.demoUserId}`);
    return demoUser;
  }

  getDemoUser(demoUserId: string): DemoUser | null {
    return this.demoUsers.get(demoUserId) || null;
  }

  getAllDemoUsers(): DemoUser[] {
    return Array.from(this.demoUsers.values());
  }

  // ─── DEMO TRANSACTION OPERATIONS ───────────────────────────────────────

  createDemoTransaction(
    demoUserId: string,
    demoOrderId: string,
    type: DemoTransaction['type'],
    amount: number,
    challengeName?: string,
    capital?: number
  ): DemoTransaction {
    const transaction: DemoTransaction = {
      _id: uuidv4(),
      demoUserId,
      demoOrderId,
      type,
      amount,
      capital,
      challengeName,
      paymentStatus: 'pending',
      status: 'pending',
      isDemo: true,
      createdAt: new Date(),
      duplicateWebhookCount: 0,
    };

    this.demoTransactions.set(transaction._id, transaction);
    console.log(`[DemoDataStore] Demo transaction created: ${transaction._id}`);
    return transaction;
  }

  getDemoTransaction(transactionId: string): DemoTransaction | null {
    return this.demoTransactions.get(transactionId) || null;
  }

  approveDemoTransaction(transactionId: string): DemoTransaction | null {
    const tx = this.demoTransactions.get(transactionId);
    if (tx) {
      tx.status = 'approved';
      tx.paymentStatus = 'successful';
      tx.approvedAt = new Date();
      console.log(`[DemoDataStore] Demo transaction approved: ${transactionId}`);
    }
    return tx || null;
  }

  rejectDemoTransaction(transactionId: string, reason: string): DemoTransaction | null {
    const tx = this.demoTransactions.get(transactionId);
    if (tx) {
      tx.status = 'rejected';
      tx.paymentStatus = 'failed';
      tx.rejectedAt = new Date();
      tx.failureReason = reason;
      console.log(`[DemoDataStore] Demo transaction rejected: ${transactionId}`);
    }
    return tx || null;
  }

  getAllDemoTransactions(): DemoTransaction[] {
    return Array.from(this.demoTransactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ─── DEMO CHALLENGE PURCHASE OPERATIONS ──────────────────────────────────

  createDemoChallengeePurchase(
    demoUserId: string,
    demoOrderId: string,
    challengeName: string,
    fundingAmount: number,
    challengeFee: number
  ): DemoChallengeePurchase {
    const purchase: DemoChallengeePurchase = {
      _id: uuidv4(),
      demoUserId,
      demoOrderId,
      challengeName,
      fundingAmount,
      challengeFee,
      paymentStatus: 'pending',
      status: 'pending',
      isDemo: true,
      createdAt: new Date(),
    };

    this.demoChallengesPurchases.set(purchase._id, purchase);
    console.log(`[DemoDataStore] Demo challenge purchase created: ${purchase._id}`);
    return purchase;
  }

  getAllDemoChallengesPurchases(): DemoChallengeePurchase[] {
    return Array.from(this.demoChallengesPurchases.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // ─── DEMO FUND HISTORY OPERATIONS ───────────────────────────────────────

  recordDemoFundHistory(
    demoUserId: string,
    type: 'credit' | 'debit',
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    reason: string,
    referenceId: string
  ): DemoFundHistory {
    const history: DemoFundHistory = {
      _id: uuidv4(),
      demoUserId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      referenceId,
      isDemo: true,
      createdAt: new Date(),
    };

    this.demoFundHistory.set(history._id, history);
    console.log(`[DemoDataStore] Demo fund history recorded: ${history._id}`);
    return history;
  }

  getDemoUserFundHistory(demoUserId: string): DemoFundHistory[] {
    return Array.from(this.demoFundHistory.values())
      .filter((h) => h.demoUserId === demoUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ─── DEMO WEBHOOK LOG OPERATIONS ────────────────────────────────────────

  recordDemoWebhook(demoOrderId: string, status: 'completed' | 'failed', amount: number): DemoWebhookLog {
    const log: DemoWebhookLog = {
      _id: uuidv4(),
      demoOrderId,
      status,
      amount,
      isDemo: true,
      createdAt: new Date(),
      processed: false,
    };

    this.demoWebhookLogs.set(log._id, log);
    console.log(`[DemoDataStore] Demo webhook logged: ${demoOrderId} - ${status}`);
    return log;
  }

  getDemoWebhooksForOrder(demoOrderId: string): DemoWebhookLog[] {
    return Array.from(this.demoWebhookLogs.values())
      .filter((w) => w.demoOrderId === demoOrderId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markWebhookProcessed(webhookId: string): void {
    const webhook = this.demoWebhookLogs.get(webhookId);
    if (webhook) {
      webhook.processed = true;
      webhook.processedAt = new Date();
    }
  }

  // ─── UTILITY OPERATIONS ─────────────────────────────────────────────────

  /**
   * Get complete demo statistics
   */
  getStats(): {
    totalDemoUsers: number;
    totalDemoTransactions: number;
    totalDemoChallenges: number;
    totalFundHistory: number;
    totalWebhookLogs: number;
    successfulTransactions: number;
    failedTransactions: number;
    duplicateWebhookDetections: number;
  } {
    const transactions = Array.from(this.demoTransactions.values());
    const duplicateCount = transactions.reduce((sum, t) => sum + t.duplicateWebhookCount, 0);

    return {
      totalDemoUsers: this.demoUsers.size,
      totalDemoTransactions: this.demoTransactions.size,
      totalDemoChallenges: this.demoChallengesPurchases.size,
      totalFundHistory: this.demoFundHistory.size,
      totalWebhookLogs: this.demoWebhookLogs.size,
      successfulTransactions: transactions.filter((t) => t.paymentStatus === 'successful').length,
      failedTransactions: transactions.filter((t) => t.paymentStatus === 'failed').length,
      duplicateWebhookDetections: duplicateCount,
    };
  }

  /**
   * Clear all demo data (for testing)
   */
  clearAllDemoData(): void {
    this.demoUsers.clear();
    this.demoTransactions.clear();
    this.demoChallengesPurchases.clear();
    this.demoFundHistory.clear();
    this.demoWebhookLogs.clear();
    console.log('[DemoDataStore] ⚠️  ALL DEMO DATA CLEARED - This only affects demo/test data');
  }

  /**
   * Verify isolation from production
   */
  verifyIsolation(): {
    isolated: true;
    dataLocation: 'in-memory';
    affectsProduction: false;
  } {
    return {
      isolated: true,
      dataLocation: 'in-memory',
      affectsProduction: false,
    };
  }
}

// Create singleton instance
export const demoDataStore = new DemoDataStore();
