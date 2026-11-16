# PropRupee Dhan Fixes - Verification & Testing Guide

## Quick Start

### 1. Build and Deploy

```bash
cd d:\proprupee\tradebulsw2
npm run build
npm start
```

**Expected Build Output:**
```
✓ 2146 modules transformed.
✓ built in 1m 6s
```

### 2. Verify Environment Variables

Ensure `.env` file contains valid Dhan credentials:

```env
DHAN_CLIENT_ID=<your-client-id>
DHAN_ACCESS_TOKEN=<your-access-token>
NODE_ENV=production  # or development for testing
```

---

## Testing Each Fix

### Fix #1: Index Price Zero-Validation

**Expected Behavior:**
- Live prices should update smoothly for Nifty 50, Bank Nifty, Fin Nifty
- Stale/zero prices from Dhan should be rejected with a log message
- Prices should never display as 0.00 during market hours

**Test Steps:**
1. Open frontend during market hours (9:15 AM - 3:30 PM IST)
2. Monitor browser console for market data events
3. Check server logs for: `[MarketFeed] ⚠️ SKIPPED zero/negative index price`
4. Verify prices in UI update every 1-3 seconds

**Success Criteria:**
- ✅ No zero prices displayed in UI during market hours
- ✅ Log shows occasional skipped zero prices (expect <5 per minute)
- ✅ Prices change smoothly without jumping to 0.00

---

### Fix #2: Market Hour Detection

**Expected Behavior:**
- Market status should be **OPEN** only during Mon-Fri 9:15 AM - 3:30 PM IST
- Outside these hours, `isMarketOpen` should be `false`
- No price updates broadcast outside market hours
- Test mode override should allow testing outside hours

**Test Steps:**

**During Market Hours (9:15 AM - 3:30 PM IST):**
1. Check frontend market status indicator
2. Monitor WebSocket for price updates
3. Verify: `isMarketOpen: true`

**Outside Market Hours:**
1. Check market status (should be closed)
2. Verify: `isMarketOpen: false`
3. Confirm no new prices being broadcast

**Test with Simulator:**
```bash
TEST_MODE=true npm start
# or
ENABLE_MARKET_SIMULATOR=true npm start
```
- Market should show as always open
- Simulated prices should flow continuously

**Success Criteria:**
- ✅ Market closes at 3:30 PM IST on weekdays
- ✅ Market closed all day Saturday/Sunday
- ✅ Simulator overrides for testing
- ✅ Price broadcast stops outside market hours

---

### Fix #3: PrevClose Initialization

**Expected Behavior:**
- Change percentage should be calculated correctly
- No infinite/NaN values in percentage calculations
- Change should be based on `dayOpen` until `prevClose` packet received

**Test Steps:**
1. Monitor Socket.IO events for price updates
2. Check for `changePct` values
3. Verify calculations are correct: `changePct = ((price - dayOpen) / dayOpen) * 100`

**Example Event:**
```json
{
  "symbol": "Nifty 50",
  "price": 24150.45,
  "change": 150.25,
  "changePct": 0.63,
  "dayOpen": 24000.20,
  "prevClose": undefined
}
```

**Success Criteria:**
- ✅ No NaN values in changePct
- ✅ No Infinity values
- ✅ Percentages calculate correctly

---

### Fix #4: Chart Event Ordering

**Expected Behavior:**
- Chart candle updates should emit in correct order immediately after tick
- No gaps or out-of-order events
- Frontend chart should update smoothly without data corruption

**Test Steps:**
1. Subscribe to chart for Nifty 50 with 5m timeframe
2. Monitor WebSocket events
3. Check event sequence: `chartTick` → `market:candleUpdate`
4. Verify candle timestamps are consecutive

**Expected Event Sequence:**
```
chartTick (tick price)
  ↓
market:candleUpdate (candle aggregate)
  ↓
chartTick (next tick)
  ↓
market:candleUpdate (updated candle)
```

**Success Criteria:**
- ✅ Events emit in order immediately
- ✅ No 1-10ms delays between tick and candle update
- ✅ Chart displays without data corruption
- ✅ No duplicate candles created

---

### Fix #5 & #6: Chart API Error Handling & Deduplication

**Expected Behavior:**
- Chart history requests should return proper HTTP status codes
- Concurrent duplicate requests should share response
- Proper error messages for each error type

**Test Steps:**

#### Test Proper HTTP Status Codes

**Test 400 - Invalid Symbol:**
```bash
curl "http://localhost:3000/api/chart/history?symbol=INVALID_SYMBOL"
# Expected: 400 Bad Request
```

**Test 401 - Missing Credentials:**
```bash
# Unset DHAN_ACCESS_TOKEN and restart
TEST_MODE=false npm start
curl "http://localhost:3000/api/chart/history?symbol=Nifty%2050"
# Expected: 401 Unauthorized
```

**Test 429 - Rate Limited:**
```bash
# Make 10+ concurrent requests to same symbol
for i in {1..10}; do
  curl "http://localhost:3000/api/chart/history?symbol=Nifty%2050&timeframe=5m" &
done
# Expected: Some requests return 429 (Rate Limited)
```

**Test 503 - Timeout:**
- Momentarily disconnect network
- Request chart history
- Expected: 503 Service Unavailable

#### Test Request Deduplication

**Test Concurrent Requests:**
```javascript
// Frontend - make 5 concurrent requests for same chart
const requests = [];
for (let i = 0; i < 5; i++) {
  requests.push(
    fetch('/api/chart/history?symbol=Nifty%2050&timeframe=5m')
      .then(r => r.json())
  );
}

const results = await Promise.all(requests);
// All 5 should return same data
// Server logs should show only 1 Dhan API call
```

**Expected Server Log:**
```
[API] Chart request queued: Nifty 50:13:IDX_I:5m
[API] Chart fetching: Nifty 50:13:IDX_I:5m
[API] Chart candles: 123 (in 1500ms)
[API] Chart result: 5 clients (from 1 request)
```

**Success Criteria:**
- ✅ Invalid symbol → 400 Bad Request
- ✅ Missing credentials → 401 Unauthorized
- ✅ Rate limited → 429 Rate Limited
- ✅ Timeout → 503 Service Unavailable
- ✅ Network error → 503 Service Unavailable
- ✅ 5 concurrent requests = 1 Dhan API call
- ✅ Timeout increased to 30s (handles slow requests)

---

## Monitoring & Logs

### Key Log Messages to Look For

**Success Indicators:**
```
[MarketFeed] tick token=13 symbol=Nifty 50 price=24150.45
[MarketFeed] OI tick token=XXX symbol=... strike=24200 type=CE oi=1234567
```

**Warning Indicators (investigate if excessive):**
```
[MarketFeed] ⚠️ SKIPPED zero/negative index price token=13 symbol=Nifty 50 ltp=0
```

**Error Indicators (critical):**
```
[MarketFeed] LTP tick - NO ROW FOUND token=XXX symbol=...
[API] History fetch failed: Dhan service temporarily unavailable
```

### Checking Market Status

**Via Socket.IO:**
```javascript
socket.on('market:indexTick', (data) => {
  console.log('Market Status:', {
    isMarketOpen: data.isMarketOpen,
    timestamp: data.timestamp,
    price: data.price,
    source: data.source
  });
});
```

**Via HTTP:**
```bash
curl "http://localhost:3000/api/market/status"
# Should return current market state
```

---

## Regression Testing Checklist

- [ ] Nifty 50 prices update correctly (not stuck at 0)
- [ ] Bank Nifty prices update correctly
- [ ] Fin Nifty prices update correctly
- [ ] Chart for 5m timeframe loads in <2s
- [ ] Chart for 1h timeframe loads in <3s
- [ ] Chart for 1D timeframe loads in <5s
- [ ] Option chain CE/PE prices update
- [ ] Option chain OI updates
- [ ] Invalid symbol returns 400 error
- [ ] Chart history API returns proper status codes
- [ ] Concurrent chart requests are deduplicated
- [ ] Market closes at 3:30 PM IST
- [ ] No prices displayed outside market hours
- [ ] Simulator mode works (TEST_MODE=true)
- [ ] WebSocket reconnects after disconnect
- [ ] No data corruption in chart candles
- [ ] Change percentage calculations correct
- [ ] Previous close updates correctly

---

## Performance Benchmarks

**Before Fixes:**
- 502 errors on chart API
- Chart candles delayed 1-10ms
- Concurrent requests made duplicate Dhan calls
- Prices sometimes 0.00 or stale

**After Fixes:**
- Chart API <2s response (was timing out)
- Chart events emit immediately in order
- 5 concurrent requests = 1 Dhan API call
- Prices update every 1-3s consistently
- Proper error codes (400/401/429/503)

---

## Deployment Notes

### Production Deployment Steps

1. **Backup current state:**
   ```bash
   git commit -m "Pre-fix backup"
   ```

2. **Run full test suite:**
   ```bash
   npm test
   ```

3. **Build for production:**
   ```bash
   NODE_ENV=production npm run build
   ```

4. **Verify no breaking changes:**
   ```bash
   npm run lint
   ```

5. **Deploy:**
   ```bash
   npm start
   ```

6. **Monitor:**
   - Check logs for errors
   - Verify prices updating
   - Monitor API response times
   - Watch for rate limit errors

### Rollback Plan

If issues arise:
```bash
git revert <commit-hash>
npm run build
npm start
```

---

## Support & Debugging

### Common Issues

**Issue: Prices showing as 0.00**
- Check server logs for `SKIPPED zero/negative index price`
- Verify Dhan WebSocket is connected
- Check market hours (should be within 9:15 AM - 3:30 PM IST)

**Issue: Chart API returns 502**
- Check Dhan credentials in `.env`
- Verify network connectivity
- Check if Dhan service is down
- Try again (may be rate limited)

**Issue: Chart updates out of order**
- Verify `setImmediate()` was removed (should see "IMMEDIATELY" in logs)
- Check Socket.IO room subscriptions
- Verify frontend is processing events in order

**Issue: Rate limit errors (429)**
- Dhan limit is 1 request per 3 seconds
- Check for concurrent/duplicate requests
- Verify deduplication is working
- Wait 3+ seconds before retry

---

## Contact & Support

For issues with these fixes, check:
1. Server logs for error messages
2. This verification guide for expected behavior
3. DHAN_MARKET_DATA_FIXES_REPORT.md for technical details
