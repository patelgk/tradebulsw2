/**
 * MOCK PAYMENT DEMO ROUTES - ISOLATED FROM PRODUCTION
 * ====================================================
 * These routes are ONLY available in development mode.
 * They are COMPLETELY ISOLATED from production payment routes:
 * - Production: /api/transactions, /api/withdraw, /api/admin/payments
 * - Demo:       /api/demo/transactions, /api/demo/withdraw, /api/demo/admin/payments
 *
 * All demo routes are disabled in production via NODE_ENV check.
 * Demo data never touches production database.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mockPaymentGateway } from './MockPaymentGateway';
import { demoDataStore } from './DemoModels';

const router = Router();

/**
 * Middleware: Check if mock payment is enabled (development only)
 */
const checkMockPaymentEnabled = (req: Request, res: Response, next: any) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: 'Demo payment gateway is disabled in production',
      isDemo: false,
      affectsProduction: false,
    });
  }

  if (!process.env.ENABLE_MOCK_PAYMENT || process.env.ENABLE_MOCK_PAYMENT !== 'true') {
    return res.status(403).json({
      error: 'Demo payment gateway is not enabled',
      isDemo: false,
      hint: 'Set ENABLE_MOCK_PAYMENT=true to enable demo routes',
    });
  }

  next();
};

// Apply middleware to all demo routes
router.use(checkMockPaymentEnabled);

// ─── DEMO STATUS ENDPOINTS ──────────────────────────────────────────────

/**
 * GET /api/demo/status
 * Check if mock payment demo is available
 */
router.get('/status', (req: Request, res: Response) => {
  const gatewayStatus = mockPaymentGateway.getStatus();
  const dataIsolation = demoDataStore.verifyIsolation();
  const stats = demoDataStore.getStats();

  res.json({
    available: true,
    isDemo: true,
    environment: process.env.NODE_ENV,
    gateway: gatewayStatus,
    dataStore: {
      isolation: dataIsolation,
      stats,
    },
    warning: '⚠️  THIS IS DEMO/TEST DATA ONLY - NO PRODUCTION IMPACT',
  });
});

/**
 * GET /api/demo/health
 * Health check for demo gateway
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    isDemo: true,
    message: 'Demo payment gateway is healthy',
  });
});

// ─── DEMO USER OPERATIONS ──────────────────────────────────────────────

/**
 * POST /api/demo/users/create
 * Create a demo user (completely separate from production users)
 */
router.post('/users/create', (req: Request, res: Response) => {
  try {
    const { email = `demo-${uuidv4()}@test.local`, name = 'Demo User' } = req.body;

    // Validate
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name required' });
    }

    // Create demo user (in-memory only)
    const demoUser = demoDataStore.createDemoUser(email, name);

    res.json({
      success: true,
      isDemo: true,
      demoUser,
      warning: '⚠️  THIS IS DEMO DATA - NO PRODUCTION USER CREATED',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

/**
 * GET /api/demo/users
 * List all demo users
 */
router.get('/users', (req: Request, res: Response) => {
  try {
    const users = demoDataStore.getAllDemoUsers();

    res.json({
      success: true,
      isDemo: true,
      count: users.length,
      users,
      warning: '⚠️  ALL DISPLAYED USERS ARE DEMO USERS ONLY',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

// ─── DEMO TRANSACTION OPERATIONS ───────────────────────────────────────

/**
 * POST /api/demo/transactions
 * Create a demo transaction (completely separate from production)
 */
router.post('/transactions', (req: Request, res: Response) => {
  try {
    const { demoUserId, type, amount, capital, challengeName } = req.body;

    // Validate
    if (!demoUserId || !type || !amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid request: demoUserId, type, and positive amount required',
        isDemo: true,
      });
    }

    // Verify user is demo user
    const user = demoDataStore.getDemoUser(demoUserId);
    if (!user) {
      return res.status(404).json({
        error: `Demo user not found: ${demoUserId}`,
        isDemo: true,
      });
    }

    // Validate amount range
    if (amount > 10000000) {
      return res.status(400).json({
        error: 'Amount exceeds maximum (₹1,00,00,000)',
        isDemo: true,
      });
    }

    try {
      // Create mock payment via gateway
      const mockPayment = await mockPaymentGateway.createPayment({
        amount,
        currency: 'INR',
        customerId: demoUserId,
        customerEmail: user.email,
        orderDescription: `Demo: ${type} - ${challengeName || ''}`,
        orderId: `DEMO-TX-${Date.now()}`,
      });

      // Create demo transaction
      const demoTransaction = demoDataStore.createDemoTransaction(
        demoUserId,
        mockPayment.orderId,
        type as any,
        amount,
        challengeName,
        capital
      );

      res.json({
        success: true,
        isDemo: true,
        transaction: demoTransaction,
        mockPayment,
        warning: '⚠️  THIS IS DEMO TRANSACTION - NO REAL PAYMENT PROCESSING',
      });
    } catch (gatewayError: any) {
      return res.status(400).json({
        error: `Mock gateway error: ${gatewayError.message}`,
        isDemo: true,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

/**
 * GET /api/demo/transactions
 * List all demo transactions
 */
router.get('/transactions', (req: Request, res: Response) => {
  try {
    const transactions = demoDataStore.getAllDemoTransactions();

    res.json({
      success: true,
      isDemo: true,
      count: transactions.length,
      transactions,
      warning: '⚠️  ALL DISPLAYED TRANSACTIONS ARE DEMO ONLY',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

// ─── DEMO PAYMENT SIMULATION ────────────────────────────────────────────

/**
 * POST /api/demo/webhook-simulate
 * Simulate payment success webhook (for testing)
 */
router.post('/webhook-simulate/success', (req: Request, res: Response) => {
  try {
    const { demoOrderId } = req.body;

    if (!demoOrderId) {
      return res.status(400).json({
        error: 'demoOrderId required',
        isDemo: true,
      });
    }

    // Simulate payment success
    const webhook = await mockPaymentGateway.simulatePaymentSuccess(demoOrderId);

    // Record webhook
    demoDataStore.recordDemoWebhook(demoOrderId, 'completed', webhook.amount);

    res.json({
      success: true,
      isDemo: true,
      webhook,
      message: '✅ Demo payment success simulated - webhook recorded',
      warning: '⚠️  NO REAL PAYMENT PROCESSED - THIS IS A SIMULATION',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

/**
 * POST /api/demo/webhook-simulate/failure
 * Simulate payment failure webhook (for testing)
 */
router.post('/webhook-simulate/failure', (req: Request, res: Response) => {
  try {
    const { demoOrderId, reason = 'Simulated failure' } = req.body;

    if (!demoOrderId) {
      return res.status(400).json({
        error: 'demoOrderId required',
        isDemo: true,
      });
    }

    // Simulate payment failure
    const webhook = await mockPaymentGateway.simulatePaymentFailure(demoOrderId, reason);

    // Record webhook
    demoDataStore.recordDemoWebhook(demoOrderId, 'failed', webhook.amount);

    res.json({
      success: true,
      isDemo: true,
      webhook,
      message: '❌ Demo payment failure simulated - webhook recorded',
      warning: '⚠️  NO REAL PAYMENT AFFECTED - THIS IS A SIMULATION',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

/**
 * POST /api/demo/webhook-simulate/duplicate
 * Generate duplicate webhook event (for testing idempotency)
 */
router.post('/webhook-simulate/duplicate', (req: Request, res: Response) => {
  try {
    const { demoOrderId } = req.body;

    if (!demoOrderId) {
      return res.status(400).json({
        error: 'demoOrderId required',
        isDemo: true,
      });
    }

    // Generate duplicate webhook
    const webhook = await mockPaymentGateway.generateDuplicateWebhook(demoOrderId);

    res.json({
      success: true,
      isDemo: true,
      webhook,
      message: '🔄 Duplicate webhook generated - tests idempotency handling',
      warning: '⚠️  THIS TESTS DUPLICATE EVENT PROTECTION',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

// ─── DEMO ADMIN VIEW ────────────────────────────────────────────────────

/**
 * GET /api/demo/admin/transactions
 * Admin view of all demo transactions (separate from production admin)
 */
router.get('/admin/transactions', (req: Request, res: Response) => {
  try {
    const transactions = demoDataStore.getAllDemoTransactions();
    const users = demoDataStore.getAllDemoUsers();
    const stats = demoDataStore.getStats();

    const enriched = transactions.map((tx) => {
      const user = users.find((u) => u.demoUserId === tx.demoUserId);
      return {
        ...tx,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
        fundHistory: demoDataStore.getDemoUserFundHistory(tx.demoUserId),
      };
    });

    res.json({
      success: true,
      isDemo: true,
      adminView: true,
      totalTransactions: transactions.length,
      stats,
      transactions: enriched,
      warning: '⚠️  DEMO ADMIN VIEW - NO PRODUCTION DATA DISPLAYED',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

/**
 * GET /api/demo/admin/gateway
 * Admin view of mock gateway status
 */
router.get('/admin/gateway', (req: Request, res: Response) => {
  try {
    const status = mockPaymentGateway.getStatus();
    const allOrders = mockPaymentGateway.getAllDemoOrders();

    res.json({
      success: true,
      isDemo: true,
      adminView: true,
      gatewayStatus: status,
      allDemoOrders: allOrders,
      warning: '⚠️  MOCK GATEWAY STATUS - FOR TESTING ONLY',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

// ─── DEMO DATA MANAGEMENT ──────────────────────────────────────────────

/**
 * POST /api/demo/admin/clear-data
 * Clear all demo data (for testing - development only)
 */
router.post('/admin/clear-data', (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Cannot clear demo data in production',
        isDemo: false,
      });
    }

    demoDataStore.clearAllDemoData();
    mockPaymentGateway.clearAllDemoOrders();

    res.json({
      success: true,
      isDemo: true,
      message: '✅ All demo data cleared',
      warning: '⚠️  ONLY DEMO/TEST DATA WAS CLEARED - PRODUCTION DATA UNTOUCHED',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

/**
 * GET /api/demo/admin/stats
 * Get comprehensive demo statistics
 */
router.get('/admin/stats', (req: Request, res: Response) => {
  try {
    const stats = demoDataStore.getStats();
    const gatewayStatus = mockPaymentGateway.getStatus();
    const isolation = demoDataStore.verifyIsolation();

    res.json({
      success: true,
      isDemo: true,
      adminView: true,
      stats,
      gatewayStatus,
      isolation,
      warning: '⚠️  ALL STATISTICS ARE FOR DEMO DATA ONLY',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, isDemo: true });
  }
});

export default router;
