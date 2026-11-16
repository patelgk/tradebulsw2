# YOUPI PG Integration Roadmap for Proprupee
## Phase-Based Implementation Plan

**Status:** PLANNED  
**Start Date:** Ready to begin  
**Est. Duration:** 4-6 weeks  

---

## PHASE 0: FOUNDATION (Week 1-2)

### 0.1 Security Hardening
- [ ] Add idempotency protection to payment approval endpoints
- [ ] Implement HMAC-SHA256 signature verification (for webhooks)
- [ ] Add structured logging (Winston or Pino)
- [ ] Implement rate limiting on payment endpoints
- [ ] Add input validation (Joi schema)

### 0.2 Demo Payment Adapter
- [ ] Create `/src/adapters/demo-payment/` directory
- [ ] Implement `DemoPaymentGateway` class
- [ ] Create separate MongoDB collections for demo data
- [ ] Add `/api/demo/pay` endpoint
- [ ] Add `/api/demo/status` endpoint
- [ ] Write integration tests

### 0.3 Documentation
- [ ] Document adapter architecture
- [ ] Create YOUPI integration guide
- [ ] Update API documentation
- [ ] Create demo/test user guide

---

## PHASE 1: YOUPI ADAPTER DEVELOPMENT (Week 3-4)

### 1.1 YOUPI API Integration
- [ ] Create `YoupiPaymentGateway` class
- [ ] Implement payment creation/initialization
- [ ] Implement payment status checking
- [ ] Implement refund handling (if needed)
- [ ] Add error handling and retry logic

### 1.2 Webhook Handler
- [ ] Create `/api/webhooks/youpi` endpoint
- [ ] Implement signature verification
- [ ] Implement payment confirmation workflow
- [ ] Add duplicate prevention
- [ ] Add audit logging

### 1.3 YOUPI Models
- [ ] Create `YoupiTransaction` schema
- [ ] Create `YoupiWebhookLog` schema
- [ ] Implement transaction mapping (Proprupee ↔ YOUPI)

---

## PHASE 2: INTEGRATION & TESTING (Week 5)

### 2.1 Transaction Flow Integration
- [ ] Integrate YOUPI adapter into `/api/transactions`
- [ ] Implement payment link generation
- [ ] Add YOUPI payment redirect flow
- [ ] Implement status polling fallback
- [ ] Add error recovery

### 2.2 Sandbox Testing
- [ ] Test payment creation
- [ ] Test webhook delivery
- [ ] Test error scenarios
- [ ] Test duplicate handling
- [ ] Test refund workflow

### 2.3 End-to-End Testing
- [ ] User signup → Challenge → Payment → Approval flow
- [ ] Webhook confirmation → Trading activation
- [ ] Withdrawal request → YOUPI payout
- [ ] Commission approval → Partner payout

---

## PHASE 3: DEPLOYMENT (Week 6)

### 3.1 Production Readiness
- [ ] Security audit (penetration testing)
- [ ] Performance testing (load test)
- [ ] Data migration plan (if needed)
- [ ] Rollback plan
- [ ] Incident response plan

### 3.2 Monitoring
- [ ] Payment gateway health check
- [ ] Webhook delivery monitoring
- [ ] Error rate alerts
- [ ] Reconciliation reports

### 3.3 Launch
- [ ] Feature flag deployment
- [ ] Canary deployment (% of users)
- [ ] Full rollout
- [ ] Monitor for issues

---

## DETAILED IMPLEMENTATION GUIDE

### Step 1: Create Adapter Directory Structure

```bash
mkdir -p src/adapters/youpi-pg
mkdir -p src/adapters/youpi-pg/tests
mkdir -p src/adapters/youpi-pg/schemas
mkdir -p src/adapters/youpi-pg/utils
```

### Step 2: Implement YOUPI Payment Gateway

**File:** `src/adapters/youpi-pg/YoupiPaymentGateway.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

interface YoupiPaymentRequest {
  amount: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  orderDescription: string;
  orderId: string;
  notifyUrl: string;
  returnUrl: string;
  cancelUrl: string;
}

interface YoupiPaymentResponse {
  orderId: string;
  paymentLink: string;
  status: string;
  expiresAt: string;
}

export class YoupiPaymentGateway {
  private apiKey: string;
  private webhookSecret: string;
  private apiClient: AxiosInstance;
  private apiBase: string;

  constructor(apiKey: string, webhookSecret: string, sandbox = false) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
    this.apiBase = sandbox 
      ? 'https://sandbox.youpi-pg.com/api'
      : 'https://api.youpi-pg.com/api';

    this.apiClient = axios.create({
      baseURL: this.apiBase,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }

  /**
   * Create a payment order in YOUPI
   */
  async createPayment(req: YoupiPaymentRequest): Promise<YoupiPaymentResponse> {
    try {
      const payload = {
        amount: Math.round(req.amount * 100), // Convert to paise
        currency: req.currency || 'INR',
        customer: {
          id: req.customerId,
          email: req.customerEmail
        },
        order: {
          id: req.orderId,
          description: req.orderDescription
        },
        webhook: {
          notifyUrl: req.notifyUrl
        },
        redirectUrls: {
          returnUrl: req.returnUrl,
          cancelUrl: req.cancelUrl
        }
      };

      const response = await this.apiClient.post('/orders', payload);
      
      return {
        orderId: response.data.id,
        paymentLink: response.data.paymentUrl,
        status: response.data.status,
        expiresAt: response.data.expiresAt
      };
    } catch (error: any) {
      throw new Error(`YOUPI Payment Creation Failed: ${error.message}`);
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(orderId: string): Promise<{status: string; amount: number}> {
    try {
      const response = await this.apiClient.get(`/orders/${orderId}`);
      return {
        status: response.data.status,
        amount: response.data.amount / 100 // Convert back to rupees
      };
    } catch (error: any) {
      throw new Error(`YOUPI Status Check Failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature (HMAC-SHA256)
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    const hash = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return hash === signature;
  }

  /**
   * Process webhook notification
   */
  async processWebhook(body: any, signature: string) {
    if (!this.verifyWebhookSignature(body, signature)) {
      throw new Error('Invalid webhook signature');
    }

    // Webhook format may vary - adjust based on YOUPI docs
    return {
      orderId: body.id,
      status: body.status,
      amount: body.amount / 100,
      customerId: body.customer?.id,
      timestamp: new Date(body.createdAt)
    };
  }

  /**
   * Refund payment (if applicable)
   */
  async refundPayment(orderId: string, amount?: number): Promise<{refundId: string; status: string}> {
    try {
      const payload = amount ? {amount: Math.round(amount * 100)} : {};
      const response = await this.apiClient.post(`/orders/${orderId}/refund`, payload);
      
      return {
        refundId: response.data.refundId,
        status: response.data.status
      };
    } catch (error: any) {
      throw new Error(`YOUPI Refund Failed: ${error.message}`);
    }
  }
}
```

### Step 3: Create Webhook Handler

**File:** `src/adapters/youpi-pg/YoupiWebhookHandler.ts`

```typescript
import { Request, Response } from 'express';
import { YoupiPaymentGateway } from './YoupiPaymentGateway';
import { YoupiTransaction, Transaction, User, ChallengePurchase, FundHistory, createNotification } from '../../models';
import logger from '../../services/logger';

export class YoupiWebhookHandler {
  constructor(private gateway: YoupiPaymentGateway) {}

  /**
   * Handle YOUPI webhook notification
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-youpi-signature'] as string;
      
      // Verify signature
      const verified = this.gateway.verifyWebhookSignature(req.body, signature);
      if (!verified) {
        logger.warn('Webhook signature verification failed', {orderId: req.body.id});
        return res.status(403).json({error: 'Invalid signature'});
      }

      // Process webhook
      const webhook = await this.gateway.processWebhook(req.body, signature);
      
      // Log webhook
      await YoupiWebhookLog.create({
        orderId: webhook.orderId,
        status: webhook.status,
        amount: webhook.amount,
        timestamp: webhook.timestamp,
        raw: req.body
      });

      // Find matching transaction
      const youpiTx = await YoupiTransaction.findOne({orderId: webhook.orderId});
      if (!youpiTx) {
        logger.error('Webhook received for unknown order', {orderId: webhook.orderId});
        return res.status(404).json({error: 'Order not found'});
      }

      // Update based on status
      if (webhook.status === 'completed') {
        await this.confirmPayment(youpiTx);
      } else if (webhook.status === 'failed') {
        await this.failPayment(youpiTx);
      }

      res.json({success: true});
    } catch (error: any) {
      logger.error('Webhook processing error', error);
      res.status(500).json({error: 'Webhook processing failed'});
    }
  }

  /**
   * Confirm payment (called from webhook)
   */
  private async confirmPayment(youpiTx: any) {
    // Prevent duplicate processing
    const tx = await Transaction.findById(youpiTx.transactionId);
    if (tx.status !== 'pending') {
      logger.warn('Attempt to confirm already processed transaction', {txId: tx._id});
      return;
    }

    // Update transaction
    tx.status = 'approved';
    tx.approvedAt = new Date();
    await tx.save();

    // Update user balance
    const user = await User.findOne({uid: tx.userId});
    const amountToAdd = tx.amount || tx.capital || 0;
    user.balance = (user.balance || 0) + amountToAdd;
    await user.save();

    // Record fund history
    await FundHistory.create({
      userId: tx.userId,
      type: 'credit',
      amount: amountToAdd,
      balanceBefore: user.balance - amountToAdd,
      balanceAfter: user.balance,
      reason: 'Payment confirmed via YOUPI',
      referenceId: tx._id,
      adminId: 'youpi-webhook'
    });

    // Notify user
    await createNotification(tx.userId, 'payment_confirmed', 'Payment Confirmed', 'Your payment has been confirmed and your challenge will be activated soon.');

    logger.info('Payment confirmed via YOUPI', {txId: tx._id, orderId: youpiTx.orderId});
  }

  /**
   * Mark payment as failed
   */
  private async failPayment(youpiTx: any) {
    const tx = await Transaction.findById(youpiTx.transactionId);
    if (tx.status !== 'pending') return;

    tx.status = 'rejected';
    tx.rejectedAt = new Date();
    tx.rejectionReason = 'Payment failed on gateway';
    await tx.save();

    await createNotification(tx.userId, 'payment_failed', 'Payment Failed', 'Your payment could not be processed. Please try again.');

    logger.warn('Payment failed via YOUPI', {txId: tx._id, orderId: youpiTx.orderId});
  }
}
```

### Step 4: Create Schemas

**File:** `src/adapters/youpi-pg/schemas/YoupiTransaction.ts`

```typescript
import mongoose from 'mongoose';

const youpiTransactionSchema = new mongoose.Schema({
  transactionId: {type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true},
  orderId: {type: String, unique: true, required: true},
  customerId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  amount: Number,
  paymentLink: String,
  expiresAt: Date,
  confirmedAt: Date,
  failureReason: String,
  createdAt: {type: Date, default: Date.now},
  updatedAt: Date
});

export const YoupiTransaction = mongoose.model('YoupiTransaction', youpiTransactionSchema);
```

### Step 5: Create Proprupee Routes

**File: `server.ts` - Add to transaction creation**

```typescript
app.post("/api/transactions", async (req, res) => {
  try {
    const payload = req.body;
    const transaction = await new Transaction(payload).save();

    if (payload.type === 'challenge_purchase' && payload.userId) {
      // ... existing ChallengePurchase creation ...

      // NEW: If YOUPI gateway enabled
      if (process.env.ENABLE_YOUPI_GATEWAY === 'true') {
        try {
          const youpiGateway = new YoupiPaymentGateway(
            process.env.YOUPI_API_KEY!,
            process.env.YOUPI_WEBHOOK_SECRET!,
            process.env.NODE_ENV !== 'production'
          );

          const youpiPayment = await youpiGateway.createPayment({
            amount: payload.amount, // Fee
            currency: 'INR',
            customerId: payload.userId,
            customerEmail: user?.email || '',
            orderDescription: `Challenge: ${payload.challengeName}`,
            orderId: `PROP-${transaction._id}`,
            notifyUrl: `${process.env.BACKEND_URL}/api/webhooks/youpi`,
            returnUrl: `${process.env.FRONTEND_URL}/challenges/success`,
            cancelUrl: `${process.env.FRONTEND_URL}/challenges`
          });

          // Save YOUPI transaction
          await YoupiTransaction.create({
            transactionId: transaction._id,
            orderId: youpiPayment.orderId,
            customerId: payload.userId,
            status: 'pending',
            amount: payload.amount,
            paymentLink: youpiPayment.paymentLink,
            expiresAt: new Date(youpiPayment.expiresAt)
          });

          return res.json({
            transaction,
            youpiPaymentLink: youpiPayment.paymentLink,
            redirectToPayment: true
          });
        } catch (error: any) {
          logger.error('YOUPI payment creation failed', error);
          // Fall back to manual approval
        }
      }

      return res.json({transaction, purchase});
    }

    res.json(transaction);
  } catch (err: any) {
    res.status(500).json({error: "Failed to create transaction", message: err.message});
  }
});

// Add webhook endpoint
app.post('/api/webhooks/youpi', async (req, res) => {
  const youpiGateway = new YoupiPaymentGateway(
    process.env.YOUPI_API_KEY!,
    process.env.YOUPI_WEBHOOK_SECRET!,
    process.env.NODE_ENV !== 'production'
  );

  const handler = new YoupiWebhookHandler(youpiGateway);
  await handler.handleWebhook(req, res);
});
```

### Step 6: Environment Variables

**File:** `.env.example` - Add:

```env
# YOUPI Payment Gateway
ENABLE_YOUPI_GATEWAY=false
YOUPI_API_KEY=
YOUPI_WEBHOOK_SECRET=
YOUPI_SANDBOX_MODE=true
BACKEND_URL=https://api.proprupee.com
FRONTEND_URL=https://proprupee.com
```

---

## TESTING PLAN

### Unit Tests

```typescript
// Test signature verification
test('verifies valid webhook signature', () => {
  const gateway = new YoupiPaymentGateway(apiKey, secret);
  const payload = {id: '123', status: 'completed'};
  const signature = generateSignature(payload, secret);
  expect(gateway.verifyWebhookSignature(payload, signature)).toBe(true);
});

// Test invalid signature
test('rejects invalid webhook signature', () => {
  const gateway = new YoupiPaymentGateway(apiKey, secret);
  expect(() => gateway.verifyWebhookSignature({}, 'wrong')).toThrow();
});
```

### Integration Tests

```typescript
// Test payment flow
test('complete challenge purchase with YOUPI payment', async () => {
  // 1. Create transaction
  const tx = await api.addTransaction({
    userId: 'test-user',
    type: 'challenge_purchase',
    amount: 5000,
    capital: 100000,
    challengeName: 'Advanced'
  });

  expect(tx.youpiPaymentLink).toBeDefined();

  // 2. Simulate webhook
  const webhook = {
    id: tx.youpiPaymentLink.split('/').pop(),
    status: 'completed',
    amount: 500000
  };

  const response = await api.post('/api/webhooks/youpi', webhook, {
    headers: {'x-youpi-signature': generateSignature(webhook, secret)}
  });

  expect(response.success).toBe(true);

  // 3. Verify transaction approved
  const updated = await Transaction.findById(tx._id);
  expect(updated.status).toBe('approved');
});
```

---

## SECURITY CONSIDERATIONS

### Secret Management
- [ ] Never log API keys or webhook secrets
- [ ] Store in environment variables only
- [ ] Rotate secrets monthly
- [ ] Use different keys for sandbox/production

### Signature Verification
- [ ] Always verify webhook signatures
- [ ] Use constant-time comparison to prevent timing attacks
- [ ] Log failed verifications
- [ ] Alert on repeated failures

### Idempotency
- [ ] Use idempotency key in YOUPI requests
- [ ] Prevent duplicate payment confirmations
- [ ] Use database transaction for atomic updates

### Rate Limiting
- [ ] Limit webhook endpoint to prevent abuse
- [ ] Implement exponential backoff for API calls
- [ ] Monitor for suspicious patterns

---

## ROLLBACK PLAN

If YOUPI integration fails:

1. **Disable YOUPI Flag:**
   ```env
   ENABLE_YOUPI_GATEWAY=false
   ```

2. **Revert to Manual Approval:**
   - Admin manually approves transactions
   - No user-facing impact

3. **Refund Transactions:**
   - If webhook processing failed
   - Use YOUPI refund API
   - Manual reconciliation may be needed

4. **Notify Users:**
   - Email notification if payment failed
   - Retry instructions

---

## SUCCESS METRICS

- [ ] 99.9% webhook delivery success
- [ ] < 5 second payment link generation
- [ ] < 100ms webhook processing time
- [ ] 0 duplicate payments in production
- [ ] 100% signature verification accuracy
- [ ] > 95% payment success rate

---

## NEXT STEPS

1. **Review this roadmap** with stakeholders
2. **Get API credentials** from YOUPI PG
3. **Start Phase 0** (Foundation)
4. **Implement demo adapter** first to validate architecture
5. **Begin Phase 1** (YOUPI adapter development)

---

