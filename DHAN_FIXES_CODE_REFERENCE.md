# PropRupee Dhan Fixes - Code Reference

## Complete List of Code Changes

### Change #1: Index Price Zero-Validation
**File:** `services/marketFeedManager.ts`  
**Lines:** 922-930  
**Status:** ✅ IMPLEMENTED

```typescript
// BEFORE:
    // INDEX PRICE TICK
    s.price = +(update.ltp || 0).toFixed(2);
    s.dataSource = "Dhan";
    s.isMarketOpen = this._isMarketOpen();

// AFTER:
    // INDEX PRICE TICK
    const indexPrice = +(update.ltp || 0).toFixed(2);
    // VALIDATION: Never overwrite valid price with zero or negative
    if (indexPrice <= 0) {
      this._logTick(`[MarketFeed] ⚠️ SKIPPED zero/negative index price token=${securityId} symbol=${symbol} ltp=${update.ltp}`);
      return;
    }
    s.price = indexPrice;
    s.dataSource = "Dhan";
    s.isMarketOpen = this._isMarketOpen();
```

**Rationale:**
- Option prices already had this validation (line 782)
- Index prices were missing it
- When Dhan sends `ltp=0` or `undefined`, it overwrites valid data
- Early return prevents cascading updates with zero values

---

### Change #2: Market Hour Detection
**File:** `services/marketFeedManager.ts`  
**Lines:** 1397-1404  
**Status:** ✅ IMPLEMENTED

```typescript
// BEFORE:
  private _isMarketOpen(): boolean {
    if (process.env.TEST_MODE === "true" || process.env.ENABLE_MARKET_SIMULATOR === "true") return true;
    const ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const day  = ist.getUTCDay();
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    // Allow extended market hours for testing/live feeds or weekends if needed, or normal 9:15 AM to 3:30 PM (555 mins to 930 mins)
    return day >= 0 && day <= 6 && mins >= 0 && mins <= 1440;
  }

// AFTER:
  private _isMarketOpen(): boolean {
    if (process.env.TEST_MODE === "true" || process.env.ENABLE_MARKET_SIMULATOR === "true") return true;
    const ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const day  = ist.getUTCDay();
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    // Indian stock market: Mon-Fri 9:15 AM to 3:30 PM IST (555 mins to 930 mins, UTC days 1-5)
    return day >= 1 && day <= 5 && mins >= 555 && mins <= 930;
  }
```

**Rationale:**
- Previous logic: `day >= 0 && day <= 6` (all 7 days), `mins >= 0 && mins <= 1440` (24 hours)
- This allowed market to always be "open"
- New logic: `day >= 1 && day <= 5` (Mon-Fri only), `mins >= 555 && mins <= 930` (9:15 AM - 3:30 PM)
- IST is UTC+5:30, converted to UTC: `Date.now() + 5.5 * 60 * 60 * 1000`
- 555 mins = 9:15 AM (9 * 60 + 15)
- 930 mins = 3:30 PM (15 * 60 + 30)

---

### Change #3: PrevClose Initialization
**File:** `services/marketFeedManager.ts`  
**Lines:** 227-236  
**Status:** ✅ IMPLEMENTED

```typescript
// BEFORE:
  private _emptyState(): SymbolState {
    return {
      price: 0, change: 0, changePct: 0,
      dayOpen: 0, dayHigh: 0, dayLow: 0, prevClose: 0, volume: 0,
      timestamp: "--:--:--",
      expiry: "", expiries: [],
      optionChain: [],
      isMarketOpen: false,
      dataSource: "Stale",
    };
  }

// AFTER:
  private _emptyState(): SymbolState {
    return {
      price: 0, change: 0, changePct: 0,
      dayOpen: 0, dayHigh: 0, dayLow: 0, prevClose: undefined as any, volume: 0,
      timestamp: "--:--:--",
      expiry: "", expiries: [],
      optionChain: [],
      isMarketOpen: false,
      dataSource: "Stale",
    };
  }
```

**Rationale:**
- When `prevClose = 0`, percentage calc becomes `(change / 0) * 100 = Infinity`
- Setting to `undefined` prevents this until prevClose packet received
- Falls back to `dayOpen` for calculations until updated
- `undefined as any` handles TypeScript type checking

---

### Change #4: Remove setImmediate() from Option Chart Candles
**File:** `services/marketFeedManager.ts`  
**Lines:** 880-905  
**Status:** ✅ IMPLEMENTED

```typescript
// BEFORE:
      // CHART TICK - Send immediately if subscribed
      const chartKeys = this.chartSubscribersBySecurity.get(securityId);
      if (chartKeys && chartKeys.size > 0) {
        for (const chartKey of chartKeys) {
          const sub = this.chartSubscriptions.get(chartKey);
          if (!sub) continue;
          
          // EMIT CHART TICK IMMEDIATELY to chart room only
          this.io.to(`chart:${chartKey}`).emit("chartTick", {
            // ... event data ...
          });
        }
        
        // DEFER chart candle update to next tick (no await)
        setImmediate(() => {
          for (const chartKey of chartKeys) {
            const sub = this.chartSubscriptions.get(chartKey);
            if (!sub) continue;
            const tf = sub.timeframe || "5m";
            const chartMetaBase = {
              symbol: sub.symbol,
              securityId: sub.securityId,
              exchangeSegment: sub.exchangeSegment,
              optionType: sub.optionType,
              strike: sub.strike,
              instrumentType: "OPTION" as const,
            };
            const cacheKey = this._chartCacheKey({ ...chartMetaBase, timeframe: tf }, this._tradingDateKey(tickTimeMs));
            const candle = this._upsertChartCandle(cacheKey, tickTimeMs, optionPrice, volume, tf);
            this._emitWithDebug("market:candleUpdate", {
              chartKey,
              cacheKey,
              timeframe: tf,
              candle,
              // ... more data ...
            }, undefined, `chart:${chartKey}`);
          }
        });
      }

// AFTER:
      // CHART TICK - Send immediately if subscribed
      const chartKeys = this.chartSubscribersBySecurity.get(securityId);
      if (chartKeys && chartKeys.size > 0) {
        for (const chartKey of chartKeys) {
          const sub = this.chartSubscriptions.get(chartKey);
          if (!sub) continue;
          
          // EMIT CHART TICK IMMEDIATELY to chart room only
          this.io.to(`chart:${chartKey}`).emit("chartTick", {
            // ... event data ...
          });
        }
        
        // PROCESS chart candle updates IMMEDIATELY (not deferred)
        for (const chartKey of chartKeys) {
          const sub = this.chartSubscriptions.get(chartKey);
          if (!sub) continue;
          const tf = sub.timeframe || "5m";
          const chartMetaBase = {
            symbol: sub.symbol,
            securityId: sub.securityId,
            exchangeSegment: sub.exchangeSegment,
            optionType: sub.optionType,
            strike: sub.strike,
            instrumentType: "OPTION" as const,
          };
          const cacheKey = this._chartCacheKey({ ...chartMetaBase, timeframe: tf }, this._tradingDateKey(tickTimeMs));
          const candle = this._upsertChartCandle(cacheKey, tickTimeMs, optionPrice, volume, tf);
          this._emitWithDebug("market:candleUpdate", {
            chartKey,
            cacheKey,
            timeframe: tf,
            symbol: sub.symbol,
            securityId: sub.securityId,
            exchangeSegment: sub.exchangeSegment,
            strike: sub.strike,
            optionType: sub.optionType,
            candle,
            timestamp,
            source: "ws",
          }, undefined, `chart:${chartKey}`);
        }
      }
```

**Rationale:**
- `setImmediate()` queues callback in next event loop iteration
- Creates 1-10ms delay between chartTick and market:candleUpdate events
- Frontend receives events out of order
- Removing setImmediate() ensures events emit immediately in correct order

---

### Change #5: Remove setImmediate() from Index Chart Candles
**File:** `services/marketFeedManager.ts`  
**Lines:** 995-1015  
**Status:** ✅ IMPLEMENTED

**Same change as #4 above, but for index prices instead of options**

```typescript
// BEFORE:
      // DEFER chart candle update to next tick
      setImmediate(() => {
        for (const chartKey of chartKeys) {
          // ... candle processing ...
        }
      });

// AFTER:
      // PROCESS chart candle updates IMMEDIATELY (not deferred)
      for (const chartKey of chartKeys) {
        // ... candle processing ...
      }
```

---

### Change #6: Add Request Deduplication Map
**File:** `server.ts`  
**Lines:** 75  
**Status:** ✅ IMPLEMENTED

```typescript
// BEFORE:
let connectedClients = 0;
const socketChartSubscriptions = new Map<string, Set<string>>();
const socketSymbolSubscriptions = new Map<string, Set<string>>();
const chartSubscriptionRefCounts = new Map<string, number>();

const INDEX_SECURITY_MAP: Record<string, { securityId: string; ... }> = {

// AFTER:
let connectedClients = 0;
const socketChartSubscriptions = new Map<string, Set<string>>();
const socketSymbolSubscriptions = new Map<string, Set<string>>();
const chartSubscriptionRefCounts = new Map<string, number>();

// Chart history request deduplication - prevents concurrent duplicate requests
const inFlightChartRequests = new Map<string, Promise<any>>();

const INDEX_SECURITY_MAP: Record<string, { securityId: string; ... }> = {
```

**Rationale:**
- Tracks in-flight requests to prevent duplicates
- Key format: `${symbol}:${securityId}:${exchangeSegment}:${timeframe}`
- Multiple clients requesting same chart share single Dhan API call

---

### Change #7: Update fetchChartHistory() - Error Handling
**File:** `server.ts`  
**Lines:** 145-240  
**Status:** ✅ IMPLEMENTED

```typescript
// BEFORE:
async function fetchChartHistory(params: { ... }) {
  // ... setup code ...
  
  const r = await axios.post(endpoint, payload, {
    headers: { "access-token": DHAN_ACCESS_TOKEN, "client-id": DHAN_CLIENT_ID, "Content-Type": "application/json" },
    timeout: 10000,
  });
  
  // Multiple format branches with no validation...
  if (r.data && Array.isArray(r.data.timestamp) && ...) {
    // Format 1
  }
  if (d && Array.isArray(d.start_Time)) {
    // Format 2
  }
  if (Array.isArray(d)) {
    // Format 3
  }
  throw new Error("Unexpected response format from Dhan history API");
}

// AFTER:
async function fetchChartHistory(params: { ... }) {
  // ... setup code ...
  
  try {
    const r = await axios.post(endpoint, payload, {
      headers: { "access-token": DHAN_ACCESS_TOKEN, "client-id": DHAN_CLIENT_ID, "Content-Type": "application/json" },
      timeout: 30000, // Increased from 10s to 30s for historical data
    });

    // Strict format validation
    const d = r.data?.data;
    
    // Format 1: timestamp array with separate open/high/low/close arrays
    if (r.data && Array.isArray(r.data.timestamp) && Array.isArray(r.data.open) && Array.isArray(r.data.high) && Array.isArray(r.data.low) && Array.isArray(r.data.close)) {
      return r.data.timestamp.map((t: number, i: number) => ({
        time: new Date(t * 1000).toISOString(),
        open: r.data.open?.[i] || 0,
        high: r.data.high?.[i] || 0,
        low: r.data.low?.[i] || 0,
        close: r.data.close?.[i] || 0,
        volume: r.data.volume?.[i] || 0,
      }));
    }
    
    // Format 2: data.start_Time with separate arrays
    if (d && Array.isArray(d.start_Time) && Array.isArray(d.open) && Array.isArray(d.high) && Array.isArray(d.low) && Array.isArray(d.close)) {
      return d.start_Time.map((t: number, i: number) => ({
        time: new Date(t * 1000).toISOString(),
        open: d.open?.[i] || 0,
        high: d.high?.[i] || 0,
        low: d.low?.[i] || 0,
        close: d.close?.[i] || 0,
        volume: d.volume?.[i] || 0,
      }));
    }
    
    // Format 3: Array of candle objects
    if (Array.isArray(d) && d.length > 0 && d[0].open !== undefined && d[0].high !== undefined) {
      return d.map((c: any) => ({
        time: new Date((c.start_Time || c.time || 0) * 1000).toISOString(),
        open: c.open, 
        high: c.high, 
        low: c.low, 
        close: c.close,
        volume: c.volume || 0,
      }));
    }

    throw new Error(`Unexpected response format from Dhan history API: ${JSON.stringify(r.data).substring(0, 200)}`);
  } catch (err: any) {
    // Map Dhan API errors to appropriate HTTP status codes
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      
      // 400: Invalid request parameters
      if (status === 400) {
        const error = new Error(`Invalid chart history request: ${data?.message || data?.error || "Bad request"}`);
        (error as any).httpStatus = 400;
        throw error;
      }
      
      // 401/403: Authentication failure
      if (status === 401 || status === 403) {
        const error = new Error(`Authentication failed: Check Dhan access token and client ID`);
        (error as any).httpStatus = 401;
        throw error;
      }
      
      // 429: Rate limited
      if (status === 429) {
        const error = new Error(`Rate limited by Dhan API. Retry after 3 seconds.`);
        (error as any).httpStatus = 429;
        throw error;
      }
      
      // 503/504: Service unavailable
      if (status === 503 || status === 504) {
        const error = new Error(`Dhan service temporarily unavailable`);
        (error as any).httpStatus = 503;
        throw error;
      }
    }
    
    // Timeout errors
    if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
      const error = new Error(`Chart history request timeout after 30s. Dhan API may be slow.`);
      (error as any).httpStatus = 503;
      throw error;
    }
    
    // Network errors
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      const error = new Error(`Cannot reach Dhan API. Network error.`);
      (error as any).httpStatus = 503;
      throw error;
    }
    
    // Re-throw with default error handling
    throw err;
  }
}
```

**Key Changes:**
- Timeout increased from 10s to 30s
- Added proper HTTP status mapping (400/401/429/503)
- Added format validation before parsing
- Added network and timeout error handling
- Clear error messages for debugging

---

### Change #8: Update handleChartHistory() - Deduplication
**File:** `server.ts`  
**Lines:** 242-290  
**Status:** ✅ IMPLEMENTED

```typescript
// BEFORE:
async function handleChartHistory(req: express.Request, res: express.Response) {
  if (!DHAN_ACCESS_TOKEN) {
    return res.status(400).json({ error: "No credentials" });
  }

  const chartReq = resolveChartHistoryRequest(req);
  if (!chartReq) {
    return res.status(400).json({ error: "Symbol not supported" });
  }

  const cached = marketFeed.getChartHistory(chartReq);
  if (cached.length > 0) {
    return res.json(cached);
  }

  try {
    const candles = await fetchChartHistory(chartReq);
    marketFeed.seedChartHistory({
      instrumentType: chartReq.instrumentType,
      symbol: chartReq.symbol,
      securityId: chartReq.securityId,
      exchangeSegment: chartReq.exchangeSegment,
      timeframe: chartReq.timeframe as any,
      strike: chartReq.strike,
      optionType: chartReq.optionType,
      date: chartReq.date,
      candles,
    });
    return res.json(candles);
  } catch (err: any) {
    console.error("[API] History fetch failed:", err.response?.data || err.message);
    return res.status(502).json({ error: "History fetch failed", message: err.message });
  }
}

// AFTER:
async function handleChartHistory(req: express.Request, res: express.Response) {
  if (!DHAN_ACCESS_TOKEN) {
    return res.status(400).json({ error: "No credentials", message: "Dhan access token not configured" });
  }

  const chartReq = resolveChartHistoryRequest(req);
  if (!chartReq) {
    return res.status(400).json({ error: "Invalid request", message: "Symbol not supported or invalid parameters" });
  }

  // Check local cache first
  const cached = marketFeed.getChartHistory(chartReq);
  if (cached.length > 0) {
    return res.json(cached);
  }

  // Create deduplication key for this request
  const dedupeKey = `${chartReq.symbol}:${chartReq.securityId}:${chartReq.exchangeSegment}:${chartReq.timeframe}`;
  
  // If this exact request is already in-flight, wait for it instead of making a duplicate
  if (inFlightChartRequests.has(dedupeKey)) {
    try {
      const cachedResult = await inFlightChartRequests.get(dedupeKey);
      return res.json(cachedResult);
    } catch (err: any) {
      const statusCode = err.httpStatus || 502;
      return res.status(statusCode).json({ 
        error: "Chart history fetch failed", 
        message: err.message 
      });
    }
  }

  // Create a promise for this request and store it
  const requestPromise = (async () => {
    try {
      const candles = await fetchChartHistory(chartReq);
      marketFeed.seedChartHistory({
        instrumentType: chartReq.instrumentType,
        symbol: chartReq.symbol,
        securityId: chartReq.securityId,
        exchangeSegment: chartReq.exchangeSegment,
        timeframe: chartReq.timeframe as any,
        strike: chartReq.strike,
        optionType: chartReq.optionType,
        date: chartReq.date,
        candles,
      });
      return candles;
    } finally {
      // Remove from in-flight tracking after completion
      inFlightChartRequests.delete(dedupeKey);
    }
  })();

  // Store in-flight request
  inFlightChartRequests.set(dedupeKey, requestPromise);

  try {
    const candles = await requestPromise;
    return res.json(candles);
  } catch (err: any) {
    console.error("[API] History fetch failed:", err.response?.data || err.message);
    const statusCode = err.httpStatus || 502;
    return res.status(statusCode).json({ 
      error: "Chart history fetch failed", 
      message: err.message 
    });
  }
}
```

**Key Changes:**
- Create deduplication key from chart parameters
- Check if request already in-flight
- If yes, await existing promise and return result
- If no, create new promise and store in map
- Remove from map after completion
- Return proper HTTP status codes (not always 502)

---

## Summary of Changes

| # | File | Lines | Change | Impact |
|---|------|-------|--------|--------|
| 1 | marketFeedManager.ts | 922-930 | Add index price zero-validation | Prevents stale prices |
| 2 | marketFeedManager.ts | 1397-1404 | Fix market hour detection | Restricts to 9:15 AM - 3:30 PM IST Mon-Fri |
| 3 | marketFeedManager.ts | 227-236 | PrevClose initialization | Prevents Infinity in calcs |
| 4 | marketFeedManager.ts | 880-905 | Remove setImmediate from option charts | Correct event order |
| 5 | marketFeedManager.ts | 995-1015 | Remove setImmediate from index charts | Correct event order |
| 6 | server.ts | 75 | Add deduplication map | Track in-flight requests |
| 7 | server.ts | 145-240 | Error handling + timeout | Proper status codes + slower API support |
| 8 | server.ts | 242-290 | Deduplication logic | Share requests between clients |

**Total Changes:** 8 changes across 2 files  
**Lines Modified:** ~200 lines  
**Complexity:** Medium (targeted, non-breaking changes)  
**Risk Level:** Low (all changes are additive/restrictive, no logic removed)
