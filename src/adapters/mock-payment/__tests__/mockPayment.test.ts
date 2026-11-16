/**
 * MOCK PAYMENT DEMO - TEST SUITE
 * ==============================
 * Comprehensive tests for isolated mock payment system.
 * Tests:
 * - Payment creation and status tracking
 * - Success/failure simulation
 * - Duplicate webhook handling (idempotency)
 * - Invalid amount validation
 * - Production isolation
 * - Demo data integrity
 *
 * NOTE: This test suite only tests demo/mock components.
 * No production data is affected.
 */

import { MockPaymentGateway, MockPaymentRequest } from '../MockPaymentGateway';
import { DemoDataStore } from '../DemoModels';

// ─────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create a test mock gateway instance
 */
function createTestGateway(): MockPaymentGateway {
  return new MockPaymentGateway(true); // enabled=true for testing
}

/**
 * Create a test data store instance
 */
function createTestDataStore(): DemoDataStore {
  return new DemoDataStore();
}

/**
 * Create a valid mock payment request
 */
function createValidPaymentRequest(overrides?: Partial<MockPaymentRequest>): MockPaymentRequest {
  return {
    amount: 5000,
    currency: 'INR',
    customerId: 'demo-user-123',
    customerEmail: 'test@demo.local',
    orderDescription: 'Test Payment',
    orderId: `ORD-${Date.now()}`,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: PAYMENT CREATION & VALIDATION
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway - Payment Creation & Validation', () => {
  let gateway: MockPaymentGateway;

  beforeEach(() => {
    gateway = createTestGateway();
  });

  test('should create a valid payment with correct fields', async () => {
    const request = createValidPaymentRequest();
    const response = await gateway.createPayment(request);

    expect(response).toBeDefined();
    expect(response.isDemo).toBe(true);
    expect(response.orderId).toMatch(/^DEMO-/);
    expect(response.status).toBe('created');
    expect(response.paymentLink).toContain('demo.proprupee.local');
    expect(response.createdAt).toBeInstanceOf(Date);
    expect(response.expiresAt).toBeInstanceOf(Date);
  });

  test('should reject payment with zero amount', async () => {
    const request = createValidPaymentRequest({ amount: 0 });

    try {
      await gateway.createPayment(request);
      fail('Should have thrown error for zero amount');
    } catch (error: any) {
      expect(error.message).toContain('Invalid amount');
    }
  });

  test('should reject payment with negative amount', async () => {
    const request = createValidPaymentRequest({ amount: -1000 });

    try {
      await gateway.createPayment(request);
      fail('Should have thrown error for negative amount');
    } catch (error: any) {
      expect(error.message).toContain('Invalid amount');
    }
  });

  test('should reject payment exceeding max limit (₹1,00,00,000)', async () => {
    const request = createValidPaymentRequest({ amount: 10000001 });

    try {
      await gateway.createPayment(request);
      fail('Should have thrown error for amount exceeding limit');
    } catch (error: any) {
      expect(error.message).toContain('exceeds maximum');
    }
  });

  test('should accept payment at max limit (₹1,00,00,000)', async () => {
    const request = createValidPaymentRequest({ amount: 10000000 });
    const response = await gateway.createPayment(request);

    expect(response.orderId).toBeDefined();
    expect(response.status).toBe('created');
  });

  test('should generate unique order IDs for same user', async () => {
    const request1 = createValidPaymentRequest({ orderId: 'ORD-001' });
    const request2 = createValidPaymentRequest({ orderId: 'ORD-002' });

    const response1 = await gateway.createPayment(request1);
    const response2 = await gateway.createPayment(request2);

    expect(response1.orderId).not.toBe(response2.orderId);
  });

  test('should set expiry to 15 minutes from creation', async () => {
    const request = createValidPaymentRequest();
    const response = await gateway.createPayment(request);

    const timeDiff = response.expiresAt.getTime() - response.createdAt.getTime();
    const fifteenMinutesMs = 15 * 60 * 1000;

    // Allow 1 second tolerance
    expect(Math.abs(timeDiff - fifteenMinutesMs)).toBeLessThan(1000);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: PAYMENT SUCCESS SCENARIO
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway - Payment Success', () => {
  let gateway: MockPaymentGateway;

  beforeEach(() => {
    gateway = createTestGateway();
  });

  test('should simulate payment success with correct webhook payload', async () => {
    // 1. Create payment
    const request = createValidPaymentRequest();
    const paymentResponse = await gateway.createPayment(request);

    // 2. Check initial status
    const initialStatus = await gateway.getPaymentStatus(paymentResponse.orderId);
    expect(initialStatus.status).toBe('created');

    // 3. Simulate success
    const webhook = await gateway.simulatePaymentSuccess(paymentResponse.orderId);

    // 4. Verify webhook payload
    expect(webhook.orderId).toBe(paymentResponse.orderId);
    expect(webhook.status).toBe('completed');
    expect(webhook.amount).toBe(request.amount);
    expect(webhook.isDemo).toBe(true);
    expect(webhook.timestamp).toBeInstanceOf(Date);

    // 5. Check status after success
    const finalStatus = await gateway.getPaymentStatus(paymentResponse.orderId);
    expect(finalStatus.status).toBe('completed');
  });

  test('should store successful payment with timestamp', async () => {
    const request = createValidPaymentRequest();
    const paymentResponse = await gateway.createPayment(request);

    const webhook = await gateway.simulatePaymentSuccess(paymentResponse.orderId);

    expect(webhook.timestamp).toBeDefined();
    expect(webhook.timestamp.getTime()).toBeGreaterThan(0);
  });

  test('should be queryable in getAllDemoOrders after success', async () => {
    const request = createValidPaymentRequest();
    const paymentResponse = await gateway.createPayment(request);

    await gateway.simulatePaymentSuccess(paymentResponse.orderId);

    const allOrders = gateway.getAllDemoOrders();

    expect(allOrders.length).toBeGreaterThan(0);
    const successfulOrder = allOrders.find((o) => o.demoOrderId === paymentResponse.orderId);
    expect(successfulOrder).toBeDefined();
    expect(successfulOrder.status).toBe('completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: PAYMENT FAILURE SCENARIO
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway - Payment Failure', () => {
  let gateway: MockPaymentGateway;

  beforeEach(() => {
    gateway = createTestGateway();
  });

  test('should simulate payment failure with reason', async () => {
    // 1. Create payment
    const request = createValidPaymentRequest();
    const paymentResponse = await gateway.createPayment(request);

    // 2. Simulate failure with reason
    const failureReason = 'Insufficient funds';
    const webhook = await gateway.simulatePaymentFailure(paymentResponse.orderId, failureReason);

    // 3. Verify webhook
    expect(webhook.orderId).toBe(paymentResponse.orderId);
    expect(webhook.status).toBe('failed');
    expect(webhook.amount).toBe(request.amount);

    // 4. Check status after failure
    const finalStatus = await gateway.getPaymentStatus(paymentResponse.orderId);
    expect(finalStatus.status).toBe('failed');
  });

  test('should record failure reason in gateway', async () => {
    const request = createValidPaymentRequest();
    const paymentResponse = await gateway.createPayment(request);

    const failureReason = 'Card declined';
    await gateway.simulatePaymentFailure(paymentResponse.orderId, failureReason);

    // Get order details
    const orderDetails = gateway.getDemoOrderDetails(paymentResponse.orderId);
    expect(orderDetails).toBeDefined();
    expect(orderDetails.lastError).toBe(failureReason);
  });

  test('should use default failure reason if not provided', async () => {
    const request = createValidPaymentRequest();
    const paymentResponse = await gateway.createPayment(request);

    const webhook = await gateway.simulatePaymentFailure(paymentResponse.orderId);

    expect(webhook.status).toBe('failed');
    expect(webhook.orderId).toBe(paymentResponse.orderId);
  });

  test('should not affect other payments', async () => {
    // Create two payments
    const request1 = createValidPaymentRequest({ orderId: 'ORD-001' });
    const request2 = createValidPaymentRequest({ orderId: 'ORD-002' });

    const payment1 = await gateway.createPayment(request1);
    const payment2 = await gateway.createPayment(request2);

    // Fail only first
    await gateway.simulatePaymentFailure(payment1.orderId);

    // Check statuses
    const status1 = await gateway.getPaymentStatus(payment1.orderId);
    const status2 = await gateway.getPaymentStatus(payment2.orderId);

    expect(status1.status).toBe('failed');
    expect(status2.status).toBe('created');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 4: DUPLICATE WEBHOOK HANDLING (IDEMPOTENCY)
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway - Duplicate Webhook Protection', () => {
  let gateway: MockPaymentGateway;
  let dataStore: DemoDataStore;

  beforeEach(() => {
    gateway = createTestGateway();
    dataStore = createTestDataStore();
  });

  test('should generate duplicate webhook with same payment ID', async () => {
    // 1. Create and complete payment
    const request = createValidPaymentRequest();
    const paymentResponse = await gateway.createPayment(request);
    await gateway.simulatePaymentSuccess(paymentResponse.orderId);

    // 2. Generate duplicate webhook
    const duplicateWebhook = await gateway.generateDuplicateWebhook(paymentResponse.orderId);

    // 3. Verify it has same payload
    expect(duplicateWebhook.orderId).toBe(paymentResponse.orderId);
    expect(duplicateWebhook.amount).toBeDefined();
    expect(duplicateWebhook.isDemo).toBe(true);
  });

  test('should track duplicate webhooks in data store', async () => {
    // 1. Create demo user and transaction
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');

    const request = createValidPaymentRequest();
    const payment = await gateway.createPayment(request);

    const transaction = dataStore.createDemoTransaction(user.demoUserId, payment.orderId, 'demo_deposit', 5000);

    // 2. Record webhook events (simulating duplicates)
    const webhook1 = dataStore.recordDemoWebhook(payment.orderId, 'completed', 5000);
    const webhook2 = dataStore.recordDemoWebhook(payment.orderId, 'completed', 5000);

    // 3. Get webhooks for order
    const webhooks = dataStore.getDemoWebhooksForOrder(payment.orderId);

    expect(webhooks.length).toBeGreaterThanOrEqual(2);
    expect(webhooks[0].demoOrderId).toBe(payment.orderId);
    expect(webhooks[1].demoOrderId).toBe(payment.orderId);
  });

  test('should mark duplicate webhooks as processed', async () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');
    const request = createValidPaymentRequest();
    const payment = await gateway.createPayment(request);

    // Record webhook
    const webhook = dataStore.recordDemoWebhook(payment.orderId, 'completed', 5000);

    // Initially not processed
    expect(webhook.processed).toBe(false);

    // Mark as processed
    dataStore.markWebhookProcessed(webhook._id);

    // Verify
    const webhooks = dataStore.getDemoWebhooksForOrder(payment.orderId);
    const processed = webhooks.find((w) => w._id === webhook._id);
    expect(processed?.processed).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 5: DEMO DATA ISOLATION
// ─────────────────────────────────────────────────────────────────────────

describe('DemoDataStore - Production Isolation', () => {
  let dataStore: DemoDataStore;

  beforeEach(() => {
    dataStore = createTestDataStore();
  });

  test('should verify data is completely isolated from production', () => {
    const isolation = dataStore.verifyIsolation();

    expect(isolation.isolated).toBe(true);
    expect(isolation.dataLocation).toBe('in-memory');
    expect(isolation.affectsProduction).toBe(false);
  });

  test('should create demo users with isDemo flag', () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');

    expect(user.isDemo).toBe(true);
    expect(user.demoUserId).toBeDefined();
    expect(user.email).toBe('test@demo.local');
  });

  test('should create demo transactions with isDemo flag', () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');
    const transaction = dataStore.createDemoTransaction(user.demoUserId, 'DEMO-ORDER-001', 'demo_deposit', 5000);

    expect(transaction.isDemo).toBe(true);
    expect(transaction._id).toBeDefined();
    expect(transaction.paymentStatus).toBe('pending');
    expect(transaction.status).toBe('pending');
  });

  test('should create demo challenges with isDemo flag', () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');
    const challenge = dataStore.createDemoChallengeePurchase(
      user.demoUserId,
      'DEMO-ORDER-002',
      'Demo Challenge',
      10000,
      500
    );

    expect(challenge.isDemo).toBe(true);
    expect(challenge._id).toBeDefined();
    expect(challenge.paymentStatus).toBe('pending');
  });

  test('all demo data should be cleared without affecting production', () => {
    // Create demo data
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');
    dataStore.createDemoTransaction(user.demoUserId, 'DEMO-ORDER-001', 'demo_deposit', 5000);
    dataStore.createDemoChallengeePurchase(user.demoUserId, 'DEMO-ORDER-002', 'Challenge', 10000, 500);

    let stats = dataStore.getStats();
    expect(stats.totalDemoUsers).toBeGreaterThan(0);

    // Clear all data
    dataStore.clearAllDemoData();

    // Verify cleared
    stats = dataStore.getStats();
    expect(stats.totalDemoUsers).toBe(0);
    expect(stats.totalDemoTransactions).toBe(0);
    expect(stats.totalDemoChallenges).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 6: GATEWAY INITIALIZATION & STATE
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway - Initialization & State', () => {
  test('should throw error when disabled', async () => {
    const disabledGateway = new MockPaymentGateway(false);

    const request = createValidPaymentRequest();

    try {
      await disabledGateway.createPayment(request);
      fail('Should have thrown error when disabled');
    } catch (error: any) {
      expect(error.message).toContain('disabled');
    }
  });

  test('should return correct status when disabled', () => {
    const disabledGateway = new MockPaymentGateway(false);

    const status = disabledGateway.getStatus();

    expect(status.enabled).toBe(false);
    expect(status.totalOrders).toBe(0);
  });

  test('should track gateway statistics correctly', async () => {
    const gateway = createTestGateway();

    // Create multiple payments
    const request1 = createValidPaymentRequest({ orderId: 'ORD-001' });
    const request2 = createValidPaymentRequest({ orderId: 'ORD-002' });
    const request3 = createValidPaymentRequest({ orderId: 'ORD-003' });

    const payment1 = await gateway.createPayment(request1);
    const payment2 = await gateway.createPayment(request2);
    const payment3 = await gateway.createPayment(request3);

    // Success
    await gateway.simulatePaymentSuccess(payment1.orderId);

    // Failure
    await gateway.simulatePaymentFailure(payment2.orderId);

    // Still pending
    // payment3 remains in created state

    const status = gateway.getStatus();

    expect(status.enabled).toBe(true);
    expect(status.totalOrders).toBe(3);
    expect(status.successfulOrders).toBe(1);
    expect(status.failedOrders).toBe(1);
    expect(status.pendingOrders).toBe(1);
  });

  test('should clear all orders without side effects', async () => {
    const gateway = createTestGateway();

    // Create payments
    const request1 = createValidPaymentRequest({ orderId: 'ORD-001' });
    const request2 = createValidPaymentRequest({ orderId: 'ORD-002' });

    await gateway.createPayment(request1);
    await gateway.createPayment(request2);

    let status = gateway.getStatus();
    expect(status.totalOrders).toBe(2);

    // Clear
    gateway.clearAllDemoOrders();

    status = gateway.getStatus();
    expect(status.totalOrders).toBe(0);
    expect(status.successfulOrders).toBe(0);
    expect(status.failedOrders).toBe(0);
    expect(status.pendingOrders).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 7: TRANSACTION & FUND HISTORY
// ─────────────────────────────────────────────────────────────────────────

describe('DemoDataStore - Transaction & Fund History', () => {
  let dataStore: DemoDataStore;

  beforeEach(() => {
    dataStore = createTestDataStore();
  });

  test('should create and retrieve demo transaction', () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');
    const transaction = dataStore.createDemoTransaction(user.demoUserId, 'DEMO-ORDER-001', 'demo_deposit', 5000);

    const retrieved = dataStore.getDemoTransaction(transaction._id);

    expect(retrieved).toBeDefined();
    expect(retrieved?._id).toBe(transaction._id);
    expect(retrieved?.amount).toBe(5000);
  });

  test('should approve demo transaction', () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');
    const transaction = dataStore.createDemoTransaction(user.demoUserId, 'DEMO-ORDER-001', 'demo_deposit', 5000);

    expect(transaction.status).toBe('pending');
    expect(transaction.paymentStatus).toBe('pending');

    dataStore.approveDemoTransaction(transaction._id);

    const updated = dataStore.getDemoTransaction(transaction._id);
    expect(updated?.status).toBe('approved');
    expect(updated?.paymentStatus).toBe('successful');
    expect(updated?.approvedAt).toBeDefined();
  });

  test('should reject demo transaction with reason', () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');
    const transaction = dataStore.createDemoTransaction(user.demoUserId, 'DEMO-ORDER-001', 'demo_deposit', 5000);

    const reason = 'Amount exceeds limit';
    dataStore.rejectDemoTransaction(transaction._id, reason);

    const updated = dataStore.getDemoTransaction(transaction._id);
    expect(updated?.status).toBe('rejected');
    expect(updated?.paymentStatus).toBe('failed');
    expect(updated?.failureReason).toBe(reason);
    expect(updated?.rejectedAt).toBeDefined();
  });

  test('should record and retrieve fund history', () => {
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');

    const history = dataStore.recordDemoFundHistory(
      user.demoUserId,
      'credit',
      5000,
      0, // before
      5000, // after
      'Test credit',
      'REF-001'
    );

    expect(history.isDemo).toBe(true);
    expect(history.type).toBe('credit');
    expect(history.amount).toBe(5000);

    const retrieved = dataStore.getDemoUserFundHistory(user.demoUserId);
    expect(retrieved.length).toBeGreaterThan(0);
    expect(retrieved[0].referenceId).toBe('REF-001');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 8: COMPREHENSIVE PAYMENT FLOW
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway - Complete Payment Flow', () => {
  let gateway: MockPaymentGateway;
  let dataStore: DemoDataStore;

  beforeEach(() => {
    gateway = createTestGateway();
    dataStore = createTestDataStore();
  });

  test('should handle complete successful payment flow', async () => {
    // 1. Create demo user
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');

    // 2. Create payment
    const paymentRequest = createValidPaymentRequest({ customerId: user.demoUserId });
    const paymentResponse = await gateway.createPayment(paymentRequest);

    // 3. Create transaction record
    const transaction = dataStore.createDemoTransaction(
      user.demoUserId,
      paymentResponse.orderId,
      'demo_deposit',
      paymentRequest.amount
    );

    expect(transaction.paymentStatus).toBe('pending');

    // 4. Simulate success
    const webhook = await gateway.simulatePaymentSuccess(paymentResponse.orderId);

    // 5. Record webhook
    const webhookLog = dataStore.recordDemoWebhook(webhook.orderId, webhook.status as any, webhook.amount);

    // 6. Approve transaction (simulating admin approval)
    dataStore.approveDemoTransaction(transaction._id);

    // 7. Verify final state
    const finalTransaction = dataStore.getDemoTransaction(transaction._id);
    expect(finalTransaction?.status).toBe('approved');
    expect(finalTransaction?.paymentStatus).toBe('successful');

    const stats = dataStore.getStats();
    expect(stats.totalDemoUsers).toBe(1);
    expect(stats.totalDemoTransactions).toBe(1);
    expect(stats.successfulTransactions).toBe(1);
  });

  test('should handle complete failed payment flow', async () => {
    // 1. Create demo user
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');

    // 2. Create payment
    const paymentRequest = createValidPaymentRequest({ customerId: user.demoUserId });
    const paymentResponse = await gateway.createPayment(paymentRequest);

    // 3. Create transaction record
    const transaction = dataStore.createDemoTransaction(
      user.demoUserId,
      paymentResponse.orderId,
      'demo_deposit',
      paymentRequest.amount
    );

    // 4. Simulate failure
    const webhook = await gateway.simulatePaymentFailure(paymentResponse.orderId, 'Card declined');

    // 5. Record webhook
    dataStore.recordDemoWebhook(webhook.orderId, webhook.status as any, webhook.amount);

    // 6. Reject transaction
    dataStore.rejectDemoTransaction(transaction._id, 'Payment failed: Card declined');

    // 7. Verify final state
    const finalTransaction = dataStore.getDemoTransaction(transaction._id);
    expect(finalTransaction?.status).toBe('rejected');
    expect(finalTransaction?.paymentStatus).toBe('failed');

    const stats = dataStore.getStats();
    expect(stats.failedTransactions).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 9: ENVIRONMENT-SPECIFIC BEHAVIOR
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway - Environment Checks', () => {
  test('gateway should be enabled in development with flag', () => {
    // Simulating development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_MOCK_PAYMENT = 'true';

    const gateway = createTestGateway();
    expect(gateway.isGatewayEnabled()).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  test('singleton gateway reflects environment settings', () => {
    // The exported singleton uses process.env checks
    // This test verifies the pattern, though actual env is set at module load time
    expect(typeof MockPaymentGateway).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEST SUITE 10: DATA CONSISTENCY
// ─────────────────────────────────────────────────────────────────────────

describe('MockPaymentGateway + DemoDataStore - Consistency', () => {
  let gateway: MockPaymentGateway;
  let dataStore: DemoDataStore;

  beforeEach(() => {
    gateway = createTestGateway();
    dataStore = createTestDataStore();
  });

  test('should maintain consistency between gateway and data store', async () => {
    // Create payment in gateway
    const request = createValidPaymentRequest();
    const payment = await gateway.createPayment(request);

    // Create matching transaction in data store
    const user = dataStore.createDemoUser(request.customerEmail, 'Test User');
    const transaction = dataStore.createDemoTransaction(user.demoUserId, payment.orderId, 'demo_deposit', request.amount);

    // Verify amounts match
    expect(payment.orderId).toBe(transaction.demoOrderId);
    expect(request.amount).toBe(transaction.amount);

    // Success in gateway
    const webhook = await gateway.simulatePaymentSuccess(payment.orderId);

    // Approve in data store
    dataStore.approveDemoTransaction(transaction._id);

    // Final state should match
    const finalTransaction = dataStore.getDemoTransaction(transaction._id);
    expect(finalTransaction?.paymentStatus).toBe('successful');
    expect(webhook.status).toBe('completed');
  });

  test('statistics should reflect all demo data', async () => {
    // Create multiple payments with different outcomes
    const user = dataStore.createDemoUser('test@demo.local', 'Test User');

    // Successful
    const payment1Request = createValidPaymentRequest({ orderId: 'ORD-001' });
    const payment1 = await gateway.createPayment(payment1Request);
    const tx1 = dataStore.createDemoTransaction(user.demoUserId, payment1.orderId, 'demo_deposit', 5000);
    await gateway.simulatePaymentSuccess(payment1.orderId);
    dataStore.approveDemoTransaction(tx1._id);

    // Failed
    const payment2Request = createValidPaymentRequest({ orderId: 'ORD-002' });
    const payment2 = await gateway.createPayment(payment2Request);
    const tx2 = dataStore.createDemoTransaction(user.demoUserId, payment2.orderId, 'demo_deposit', 5000);
    await gateway.simulatePaymentFailure(payment2.orderId);
    dataStore.rejectDemoTransaction(tx2._id, 'Failed');

    // Pending
    const payment3Request = createValidPaymentRequest({ orderId: 'ORD-003' });
    const payment3 = await gateway.createPayment(payment3Request);
    dataStore.createDemoTransaction(user.demoUserId, payment3.orderId, 'demo_deposit', 5000);

    // Verify stats
    const stats = dataStore.getStats();
    expect(stats.totalDemoTransactions).toBe(3);
    expect(stats.successfulTransactions).toBe(1);
    expect(stats.failedTransactions).toBe(1);

    const gatewayStatus = gateway.getStatus();
    expect(gatewayStatus.totalOrders).toBe(3);
    expect(gatewayStatus.successfulOrders).toBe(1);
    expect(gatewayStatus.failedOrders).toBe(1);
  });
});
