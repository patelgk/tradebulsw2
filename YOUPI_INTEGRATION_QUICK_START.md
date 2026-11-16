# YOUPI PG Integration - Quick Start Guide for Developers

**Last Updated:** November 15, 2026  
**Status:** Ready to implement  

---

## 30-SECOND SUMMARY

Proprupee currently has a **manual admin-approval payment system**. We want to integrate **YOUPI PG** to make payments automatic and instant.

**Status:** Ready (8.5/10 compatible)  
**Time:** 4-6 weeks  
**Difficulty:** Medium  
**Risk:** Low (isolated adapter pattern)  

---

## 5-MINUTE SETUP

### Step 1: Understand Current Architecture

```
User registers
    ↓
User buys challenge (₹5000 fee + ₹100,000 funding)
    ↓
Admin manually reviews
    ↓
Admin clicks "Approve" (≈ 24 hours later)
    ↓
User gets funded account
```

**Problem:** Takes 1-2 days. Not competitive.

**Solution:** Add YOUPI to make it instant.

```
User registers
    ↓
User clicks "Buy Challenge"
    ↓
Redirect to YOUPI payment page
    ↓
User pays via card/UPI
    ↓
YOUPI webhook confirms payment
    ↓
User account auto-funded (≈ 5 seconds)
```

### Step 2: What Files to Read

**Must Read (1 hour):**
1. `PROPRUPEE_PAYMENT_COMPATIBILITY_AUDIT.md` - Sections A, B, C
2. `YOUPI_INTEGRATION_ROADMAP.md` - Phases 0 & 1

**Nice to Have (30 min):**
3. Current payment approval code: `server.ts` (lines 1415-1631)
4. Transaction creation code: `server.ts` (lines 2025-2065)

### Step 3: Get Ready

**Environment Setup:**
```bash
# Clone repo if not done
git clone <repo>
cd tradebulsw2

# Install dependencies (when ready)
npm install crypto jsonwebtoken express-rate-limit

# Create feature branch
git checkout -b feature/youpi-pg-integration
```

**Add to .env:**
```env
ENABLE_YOUPI_GATEWAY=false
YOUPI_API_KEY=<get_from_youpi>
YOUPI_WEBHOOK_SECRET=<get_from_youpi>
YOUPI_SANDBOX_MODE=true
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Security Foundation (Week 1)

**File: `server.ts`**

- [ ] Add idempotency check to `/api/admin/payments/:id/approve`:
```typescript
// Line 1508 - Add this check
if (payment.status === 'approved') {
  return res.json({
    success: true,
    message: 'Already approved',
    payment: {...}
  });
}
```

- [ ] Add rate limiting to payment routes:
```typescript
import rateLimit from 'express-rate-limit';

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per 15 minutes
});

app.post('/api/transactions', paymentLimiter, async (req, res) => {...});
app.post('/api/withdraw', paymentLimiter, async (req, res) => {...});
```

- [ ] Remove hardcoded admin credentials:
```typescript
// Change this line (around 697):
// FROM:
if (mobile === "9691827337" && password === "888981") {
// TO:
if (mobile === process.env.ADMIN_MOBILE && password === process.env.ADMIN_PASSWORD) {
```

**Files: `.env.example`, `.env` (local)**

- [ ] Add:
```env
ADMIN_MOBILE=9691827337
ADMIN_PASSWORD=888981
```

- [ ] Update `.gitignore`:
```
.env
```

**File: `package.json`**

- [ ] Add (in devDependencies):
```json
"crypto": "built-in",
"jsonwebtoken": "^9.0.0"
```

### Phase 2: Adapter Structure (Week 2)

**Create directories:**
```bash
mkdir -p src/adapters/youpi-pg/tests
mkdir -p src/adapters/youpi-pg/schemas
mkdir -p src/adapters/youpi-pg/utils
```

**Create files:**

1. **`src/adapters/youpi-pg/YoupiPaymentGateway.ts`**
   - Copy template from `YOUPI_INTEGRATION_ROADMAP.md`
   - 100+ lines provided

2. **`src/adapters/youpi-pg/YoupiWebhookHandler.ts`**
   - Copy template from roadmap
   - 80+ lines provided

3. **`src/adapters/youpi-pg/schemas/YoupiTransaction.ts`**
   - Copy template from roadmap
   - 25+ lines provided

4. **`src/adapters/youpi-pg/schemas/YoupiWebhookLog.ts`**
   - Simple logging schema

5. **`src/adapters/youpi-pg/README.md`**
   - Document the adapter
   - Configuration guide

- [ ] Verify build passes:
```bash
npm run build
```

### Phase 3: Integration (Week 3-4)

**File: `db.ts`**

- [ ] Add new schemas:
```typescript
// At end of file
export const YoupiTransaction = mongoose.model('YoupiTransaction', youpiTransactionSchema);
export const YoupiWebhookLog = mongoose.model('YoupiWebhookLog', youpiWebhookLogSchema);
```

**File: `server.ts`**

- [ ] Import new gateway:
```typescript
import { YoupiPaymentGateway } from './adapters/youpi-pg/YoupiPaymentGateway.js';
import { YoupiWebhookHandler } from './adapters/youpi-pg/YoupiWebhookHandler.js';
```

- [ ] Add webhook endpoint (after line 2130):
```typescript
// YOUPI Webhook Handler
app.post('/api/webhooks/youpi', async (req, res) => {
  if (process.env.ENABLE_YOUPI_GATEWAY !== 'true') {
    return res.status(403).json({error: 'YOUPI gateway disabled'});
  }

  try {
    const youpiGateway = new YoupiPaymentGateway(
      process.env.YOUPI_API_KEY!,
      process.env.YOUPI_WEBHOOK_SECRET!,
      process.env.YOUPI_SANDBOX_MODE === 'true'
    );

    const handler = new YoupiWebhookHandler(youpiGateway);
    await handler.handleWebhook(req, res);
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({error: 'Webhook processing failed'});
  }
});
```

- [ ] Modify transaction creation (around line 2025):
```typescript
if (payload.type === 'challenge_purchase' && payload.userId) {
  // ... existing code ...

  // NEW: Add YOUPI gateway call
  if (process.env.ENABLE_YOUPI_GATEWAY === 'true') {
    try {
      const youpiGateway = new YoupiPaymentGateway(
        process.env.YOUPI_API_KEY!,
        process.env.YOUPI_WEBHOOK_SECRET!,
        process.env.YOUPI_SANDBOX_MODE === 'true'
      );

      const youpiPayment = await youpiGateway.createPayment({
        amount: payload.amount,
        currency: 'INR',
        customerId: payload.userId,
        customerEmail: user?.email,
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
        amount: payload.amount,
        paymentLink: youpiPayment.paymentLink,
        expiresAt: youpiPayment.expiresAt
      });

      return res.json({
        transaction,
        youpiPaymentLink: youpiPayment.paymentLink,
        redirectToPayment: true
      });
    } catch (error: any) {
      console.error('YOUPI gateway error:', error);
      // Fall back to manual approval
    }
  }

  return res.json({transaction, purchase});
}
```

### Phase 4: Testing & Deploy (Week 5-6)

**Local Testing:**
```bash
# Enable YOUPI in local .env
ENABLE_YOUPI_GATEWAY=true
YOUPI_SANDBOX_MODE=true

# Restart server
npm run dev

# Test payment creation
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "type": "challenge_purchase",
    "amount": 5000,
    "capital": 100000,
    "challengeName": "Advanced"
  }'
```

**Testing Checklist:**
- [ ] Payment link generation works
- [ ] Webhook signature verification works
- [ ] Webhook confirms payment
- [ ] Balance auto-updated
- [ ] Duplicate webhook handled
- [ ] Failed payment handled
- [ ] Error scenarios handled

---

## KEY FILES YOU'LL MODIFY

### Must Edit
1. **`server.ts`** - Add webhook + YOUPI call (~50 lines)
2. **`db.ts`** - Add schemas (~25 lines)
3. **`.env`** - Add credentials
4. **`.env.example`** - Add template
5. **`package.json`** - Add dependencies

### Will Create (New)
1. **`src/adapters/youpi-pg/YoupiPaymentGateway.ts`** (~100 lines)
2. **`src/adapters/youpi-pg/YoupiWebhookHandler.ts`** (~80 lines)
3. **`src/adapters/youpi-pg/schemas/YoupiTransaction.ts`** (~25 lines)
4. **`src/adapters/youpi-pg/schemas/YoupiWebhookLog.ts`** (~15 lines)

### Will NOT Touch
- ✅ Trading engine
- ✅ Market feed
- ✅ Authentication
- ✅ User models
- ✅ Challenge models

---

## TESTING STRATEGY

### Unit Tests (Test Individual Functions)

```typescript
// test/adapters/youpi-pg.test.ts

test('should create payment with YOUPI', async () => {
  const gateway = new YoupiPaymentGateway(apiKey, secret, true);
  const result = await gateway.createPayment({
    amount: 5000,
    customerId: 'user-123',
    orderId: 'order-456',
    // ... other fields
  });
  
  expect(result.paymentLink).toBeDefined();
  expect(result.orderId).toBe('order-456');
});

test('should verify webhook signature', () => {
  const gateway = new YoupiPaymentGateway(apiKey, secret, true);
  const payload = {id: '123', status: 'completed'};
  const validSig = generateSignature(payload, secret);
  
  expect(gateway.verifyWebhookSignature(payload, validSig)).toBe(true);
  expect(gateway.verifyWebhookSignature(payload, 'wrong')).toBe(false);
});
```

### Integration Tests (Test Full Flow)

```typescript
// test/integration/payment-flow.test.ts

test('complete challenge purchase with YOUPI', async () => {
  // 1. Create transaction
  const tx = await api.post('/api/transactions', {
    userId: 'test-user',
    type: 'challenge_purchase',
    amount: 5000,
    capital: 100000,
    challengeName: 'Advanced'
  });

  expect(tx.youpiPaymentLink).toBeDefined();

  // 2. Simulate webhook
  const webhook = {
    id: 'test-order-123',
    status: 'completed',
    amount: 500000,
    createdAt: new Date()
  };

  const signature = generateSignature(webhook, process.env.YOUPI_WEBHOOK_SECRET);
  
  await api.post('/api/webhooks/youpi', webhook, {
    headers: {'x-youpi-signature': signature}
  });

  // 3. Verify transaction approved
  const updated = await Transaction.findById(tx._id);
  expect(updated.status).toBe('approved');

  // 4. Verify user funded
  const user = await User.findOne({uid: 'test-user'});
  expect(user.balance).toBeGreaterThan(0);
});
```

### Manual Testing (Sandbox)

1. Get YOUPI sandbox credentials
2. Set `YOUPI_SANDBOX_MODE=true` in .env
3. Use real YOUPI payment page (sandbox mode)
4. Test all payment scenarios

---

## COMMON ISSUES & SOLUTIONS

### Issue: "YOUPI API credentials not found"
**Solution:**
```bash
# Make sure .env has:
YOUPI_API_KEY=your_key_here
YOUPI_WEBHOOK_SECRET=your_secret_here

# Check they're not empty:
grep YOUPI .env
```

### Issue: "Webhook signature verification failed"
**Solution:**
```typescript
// Make sure webhook secret matches YOUPI settings
// In YoupiPaymentGateway:
constructor(apiKey: string, webhookSecret: string) {
  this.webhookSecret = webhookSecret; // Must match YOUPI settings
}
```

### Issue: "Duplicate payment approval"
**Solution:**
Already fixed in Phase 1 (idempotency check).

### Issue: "Webhook not received"
**Solution:**
1. Check `notifyUrl` is publicly accessible
2. Check webhook is enabled in YOUPI dashboard
3. Check logs: `console.log('[Webhook]', req.body)`

### Issue: "Payment link redirect not working"
**Solution:**
1. Verify `redirectToPayment: true` returned
2. Check frontend handles `youpiPaymentLink`
3. Test URL is accessible

---

## DEBUGGING TIPS

### Enable Detailed Logging

**In `YoupiPaymentGateway.ts`:**
```typescript
async createPayment(req) {
  console.log('[YOUPI] Creating payment:', req);
  try {
    const response = await this.apiClient.post('/orders', payload);
    console.log('[YOUPI] Response:', response.data);
    return {...};
  } catch (error) {
    console.error('[YOUPI] Error:', error.response?.data || error.message);
    throw error;
  }
}
```

### Check Database Records

```bash
# MongoDB shell
db.youpi_transactions.find({})
db.youpi_webhook_logs.find({}).sort({createdAt: -1})
db.transactions.find({type: 'challenge_purchase'}).sort({createdAt: -1})
```

### Inspect Webhook Signature

```typescript
// In YoupiWebhookHandler
async handleWebhook(req, res) {
  const signature = req.headers['x-youpi-signature'];
  console.log('[Webhook] Received signature:', signature);
  console.log('[Webhook] Payload:', JSON.stringify(req.body));
  console.log('[Webhook] Verifying...');
  
  const verified = this.gateway.verifyWebhookSignature(req.body, signature);
  console.log('[Webhook] Verified:', verified);
  
  // ...
}
```

---

## QUICK REFERENCE: API ENDPOINTS

### Before Integration
```
POST /api/transactions
  → Creates pending transaction
  → Admin must approve

POST /api/admin/payments/:id/approve
  → Admin approves payment
  → User balance updated (24+ hours later)
```

### After Integration
```
POST /api/transactions
  → Creates pending transaction
  → Generates YOUPI payment link
  → Returns link to frontend

POST /webhooks/youpi (called by YOUPI)
  → Webhook confirms payment
  → Transaction auto-approved
  → User balance updated (5 seconds)
```

---

## GIT WORKFLOW

```bash
# Create branch
git checkout -b feature/youpi-pg-integration

# Implement Phase 1-4
# ... make changes ...

# Commit incrementally
git add -A
git commit -m "feat: add security foundation for YOUPI integration"
git commit -m "feat: create YOUPI payment adapter"
git commit -m "feat: integrate YOUPI with payment flow"
git commit -m "test: add YOUPI payment tests"

# Push and create PR
git push -u origin feature/youpi-pg-integration

# Create pull request
# Request review from security + backend leads
```

---

## ROLLBACK PROCEDURE

If something goes wrong:

```bash
# Option 1: Quick disable
# Edit .env and set:
ENABLE_YOUPI_GATEWAY=false

# Users revert to manual approval workflow automatically

# Option 2: Revert commits
git revert <commit-hash>
git push

# Option 3: Full rollback
git checkout main
git pull
# Server restarts automatically
```

---

## SUCCESS CHECKLIST

When complete, you'll be able to:

- [ ] User can click "Buy Challenge"
- [ ] Redirected to YOUPI payment page
- [ ] Enter card/UPI details
- [ ] Payment confirmed
- [ ] Webhook received
- [ ] Database updated
- [ ] User account funded
- [ ] Challenge activated
- [ ] User can start trading

All happening in < 5 seconds (vs 24+ hours manual).

---

## GETTING HELP

### Need Clarification?
1. Read: `PROPRUPEE_PAYMENT_COMPATIBILITY_AUDIT.md`
2. Check: Code examples in `YOUPI_INTEGRATION_ROADMAP.md`
3. Ask: Team lead or architecture review

### Stuck on Implementation?
1. Check: Error message in logs
2. Review: Similar code in project
3. Debug: Using tips above
4. Ask: Senior developer

### Need to Test?
1. Check: Testing strategy section
2. Run: Unit tests first
3. Run: Integration tests
4. Manual test in sandbox

---

## NEXT STEPS

1. **Today:** Read this quick start + audit summary
2. **Tomorrow:** Read full audit report
3. **This Week:** Implement Phase 1 (security)
4. **Next Week:** Implement Phase 2 (demo adapter)
5. **Week 3:** Start Phase 3 (YOUPI integration)

---

## RESOURCES

- **Audit Report:** `PROPRUPEE_PAYMENT_COMPATIBILITY_AUDIT.md`
- **Implementation Guide:** `YOUPI_INTEGRATION_ROADMAP.md`
- **Executive Summary:** `PAYMENT_AUDIT_SUMMARY.md`
- **Current Payment Code:** `server.ts` (lines 1415-2200)
- **Database Models:** `db.ts` (Transaction, ChallengePurchase, etc.)

---

**Good luck! You've got this! 🚀**

