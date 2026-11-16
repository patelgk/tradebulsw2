/**
 * MOCK PAYMENT GATEWAY - DEMO ONLY
 * ================================
 * This is a completely isolated mock payment gateway for testing and demonstration.
 * It does NOT interact with production payment systems or real user data.
 * All data is stored in separate demo collections.
 * 
 * USE ONLY IN DEVELOPMENT MODE - DISABLED IN PRODUCTION
 */

import { v4 as uuidv4 } from 'uuid';

export type PaymentStatus = 'pending' | 'successful' | 'failed';
export type MockOrderStatus = 'created' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface MockPaymentRequest {
  amount: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  orderDescription: string;
  orderId: string;
}

export interface MockPaymentResponse {
  orderId: string;
  paymentLink: string;
  status: MockOrderStatus;
  createdAt: Date;
  expiresAt: Date;
  isDemo: true;
}

export interface MockWebhookPayload {
  orderId: string;
  status: 'completed' | 'failed';
  amount: number;
  timestamp: Date;
  isDemo: true;
}

/**
 * Mock Payment Gateway
 * Simulates payment processing without connecting to real payment providers.
 */
export class MockPaymentGateway {
  private isEnabled: boolean;
  private demoOrdersMap: Map<string, any> = new Map();

  constructor(enabled: boolean = false) {
    this.isEnabled = enabled;
  }

  /**
   * Check if mock gateway is enabled
   */
  isGatewayEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Create a mock payment (simulates payment initialization)
   */
  async createPayment(request: MockPaymentRequest): Promise<MockPaymentResponse> {
    if (!this.isEnabled) {
      throw new Error('Mock payment gateway is disabled');
    }

    // Validate amount
    if (!request.amount || request.amount <= 0) {
      throw new Error('Invalid amount: must be greater than 0');
    }

    if (request.amount > 10000000) {
      // Max 1 crore for demo
      throw new Error('Amount exceeds maximum limit for demo (₹1,00,00,000)');
    }

    // Generate unique demo order ID
    const demoOrderId = `DEMO-${request.orderId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create mock payment record
    const mockPayment = {
      demoOrderId,
      originalOrderId: request.orderId,
      customerId: request.customerId,
      customerEmail: request.customerEmail,
      amount: request.amount,
      currency: request.currency,
      description: request.orderDescription,
      status: 'created' as MockOrderStatus,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minute expiry
      isDemo: true,
      attempts: 0,
      lastError: null,
    };

    // Store in memory (in production, would use demo DB)
    this.demoOrdersMap.set(demoOrderId, mockPayment);

    console.log(`[MockPaymentGateway] Payment created:`, {
      demoOrderId,
      amount: request.amount,
      status: 'created',
    });

    return {
      orderId: demoOrderId,
      paymentLink: `https://demo.proprupee.local/mock-checkout/${demoOrderId}`,
      status: 'created',
      createdAt: mockPayment.createdAt,
      expiresAt: mockPayment.expiresAt,
      isDemo: true,
    };
  }

  /**
   * Get payment status (simulates status check)
   */
  async getPaymentStatus(demoOrderId: string): Promise<{ status: MockOrderStatus; amount: number }> {
    if (!this.isEnabled) {
      throw new Error('Mock payment gateway is disabled');
    }

    const payment = this.demoOrdersMap.get(demoOrderId);
    if (!payment) {
      throw new Error(`Demo order not found: ${demoOrderId}`);
    }

    return {
      status: payment.status,
      amount: payment.amount,
    };
  }

  /**
   * Simulate payment success (for testing)
   */
  async simulatePaymentSuccess(demoOrderId: string): Promise<MockWebhookPayload> {
    if (!this.isEnabled) {
      throw new Error('Mock payment gateway is disabled');
    }

    const payment = this.demoOrdersMap.get(demoOrderId);
    if (!payment) {
      throw new Error(`Demo order not found: ${demoOrderId}`);
    }

    payment.status = 'completed';
    payment.completedAt = new Date();

    console.log(`[MockPaymentGateway] Payment success simulated:`, demoOrderId);

    return {
      orderId: demoOrderId,
      status: 'completed',
      amount: payment.amount,
      timestamp: payment.completedAt,
      isDemo: true,
    };
  }

  /**
   * Simulate payment failure (for testing)
   */
  async simulatePaymentFailure(demoOrderId: string, reason: string = 'Simulated failure'): Promise<MockWebhookPayload> {
    if (!this.isEnabled) {
      throw new Error('Mock payment gateway is disabled');
    }

    const payment = this.demoOrdersMap.get(demoOrderId);
    if (!payment) {
      throw new Error(`Demo order not found: ${demoOrderId}`);
    }

    payment.status = 'failed';
    payment.failedAt = new Date();
    payment.lastError = reason;

    console.log(`[MockPaymentGateway] Payment failure simulated:`, {
      demoOrderId,
      reason,
    });

    return {
      orderId: demoOrderId,
      status: 'failed',
      amount: payment.amount,
      timestamp: payment.failedAt,
      isDemo: true,
    };
  }

  /**
   * Generate duplicate webhook event (for testing idempotency)
   */
  async generateDuplicateWebhook(demoOrderId: string): Promise<MockWebhookPayload> {
    if (!this.isEnabled) {
      throw new Error('Mock payment gateway is disabled');
    }

    const payment = this.demoOrdersMap.get(demoOrderId);
    if (!payment) {
      throw new Error(`Demo order not found: ${demoOrderId}`);
    }

    console.log(`[MockPaymentGateway] Duplicate webhook generated for:`, demoOrderId);

    return {
      orderId: demoOrderId,
      status: payment.status === 'completed' ? 'completed' : 'failed',
      amount: payment.amount,
      timestamp: new Date(),
      isDemo: true,
    };
  }

  /**
   * Get all demo orders (for admin viewing)
   */
  getAllDemoOrders(): any[] {
    if (!this.isEnabled) {
      return [];
    }

    return Array.from(this.demoOrdersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get demo order details
   */
  getDemoOrderDetails(demoOrderId: string): any | null {
    if (!this.isEnabled) {
      return null;
    }

    return this.demoOrdersMap.get(demoOrderId) || null;
  }

  /**
   * Clear all demo orders (for testing)
   */
  clearAllDemoOrders(): void {
    this.demoOrdersMap.clear();
    console.log('[MockPaymentGateway] All demo orders cleared');
  }

  /**
   * Get gateway status
   */
  getStatus(): {
    enabled: boolean;
    totalOrders: number;
    pendingOrders: number;
    successfulOrders: number;
    failedOrders: number;
  } {
    const orders = Array.from(this.demoOrdersMap.values());
    return {
      enabled: this.isEnabled,
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'created' || o.status === 'processing').length,
      successfulOrders: orders.filter((o) => o.status === 'completed').length,
      failedOrders: orders.filter((o) => o.status === 'failed').length,
    };
  }
}

// Create singleton instance
export const mockPaymentGateway = new MockPaymentGateway(
  process.env.NODE_ENV === 'development' && process.env.ENABLE_MOCK_PAYMENT === 'true'
);
