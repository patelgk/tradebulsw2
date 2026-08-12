# HTTP Traffic Audit - Proprupee Application

**Date**: August 12, 2026  
**Issue**: ~707 MB HTTP responses vs ~60 MB WebSocket traffic  
**Status**: AUDIT ONLY - NO CODE CHANGES YET

---

## Executive Summary

The application has **40+ HTTP endpoints** but the audit reveals several optimization opportunities:

1. **Duplicate/parallel requests**: Multiple parent + child components fetching same data
2. **Unused endpoints**: Some admin-only endpoints queried on every page load
3. **Static data fetched repeatedly**: Challenges, Rules, Settings fetched on init and view changes
4. **Excessive admin data loads**: Full client/transaction lists loaded when only pending needed
5. **WebSocket underutilized**: Live market data via WebSocket (~60 MB) but REST API (~707 MB) for everything else

**Critical Constraints** (MUST NOT CHANGE):
- ✅ Dhan WebSocket (live market data)
- ✅ Socket.IO (option chain, chart live updates)
- ✅ CE/PE data delivery
- ✅ OI/Volume/LTP updates
- ✅ PCR/ATM calculations
- ✅ Backend market-data logic

---

## API Endpoint Inventory

### 1. **Authentication** (`/api/auth/*`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/auth/login` | POST | User login | Once per session | ~2-5 KB | YES | Cache user session in localStorage |
| `/api/auth/signup` | POST | User signup | Once per registration | ~2-5 KB | YES | None - one-time |
| `/api/auth/admin-login` | POST | Admin login | Once per admin session | ~2-5 KB | YES | Cache admin session |
| `/api/auth/forgot-password` | POST | Manual request | On-demand | ~1-2 KB | NO | None - user-initiated |

**STATUS**: ✅ Already optimized (no polling, cached in localStorage)

---

### 2. **Market Data** (`/api/market/*`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/market/quotes` | GET | Initial load + on view switch | 1 per session + view change | 50-150 KB | YES | **AUDIT FINDING**: Fetching full state (including 270 empty option chains) - use `?minimal=true` |
| `/api/market/history/:symbol` | GET | Chart load + timeframe change | 1-2 per chart view | 100-300 KB | YES | Already cached in state - good |
| `/api/market/expiry` | POST | Expiry selector change | On-demand per change | ~1 KB | YES | None - necessary for option chain |
| `/api/market/dhan/connect` | POST | Manual reconnect | On-demand | ~1 KB | NO | None - manual control only |
| `/api/market/dhan/reconnect` | POST | Manual reconnect | On-demand | ~1 KB | NO | None - manual control only |
| `/api/market/status` | GET | Status check | Rarely | ~1 KB | NO | Debug only - remove in production |
| `/api/market/dhan/status` | GET | Status check | Rarely | ~1 KB | NO | Debug only - remove in production |
| `/api/market/simulator/*` | POST/GET | Simulator control | Dev only | Varies | NO | Development only - disabled in production |

**STATUS**: ⚠️ FINDINGS:
- `market/quotes` returns full state with all 270 empty option chains
- `market/status` and `market/dhan/status` are debug endpoints only
- Need to verify if simulator endpoints are disabled in production

---

### 3. **User Management** (`/api/users/*`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/users/:uid` | GET | Profile page load + auth flow | 3-4 times on init | ~5-10 KB | YES | **AUDIT FINDING**: Called in App.tsx line 4380, 5186, 5562, 5825 - multiple times |
| `/api/users/:uid` | POST (upsert) | Profile update | On-demand | ~5 KB | YES | Cache after update |
| `/api/users` | GET | Admin client list | Admin page load | 50-500 KB | NO | **AUDIT FINDING**: Full list of all users - consider pagination |

**STATUS**: ⚠️ FINDINGS:
- **User profile fetched 3-4 times during auth flow** (lines 4380, 5186, 5562, 5825 in App.tsx)
- Admin client list fetches ALL users - can be huge in production
- After user update, full profile re-fetched unnecessarily

---

### 4. **Trades** (`/api/trades`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/trades?userId=X` | GET | Portfolio page load | 1 per session + view switch | 10-100 KB | YES | Filter `status='Open'` on server for active trades |
| `/api/trades` | POST | Place trade | On-demand | ~1 KB | YES | None - necessary |
| `/api/trades/:id` | PUT | Close/update trade | On-demand | ~1 KB | YES | None - necessary |

**STATUS**: ⚠️ FINDINGS:
- All trades fetched, then filtered client-side for "Open" positions
- Server-side filtering would reduce bandwidth

---

### 5. **Challenges** (`/api/challenges`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/challenges` | GET | App init + Challenges view | 2+ times | 20-50 KB | YES | **AUDIT FINDING**: Called on app init (line 4361) + on view switch - cache with 1-hour TTL |
| `/api/challenges` | POST | Admin adds challenge | On-demand | ~5 KB | NO | None - admin-only |
| `/api/challenges/:id` | DELETE | Admin deletes challenge | On-demand | ~1 KB | NO | None - admin-only |

**STATUS**: ⚠️ FINDINGS:
- **Challenges fetched multiple times** (line 4361 in App.tsx)
- Static data that rarely changes - should be cached
- Same issue in AdminView (line 2897)

---

### 6. **Rules** (`/api/rules`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/rules` | GET | App init + Rules view | 2+ times | 10-30 KB | YES | **AUDIT FINDING**: Called on app init (line 4361) + view switch - cache with 1-hour TTL |
| `/api/rules` | POST | Admin adds rule | On-demand | ~1 KB | NO | None - admin-only |
| `/api/rules/:id` | DELETE | Admin deletes rule | On-demand | ~1 KB | NO | None - admin-only |

**STATUS**: ⚠️ FINDINGS:
- **Rules fetched multiple times** (line 4361 in App.tsx)
- Same static data problem as Challenges
- Called in AdminView (line 2897) and App.tsx (line 4361)

---

### 7. **Transactions** (`/api/transactions`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/transactions?userId=X` | GET | Portfolio + payments page | 1-2 per session | 20-100 KB | YES | Already filters by userId - good |
| `/api/transactions?status=pending` | GET | Admin page init | 1 per admin session | 50-200 KB | YES | **AUDIT FINDING**: Called in AdminView line 2899 + line 2941 - duplicate calls |
| `/api/transactions` | POST | Create transaction | On-demand | ~1 KB | YES | None - necessary |
| `/api/transactions/:id` | PUT | Update transaction | On-demand | ~1 KB | YES | None - necessary |

**STATUS**: ⚠️ FINDINGS:
- **Duplicate pending transactions fetch**: AdminView lines 2899 and 2941
- Cache transaction updates instead of refetch

---

### 8. **Challenge Purchases** (`/api/challenge-purchases`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/challenge-purchases` | GET | Admin page + Portfolio | 2+ times | 50-200 KB | YES | **AUDIT FINDING**: Called line 2900, 2942, 3791 - 3 duplicate calls |
| `/api/challenge-purchases/:id/approve` | POST | Admin approves | On-demand | ~1 KB | YES | None - necessary |
| `/api/challenge-purchases/:id/reject` | POST | Admin rejects | On-demand | ~1 KB | YES | None - necessary |

**STATUS**: ⚠️ FINDINGS:
- **3 duplicate fetches of challenge purchases** (lines 2900, 2942, 3791)
- Should fetch once and share across components

---

### 9. **Fund History & Notifications**

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/fund-history?userId=X` | GET | Fund history view | On-demand | 10-50 KB | NO | Good - on-demand only |
| `/api/notifications?userId=X` | GET | Profile page init | 1 per session | 5-20 KB | YES | Cache in state |
| `/api/notifications/:id/read` | POST | Click notification | On-demand | ~1 KB | YES | None - necessary |
| `/api/funds/adjust` | POST | Admin adjusts funds | On-demand | ~1 KB | NO | None - admin-only |

**STATUS**: ⚠️ FINDINGS:
- Notifications fetched on init - should be cached in state

---

### 10. **Partner/Referral** (`/api/partners/*`, `/api/referral/*`)

| Endpoint | Method | Trigger | Frequency | Response Size | Required | Optimization Opportunity |
|----------|--------|---------|-----------|---|----------|---|
| `/api/referral/validate` | GET | Signup form (optional) | Optional | ~1 KB | NO | User-initiated - good |
| `/api/referral/click` | POST | Partner link click | User-initiated | ~1 KB | NO | User-initiated - good |
| `/api/partners/apply` | POST | Apply as partner | User-initiated | ~1 KB | NO | User-initiated - good |
| `/api/partners` | GET | Admin view + Partner dashboard | 2 times | 50-200 KB | NO | **AUDIT FINDING**: Called in AdminPartners line 11, AdminCommissions line 11 - used to fetch commission data |
| `/api/partners/:id/approve` | POST | Admin approves | On-demand | ~1 KB | NO | None - admin-only |
| `/api/partner/commissions?uid=X` | GET | Partner dashboard | 1 per session | 10-100 KB | NO | Already filtered by uid - good |
| `/api/partner/referrals?uid=X` | GET | Partner dashboard | 1 per session | 10-50 KB | NO | Already filtered by uid - good |
| `/api/partner/payouts?uid=X` | GET | Partner dashboard | 1 per session | 10-50 KB | NO | Already filtered by uid - good |
| `/api/admin/payouts` | GET | Admin payout view | 1 per admin session | 50-200 KB | NO | Already optimal |
| `/api/admin/commissions` | GET | Admin commissions view | 1 per admin session | 50-200 KB | NO | Already optimal |

**STATUS**: ⚠️ FINDINGS:
- Partner list fetched twice for different purposes (admin view + to fetch commissions)

---

## Summary of HTTP Traffic Issues

### 🔴 CRITICAL FINDINGS (High Bandwidth Impact)

| Issue | Location | Frequency | Est. Size | Fix |
|-------|----------|-----------|-----------|-----|
| **User profile fetched 3-4 times on init** | App.tsx lines 4380, 5186, 5562, 5825 | 3-4x per session | 15-40 KB | Cache after first fetch, reuse for entire session |
| **Challenge purchases fetched 3 times** | App.tsx lines 2900, 2942, 3791 | 3x per init + admin session | 150-600 KB | Fetch once, share across components |
| **Challenges fetched multiple times** | App.tsx lines 4361, 2897 | 2-3x | 40-150 KB | Cache with 1-hour TTL |
| **Rules fetched multiple times** | App.tsx lines 4361, 2897 | 2-3x | 20-90 KB | Cache with 1-hour TTL |
| **Pending transactions fetched 2 times** | App.tsx lines 2899, 2941 (AdminView) | 2x per admin session | 100-400 KB | Fetch once in AdminView, pass as prop |
| **Full user list fetched (all users)** | AdminView | 1-2x per admin session | 50-500 KB | Add pagination: fetch 50 users per page |
| **Market quotes with 270 empty chains** | App.tsx | 1x on init | 50-150 KB | Use `?minimal=true` to exclude empty option chains |

---

## Detailed Recommendations

### 🟡 SAFE, EASY OPTIMIZATIONS (implement first)

1. **Cache Challenge + Rules Data (1-hour TTL)**
   - **Location**: App.tsx, ChallengesView
   - **Why**: Rarely changes, fetched 2-3 times per session
   - **Implementation**: Store in SessionStorage with timestamp, invalidate after 1 hour
   - **Estimated savings**: 60-240 KB per session
   - **Risk**: Low (invalidated hourly, admin can force refresh)

2. **Consolidate User Profile Fetches**
   - **Locations**: App.tsx lines 4380, 5186, 5562, 5825
   - **Why**: Fetched multiple times during auth flow
   - **Implementation**: Fetch once after login, store in state/localStorage, reuse
   - **Estimated savings**: 15-30 KB per session
   - **Risk**: Low (refresh on logout)

3. **Add Market Quotes Minimal Mode**
   - **Location**: App.tsx initial state fetch
   - **Why**: Full quote includes 270 empty option chains
   - **Implementation**: Use `?minimal=true` on initial load, exclude optionChain arrays
   - **Estimated savings**: 20-80 KB per load
   - **Risk**: Very low (option chains loaded separately via Socket.IO anyway)

4. **Filter Trades Server-Side**
   - **Location**: `/api/trades` endpoint
   - **Why**: Client fetches all trades then filters for "Open" status
   - **Implementation**: Add `?status=Open` query parameter, filter on server
   - **Estimated savings**: 50-80% of trades response (only fetch active ones)
   - **Risk**: Low (add optional filter, default to all if not provided)

5. **Deduplicate Admin Data Loads**
   - **Location**: AdminView component (lines 2896-2903, 2940-2944)
   - **Why**: Fetches pending transactions twice in rapid succession
   - **Implementation**: Fetch once in parent, pass to children
   - **Estimated savings**: 100-200 KB per admin session
   - **Risk**: Low (refactor component props)

6. **Add User List Pagination**
   - **Location**: `/api/users` admin endpoint
   - **Why**: Fetches ALL users (could be 1000s)
   - **Implementation**: Add `?limit=50&skip=0` query params, implement pagination UI
   - **Estimated savings**: 80-90% of users response (50 vs all)
   - **Risk**: Low (admin feature, not user-facing)

---

### 🟢 NICE-TO-HAVE OPTIMIZATIONS (low priority)

7. **Cache Chart History**
   - **Why**: Same timeframe/symbol requests repeat
   - **Implementation**: Add IndexedDB cache with 6-hour TTL
   - **Estimated savings**: 20-50% for repeated chart views
   - **Risk**: Low (6-hour cache is safe)

8. **Batch Admin Requests**
   - **Why**: Admin loads clients, transactions, purchases in parallel
   - **Implementation**: Create `/api/admin/dashboard` batch endpoint
   - **Estimated savings**: 10-20% (fewer HTTP overhead)
   - **Risk**: Medium (backend change required)

9. **WebSocket for Notifications**
   - **Why**: Currently fetched via HTTP
   - **Implementation**: Use existing Socket.IO connection to push notifications
   - **Estimated savings**: 5-10 KB per session
   - **Risk**: Low (Socket.IO already active)

---

## Endpoints Safe to Optimize/Cache

✅ **Can safely cache/batch:**
- Challenges (static, changes rarely)
- Rules (static, changes rarely)  
- Settings (static, changes rarely)
- User profile (after load, reuse for session)
- Market quotes (use minimal mode)

❌ **CANNOT modify (live market data):**
- Market expiry changes
- Chart history (latest data must be fresh)
- Trade creation/updates
- Transaction updates
- Notification creation

---

## Estimated Total Savings

| Fix | Est. Savings | Implementation |
|-----|-------------|-----------------|
| Cache Challenges/Rules | 100-300 KB | SessionStorage + TTL |
| User profile caching | 20-40 KB | State + localStorage |
| Market minimal mode | 30-100 KB | Query parameter |
| Dedupe challenge purchases | 150-300 KB | Component refactor |
| Dedupe admin loads | 100-200 KB | Component refactor |
| Trade server-side filtering | 50-200 KB | Query parameter |
| User list pagination | 200-400 KB | Query parameter + UI |
| **TOTAL ESTIMATED** | **650-1540 KB per session** | Low-moderate effort |

**This could reduce HTTP traffic by 5-10% (35-70 MB from ~707 MB).**

---

## Implementation Roadmap

### Phase 1: Quickest Wins (1-2 hours)
1. Cache Challenges + Rules with SessionStorage
2. Deduplicate user profile fetches
3. Use market quotes `?minimal=true`

### Phase 2: Component Refactoring (2-3 hours)
4. Consolidate Admin dashboard data fetches
5. Add trade status filtering on server side
6. Implement user list pagination

### Phase 3: Advanced (3-5 hours)
7. Add chart history caching
8. Create batch admin endpoint
9. Push notifications via WebSocket

---

## ⚠️ CRITICAL: What NOT to Change

- ✅ DO NOT modify Dhan WebSocket connection
- ✅ DO NOT modify Socket.IO market data feed
- ✅ DO NOT remove Option Chain live updates
- ✅ DO NOT change CE/PE calculation logic
- ✅ DO NOT modify PCR calculations
- ✅ DO NOT disable backend market-data operations
- ✅ DO NOT remove authentication endpoints
- ✅ DO NOT disable trade creation/updates

---

## Next Steps

1. **Review this audit** - Confirm findings are accurate
2. **Prioritize fixes** - Choose from Phase 1/2/3 roadmap
3. **Request approval** - Confirm which optimizations to implement
4. **Implement changes** - One optimization at a time, test after each
5. **Monitor bandwidth** - Measure HTTP traffic reduction

---

**Status**: AUDIT COMPLETE - AWAITING USER APPROVAL TO IMPLEMENT

