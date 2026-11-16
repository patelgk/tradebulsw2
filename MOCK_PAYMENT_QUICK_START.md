# Mock Payment Demo - Quick Start Guide

**Status:** ✅ Implementation Complete - Ready to Use

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Enable Mock Payment
Edit `.env` (or create from `.env.example`):
```env
NODE_ENV=development
ENABLE_MOCK_PAYMENT=true
```

### Step 2: Install Dependencies
```bash
npm install
cd backend && npm install
```

### Step 3: Start Backend
```bash
npm run dev:backend
```

### Step 4: Test Health
```bash
curl http://localhost:3000/api/demo/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-11-15T...",
  "isDemo": true,
  "message": "Demo payment gateway is healthy"
}
```

---

## 🧪 Run Tests

### All Tests
```bash
cd backend
npm test
```

### Mock Payment Tests Only
```bash
cd backend
npm run test:mock-payment
```

### Watch Mode
```bash
cd backend
npm run test:watch
```

Expected: **60+ tests passing** ✅

---

## 📋 Common Tasks

### 1. Create Demo User
```bash
curl -X POST http://localhost:3000/api/demo/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@test.local",
    "name": "Demo User"
  }'
```

Response includes: `demoUserId`

### 2. Create Demo Transaction
```bash
curl -X POST http://localhost:3000/api/demo/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "demoUserId": "<from-step-1>",
    "type": "demo_deposit",
    "amount": 5000,
    "challengeName": "30-Day Challenge"
  }'
```

Response includes: `demoOrderId`

### 3. Simulate Payment Success
```bash
curl -X POST http://localhost:3000/api/demo/webhook-simulate/success \
  -H "Content-Type: application/json" \
  -d '{
    "demoOrderId": "<from-step-2>"
  }'
```

### 4. Simulate Payment Failure
```bash
curl -X POST http://localhost:3000/api/demo/webhook-simulate/failure \
  -H "Content-Type: application/json" \
  -d '{
    "demoOrderId": "<from-step-2>",
    "reason": "Card declined"
  }'
```

### 5. View Statistics
```bash
curl http://localhost:3000/api/demo/admin/stats
```

### 6. View All Transactions
```bash
curl http://localhost:3000/api/demo/admin/transactions
```

### 7. Clear Demo Data
```bash
curl -X POST http://localhost:3000/api/demo/admin/clear-data
```

---

## 🔍 Check Status

```bash
curl http://localhost:3000/api/demo/status
```

Shows:
- Gateway enabled/disabled status
- Total orders
- Success/failure counts
- Data isolation verification

---

## ⚠️ Important Notes

### Development Only ✅
- Demo routes **disabled in production** (NODE_ENV check)
- Safe to deploy (no production access possible)
- All demo data marked with `isDemo: true` flag

### No Real Payments ✅
- No connection to YOUPI or payment providers
- No real credentials used
- All amounts validated locally
- Complete simulation only

### Data Isolation ✅
- Demo data stored in-memory only
- Zero writes to production database
- Automatically cleared on server restart
- Separate from `User`, `Transaction`, `Challenge` collections

---

## 📂 What Was Created

### Core Files
- `src/adapters/mock-payment/MockPaymentGateway.ts` - Mock gateway (214 lines)
- `src/adapters/mock-payment/DemoModels.ts` - Demo data models (358 lines)
- `src/adapters/mock-payment/mockPaymentRoutes.ts` - API routes (370 lines)
- `src/adapters/mock-payment/__tests__/mockPayment.test.ts` - Tests (650+ lines)

### Configuration
- `backend/jest.config.js` - Jest configuration
- `.env.example` - Updated with ENABLE_MOCK_PAYMENT
- `backend/package.json` - Updated with test scripts & dependencies

### Integration
- `server.ts` - Added mock payment route import and registration

### Documentation
- This file (Quick Start Guide)
- `MOCK_PAYMENT_DEMO_IMPLEMENTATION_REPORT.md` - Comprehensive report

---

## 🛑 Troubleshooting

### Routes returning 403?
```env
# Make sure these are set:
NODE_ENV=development
ENABLE_MOCK_PAYMENT=true
```

### Tests failing?
```bash
# Install dependencies
cd backend && npm install

# Run tests
npm test

# If still failing, check error messages
```

### No demo users in /api/demo/users?
```bash
# Create one first:
curl -X POST http://localhost:3000/api/demo/users/create \
  -H "Content-Type: application/json" \
  -d '{"email":"test@demo.local","name":"Test User"}'
```

### Data disappeared after server restart?
This is **expected** - demo data is in-memory only and cleared on restart.

---

## 📚 Documentation

For detailed information, see:
- **`MOCK_PAYMENT_DEMO_IMPLEMENTATION_REPORT.md`** - Complete technical details
  - Test scenarios (60+ tests)
  - API endpoint documentation
  - Architecture decisions
  - Production safety measures
  - Verification checklist

---

## ✅ Verification

### All Systems Ready When:
- ✅ Backend starts without errors
- ✅ `/api/demo/health` returns 200 OK
- ✅ `npm test` shows 60+ passing tests
- ✅ `/api/demo/status` shows gateway enabled
- ✅ Demo user creation succeeds
- ✅ Demo transaction creation succeeds
- ✅ Payment simulation works

---

## 🎯 Next Steps

1. **Test Locally**
   - Start server and run tests
   - Create demo user and transactions
   - Simulate payment success/failure

2. **Integrate UI** (Optional)
   - Create React components for demo dashboard
   - Add buttons to simulate payments
   - Display transaction history

3. **Share with Team**
   - Send this guide to team members
   - Demo the workflow
   - Gather feedback

---

## 📞 Support

For issues or questions, check:
1. Error message in console
2. Test output (`npm test`)
3. Status endpoint (`/api/demo/status`)
4. Implementation report for detailed troubleshooting

---

**Quick Reference Cards:**

### Authentication Header
```
Not needed for demo endpoints
All demo endpoints are public (development only)
```

### Response Format
```json
{
  "success": true,
  "isDemo": true,
  "data": { /* ... */ },
  "warning": "⚠️ THIS IS DEMO/TEST DATA ONLY"
}
```

### Error Response
```json
{
  "error": "Error message",
  "isDemo": true
}
```

---

**Status:** Production-Safe ✅ | Thoroughly Tested ✅ | Ready to Use ✅
