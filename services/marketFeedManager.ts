/**
 * Market Feed Manager
 *
 * Architecture:
 *   DhanMarketFeed (single WS) → MarketFeedManager → Socket.IO broadcast → 100+ clients
 *
 * Rate limiting: Dhan option chain API = 1 req per 3 seconds
 * Cache: expiry list cached until midnight, option chain cached 5 minutes
 * Request queue: prevents simultaneous fetches for same symbol
 */

import axios from "axios";
import { Server as SocketIOServer } from "socket.io";
import { DhanMarketFeed, DhanInstrument, TickerUpdate, QuoteUpdate } from "./dhanMarketFeed.js";
import { db } from "../src/db.client.js";

// ─── Index Registry ───────────────────────────────────────────────────────────

export const ALL_SYMBOLS = [
  "Nifty 50",
  "Bank Nifty",
  "Fin Nifty",
  "Midcap Select",
  "Nifty Next 50",
  "SENSEX",
  "Bankex",
] as const;

export type SymbolName = typeof ALL_SYMBOLS[number];

// Verified Dhan Security IDs
const SECURITY_TO_SYMBOL: Record<string, SymbolName> = {
  "13":  "Nifty 50",
  "25":  "Bank Nifty",
  "27":  "Fin Nifty",
  "442": "Midcap Select",
  "28":  "Nifty Next 50",
  "51":  "SENSEX",
  "10":  "Bankex",
};

const SYMBOL_TO_SCRIP: Record<SymbolName, { scrip: number; seg: string }> = {
  "Nifty 50":     { scrip: 13,  seg: "IDX_I" },
  "Bank Nifty":   { scrip: 25,  seg: "IDX_I" },
  "Fin Nifty":    { scrip: 27,  seg: "IDX_I" },
  "Midcap Select":{ scrip: 442, seg: "IDX_I" },
  "Nifty Next 50":{ scrip: 28,  seg: "IDX_I" },
  "SENSEX":       { scrip: 51,  seg: "IDX_I" },
  "Bankex":       { scrip: 10,  seg: "IDX_I" },
};

// Lot sizes per symbol
export const LOT_SIZES: Record<SymbolName, number> = {
  "Nifty 50":      50,
  "Bank Nifty":    15,
  "Fin Nifty":     40,
  "Midcap Select": 75,
  "Nifty Next 50": 25,
  "SENSEX":        20,
  "Bankex":        15,
};

// Instruments to subscribe via WebSocket
const INSTRUMENTS: DhanInstrument[] = ALL_SYMBOLS.map(sym => ({
  ExchangeSegment: "IDX_I",
  SecurityId: String(SYMBOL_TO_SCRIP[sym].scrip),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OptionStrike {
  strike:       number;
  ce_ltp:       number;
  ce_oi:        number;
  ce_oi_change: number;
  ce_security_id?: string;
  ce_volume?:   number;
  ce_change?:   number;
  ce_change_pct?: number;
  ce_iv?:       number;
  ce_delta?:    number;
  pe_ltp:       number;
  pe_oi:        number;
  pe_oi_change: number;
  pe_security_id?: string;
  pe_volume?:   number;
  pe_change?:   number;
  pe_change_pct?: number;
  pe_iv?:       number;
  pe_delta?:    number;
}

export interface SymbolState {
  price:       number;
  change:      number;
  changePct:   number;
  dayOpen:     number;
  dayHigh:     number;
  dayLow:      number;
  prevClose:   number;
  volume:      number;
  timestamp:   string;
  expiry:      string;
  expiries:    string[];
  optionChain: OptionStrike[];
  isMarketOpen:boolean;
  dataSource:  "Dhan" | "Stale";
}

export interface ChartSubscription {
  chartKey: string;
  symbol: string;
  securityId: string;
  exchangeSegment: "IDX_I" | "NSE_FNO";
  instrument: "INDEX" | "OPTIDX";
  timeframe?: "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "1D";
  strike?: number;
  optionType?: "CE" | "PE";
}

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type SimulatedFeedUpdate = TickerUpdate | QuoteUpdate;

interface OptionSecurityMeta {
  symbol: SymbolName;
  strike: number;
  optionType: "CE" | "PE";
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private lastRequestTime = 0;
  private processing = false;
  private readonly minIntervalMs: number;

  constructor(minIntervalMs = 3100) { // Dhan: 1 req per 3s
    this.minIntervalMs = minIntervalMs;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await fn()); } catch (e) { reject(e); }
      });
      if (!this.processing) this._process();
    });
  }

  private async _process() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      const now = Date.now();
      const wait = this.minIntervalMs - (now - this.lastRequestTime);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      this.lastRequestTime = Date.now();
      await task();
    }
    this.processing = false;
  }
}

// ─── MarketFeedManager ───────────────────────────────────────────────────────

export class MarketFeedManager {
  private feed: DhanMarketFeed;
  private io: SocketIOServer;
  private state: Record<string, SymbolState> = {};
  private rateLimiter = new RateLimiter(3100);
  private chartSubscriptions = new Map<string, ChartSubscription>();
  private chartSubscribersBySecurity = new Map<string, Set<string>>();
  private chartHistory = new Map<string, ChartCandle[]>();
  private optionSecurityMeta = new Map<string, OptionSecurityMeta>();
  private optionSecurityRefs = new Map<string, number>();
  private optionChainWsTokensBySymbol = new Map<SymbolName, Set<string>>();
  private securityOi = new Map<string, number>();
  private lastTickLogAt = 0;
  private simulatorActive = false;
  private optionRestFallbackTimer: NodeJS.Timeout | null = null;
  private optionRestFallbackCursor = 0;
  private lastOptionWsTickAt = 0;

  // Cache timestamps
  private optionChainLastFetch: Record<string, number> = {};
  private expiryLastFetch:      Record<string, number> = {};
  private readonly OC_CACHE_MS      = 5 * 60 * 1000;  // 5 minutes
  private readonly OPTION_CHAIN_WS_STRIKE_RANGE = Math.max(0, Number(process.env.OPTION_CHAIN_WS_STRIKE_RANGE || 10));
  private readonly OPTION_REST_FALLBACK_MS = 3100;    // Dhan option-chain API allows 1 req / 3s
  private readonly OPTION_WS_STALE_MS      = 5000;
  private readonly EXPIRY_CACHE_MS  = 60 * 60 * 1000; // 1 hour
  private inFlightFetch: Set<string> = new Set();

  constructor(
    private readonly clientId: string,
    private readonly accessToken: string,
    io: SocketIOServer
  ) {
    this.io = io;
    this.feed = new DhanMarketFeed(clientId, accessToken);
    for (const symbol of ALL_SYMBOLS) {
      this.state[symbol] = this._emptyState();
    }
    this._setupFeedHandlers();
  }

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

  // ─── Public API ─────────────────────────────────────────────────────────────

  start() {
    if (process.env.DISABLE_DHAN_WS === "true") {
      console.log("[MarketFeed] DISABLE_DHAN_WS=true — Dhan WebSocket skipped.");
      return;
    }
    if (!this.clientId || !this.accessToken) {
      console.warn("[MarketFeed] ⚠️ Missing Dhan credentials — WebSocket not started.");
      return;
    }
    console.log("[MarketFeed] Starting Dhan WebSocket connection...");
    this.feed.setInstruments(INSTRUMENTS, 17); // 17 = Quote (OHLCV + LTP)
    this.feed.connect();
    this._startOptionRestFallback();
    // Stagger option chain fetches to avoid rate limits
    if (process.env.DISABLE_DHAN_AUTOFETCH !== "true") {
      setTimeout(() => this._refreshAllOptionChains(), 5000);
    }
  }

  stop() {
    this.feed.disconnect();
    this._stopOptionRestFallback();
  }

  private _startOptionRestFallback() {
    if (this.optionRestFallbackTimer || process.env.DISABLE_DHAN_AUTOFETCH === "true") return;
    this.optionRestFallbackTimer = setInterval(() => {
      void this._refreshOneOptionChainFallback();
    }, this.OPTION_REST_FALLBACK_MS);
  }

  private _stopOptionRestFallback() {
    if (!this.optionRestFallbackTimer) return;
    clearInterval(this.optionRestFallbackTimer);
    this.optionRestFallbackTimer = null;
  }

  private async _refreshOneOptionChainFallback() {
    if (this.simulatorActive || !this._isMarketOpen()) return;
    if (Date.now() - this.lastOptionWsTickAt < this.OPTION_WS_STALE_MS) return;

    const loadedSymbols = ALL_SYMBOLS.filter(symbol => {
      const state = this.state[symbol];
      return state?.expiry && state.optionChain?.length > 0;
    });
    if (!loadedSymbols.length) return;

    const symbol = loadedSymbols[this.optionRestFallbackCursor % loadedSymbols.length];
    this.optionRestFallbackCursor = (this.optionRestFallbackCursor + 1) % loadedSymbols.length;

    try {
      await this._fetchOptionChain(symbol, true);
    } catch (err: any) {
      console.error(`[MarketFeed] option REST fallback failed (${symbol}):`, err.message);
    }
  }

  getState(): Record<string, SymbolState> { return this.state; }
  getSymbolState(symbol: string): SymbolState | undefined { return this.state[symbol]; }
  isConnected(): boolean { return this.feed.isActive(); }
  getAllSymbols(): readonly string[] { return ALL_SYMBOLS; }
  isSimulatorActive(): boolean { return this.simulatorActive; }

  setSimulatorActive(active: boolean) {
    this.simulatorActive = active;
    console.log(`[MarketFeed] development simulator ${active ? "enabled" : "disabled"}`);
  }

  injectSimulatedTick(update: SimulatedFeedUpdate) {
    if (!this._isSimulatorAllowed()) {
      console.warn("[MarketFeed] blocked simulator tick because production safety guard failed.");
      return;
    }
    this._handleUpdate(update);
  }

  seedSimulatedOptionChain(symbol: SymbolName, chain: OptionStrike[], expiry: string) {
    if (!this._isSimulatorAllowed()) {
      console.warn("[MarketFeed] blocked simulator option-chain seed because production safety guard failed.");
      return;
    }
    if (!this.state[symbol]) return;

    this.state[symbol] = {
      ...this.state[symbol],
      expiry,
      expiries: [expiry],
      optionChain: chain,
      isMarketOpen: true,
      dataSource: "Dhan",
      timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }),
    };
    this.optionChainLastFetch[symbol] = Date.now();

    let tokenCount = 0;
    for (const row of chain) {
      if (row.ce_security_id) {
        const token = this._normalizeSecurityId(row.ce_security_id);
        this.optionSecurityMeta.set(token, { symbol, strike: row.strike, optionType: "CE" });
        this.optionSecurityRefs.set(token, Math.max(this.optionSecurityRefs.get(token) || 0, 1));
        this.securityOi.set(token, row.ce_oi);
        tokenCount++;
      }
      if (row.pe_security_id) {
        const token = this._normalizeSecurityId(row.pe_security_id);
        this.optionSecurityMeta.set(token, { symbol, strike: row.strike, optionType: "PE" });
        this.optionSecurityRefs.set(token, Math.max(this.optionSecurityRefs.get(token) || 0, 1));
        this.securityOi.set(token, row.pe_oi);
        tokenCount++;
      }
    }

    console.log(`[MarketSimulator] seeded option chain symbol=${symbol} rows=${chain.length} tokens=${tokenCount}`);
    this.io.emit("marketUpdate", { [symbol]: this.state[symbol] });
    this.io.emit("optionChain:update", { symbol, expiry, optionChain: chain });
  }

  private _tradingDateKey(ts = Date.now()) {
    const d = new Date(ts + 5.5 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }

  private _normalizeSecurityId(securityId: string | number) {
    return String(securityId);
  }

  private _isSimulatorAllowed() {
    return process.env.NODE_ENV !== "production" && (
      process.env.TEST_MODE === "true" ||
      process.env.NODE_ENV === "development" ||
      process.env.ENABLE_MARKET_SIMULATOR === "true"
    );
  }

  private _isSimulatedSecurityId(securityId: string | number) {
    return this._normalizeSecurityId(securityId).startsWith("SIM_");
  }

  private _chartCacheKey(meta: { instrumentType: "INDEX" | "OPTION"; symbol: string; securityId: string; exchangeSegment: string; timeframe: string; strike?: number; optionType?: string }, date = this._tradingDateKey()) {
    const parts = [
      meta.instrumentType,
      meta.symbol,
      meta.securityId,
      meta.exchangeSegment,
      meta.timeframe,
      date,
    ];
    if (meta.instrumentType === "OPTION") {
      parts.splice(2, 0, meta.strike ? String(meta.strike) : "0", meta.optionType || "");
    }
    return parts.join(":");
  }

  private _bucketStart(tsMs: number, timeframe: ChartSubscription["timeframe"] | undefined) {
    const tf = timeframe || "5m";
    const ms = tf === "1m" ? 60_000
      : tf === "3m" ? 180_000
      : tf === "5m" ? 300_000
      : tf === "15m" ? 900_000
      : tf === "30m" ? 1_800_000
      : tf === "1h" ? 3_600_000
      : 86_400_000;
    if (tf === "1D") {
      const ist = tsMs + 5.5 * 60 * 60 * 1000;
      const start = Math.floor(ist / ms) * ms;
      return start - 5.5 * 60 * 60 * 1000;
    }
    return Math.floor(tsMs / ms) * ms;
  }

  private _upsertChartCandle(key: string, tickTimeMs: number, price: number, volume: number | undefined, timeframe: ChartSubscription["timeframe"] | undefined) {
    const startMs = this._bucketStart(tickTimeMs, timeframe);
    const time = new Date(startMs).toISOString();
    const candles = this.chartHistory.get(key) || [];
    const last = candles[candles.length - 1];
    const vol = Number.isFinite(volume || 0) ? (volume || 0) : 0;

    if (!last) {
      const first = { time, open: price, high: price, low: price, close: price, volume: vol };
      candles.push(first);
      this.chartHistory.set(key, candles);
      return first;
    }

    if (last.time === time) {
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      last.close = price;
      last.volume = (last.volume || 0) + vol;
      this.chartHistory.set(key, candles);
      return last;
    }

    const next = {
      time,
      open: last.close,
      high: price,
      low: price,
      close: price,
      volume: vol,
    };
    candles.push(next);
    if (candles.length > 3000) candles.splice(0, candles.length - 3000);
    this.chartHistory.set(key, candles);
    return next;
  }

  getChartHistory(params: {
    instrumentType: "INDEX" | "OPTION";
    symbol: string;
    securityId: string;
    exchangeSegment: "IDX_I" | "NSE_FNO";
    timeframe: "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "1D";
    strike?: number;
    optionType?: "CE" | "PE";
    date?: string;
  }) {
    const key = this._chartCacheKey({
      instrumentType: params.instrumentType,
      symbol: params.symbol,
      securityId: params.securityId,
      exchangeSegment: params.exchangeSegment,
      timeframe: params.timeframe,
      strike: params.strike,
      optionType: params.optionType,
    }, params.date || this._tradingDateKey());
    return [...(this.chartHistory.get(key) || [])];
  }

  seedChartHistory(params: {
    instrumentType: "INDEX" | "OPTION";
    symbol: string;
    securityId: string;
    exchangeSegment: "IDX_I" | "NSE_FNO";
    timeframe: "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "1D";
    candles: ChartCandle[];
    strike?: number;
    optionType?: "CE" | "PE";
    date?: string;
  }) {
    const key = this._chartCacheKey({
      instrumentType: params.instrumentType,
      symbol: params.symbol,
      securityId: params.securityId,
      exchangeSegment: params.exchangeSegment,
      timeframe: params.timeframe,
      strike: params.strike,
      optionType: params.optionType,
    }, params.date || this._tradingDateKey());
    this.chartHistory.set(key, [...params.candles]);
  }

  subscribeChart(subscription: ChartSubscription) {
    const normalized = {
      ...subscription,
      securityId: this._normalizeSecurityId(subscription.securityId),
      timeframe: subscription.timeframe || "5m",
    };
    this.chartSubscriptions.set(normalized.chartKey, normalized);

    const set = this.chartSubscribersBySecurity.get(normalized.securityId) || new Set<string>();
    set.add(normalized.chartKey);
    this.chartSubscribersBySecurity.set(normalized.securityId, set);

    console.log(
      `[MarketFeed] chart subscribe token=${normalized.securityId} chartKey=${normalized.chartKey} symbol=${normalized.symbol} tf=${normalized.timeframe}`
    );
    console.log(`[MarketFeed] active chart token count=${this.chartSubscriptions.size}`);

    if (normalized.instrument === "OPTIDX" && normalized.strike !== undefined && normalized.optionType) {
      this.subscribeOptionSecurity({
        symbol: normalized.symbol as SymbolName,
        strike: normalized.strike,
        optionType: normalized.optionType,
      }, normalized.securityId);
    } else if (!this._isSimulatedSecurityId(normalized.securityId)) {
      this.feed.subscribeInstruments([
        {
          ExchangeSegment: normalized.exchangeSegment,
          SecurityId: normalized.securityId,
        },
      ]);
    }
  }

  subscribeOptionSecurity(meta: OptionSecurityMeta, securityId: string) {
    this.subscribeOptionSecurities([{ meta, securityId }]);
  }

  private subscribeOptionSecurities(entries: Array<{ meta: OptionSecurityMeta; securityId: string }>) {
    if (!entries.length) return;
    const requestedTokens = entries.map(entry => this._normalizeSecurityId(entry.securityId));
    const alreadySubscribedTokens: string[] = [];
    const newTokens: string[] = [];
    const instruments: DhanInstrument[] = [];

    for (const entry of entries) {
      const token = this._normalizeSecurityId(entry.securityId);
      this.optionSecurityMeta.set(token, entry.meta);
      const currentRefs = this.optionSecurityRefs.get(token) || 0;
      this.optionSecurityRefs.set(token, currentRefs + 1);
      if (currentRefs > 0) {
        alreadySubscribedTokens.push(token);
        continue;
      }
      newTokens.push(token);
      if (!this._isSimulatedSecurityId(token)) {
        instruments.push({
          ExchangeSegment: "NSE_FNO",
          SecurityId: token,
        });
      }
    }

    console.log("[MarketFeed] option subscription batch", {
      requestedTokens: requestedTokens.length,
      alreadySubscribedTokens: alreadySubscribedTokens.length,
      newTokens: newTokens.length,
      batchSize: Number(process.env.DHAN_SUBSCRIBE_BATCH_SIZE || 50),
      activeOptionSubscriptions: this.optionSecurityRefs.size,
    });

    if (instruments.length > 0) {
      this.feed.subscribeInstruments(instruments);
    }
  }

  unsubscribeOptionSecurity(securityId: string) {
    const token = this._normalizeSecurityId(securityId);
    const current = this.optionSecurityRefs.get(token) || 0;
    if (current <= 1) {
      this.optionSecurityRefs.delete(token);
      this.optionSecurityMeta.delete(token);
      this.securityOi.delete(token);
      console.log("[MarketFeed] option unsubscribe", {
        token,
        activeOptionSubscriptions: this.optionSecurityRefs.size,
      });
      if (!this._isSimulatedSecurityId(token)) {
        this.feed.unsubscribeInstruments([
          {
            ExchangeSegment: "NSE_FNO",
            SecurityId: token,
          },
        ]);
      }
      return;
    }
    this.optionSecurityRefs.set(token, current - 1);
  }

  unsubscribeChart(chartKey: string) {
    const existing = this.chartSubscriptions.get(chartKey);
    if (!existing) return;

    const set = this.chartSubscribersBySecurity.get(existing.securityId);
    if (set) {
      set.delete(chartKey);
      if (set.size === 0) {
        this.chartSubscribersBySecurity.delete(existing.securityId);
        if (existing.instrument === "OPTIDX" && existing.strike !== undefined && existing.optionType) {
          this.unsubscribeOptionSecurity(existing.securityId);
        } else if (!this._isSimulatedSecurityId(existing.securityId)) {
          this.feed.unsubscribeInstruments([
            {
              ExchangeSegment: existing.exchangeSegment,
              SecurityId: existing.securityId,
            },
          ]);
        }
      } else {
        this.chartSubscribersBySecurity.set(existing.securityId, set);
      }
    }

    this.chartSubscriptions.delete(chartKey);
  }

  async updateExpiry(symbol: string, expiry: string) {
    if (!this.state[symbol]) return;
    console.log(`[MarketFeed] Expiry updated: ${symbol} → ${expiry}`);
    this.state[symbol].expiry = expiry;
    delete this.optionChainLastFetch[symbol];
    for (const row of this.state[symbol].optionChain || []) {
      if (row.ce_security_id) this.unsubscribeOptionSecurity(row.ce_security_id);
      if (row.pe_security_id) this.unsubscribeOptionSecurity(row.pe_security_id);
    }
    await this._fetchOptionChain(symbol);
    this.io.emit("marketUpdate", { [symbol]: this.state[symbol] });
  }

  // ─── Feed Handlers ────────────────────────────────────────────────────────

  private _setupFeedHandlers() {
    this.feed.onConnected(() => {
      console.log("[MarketFeed] ✅ Dhan feed connected.");
    });
    this.feed.onDisconnected((code, reason) => {
      console.warn(`[MarketFeed] 🔴 Feed disconnected — ${code}: ${reason}`);
      for (const sym of Object.keys(this.state)) {
        this.state[sym].dataSource = "Stale";
      }
    });
    this.feed.onFeedError((err) => {
      console.error("[MarketFeed] Feed error:", err.message);
    });
    this.feed.onTickerUpdate((update) => {
      this._handleUpdate(update);
    });
  }

  private _handleUpdate(update: TickerUpdate | QuoteUpdate) {
    const securityId = this._normalizeSecurityId(update.securityId);
    const optionMeta = this.optionSecurityMeta.get(securityId);
    const symbol = SECURITY_TO_SYMBOL[securityId] || optionMeta?.symbol;
    if (!symbol || !this.state[symbol]) return;

    const s = this.state[symbol];
    const tickTimeMs = update.ltt ? update.ltt * 1000 : Date.now();
    const volume = "volume" in update ? (update as QuoteUpdate).volume : undefined;
    const emittedAt = Date.now();
    const latencyMs = emittedAt - tickTimeMs;

    // IMMEDIATE EMIT - No await, no blocking before this point
    
    // OI Tick (responseCode 5)
    if (update.responseCode === 5 && update.oi !== undefined && optionMeta) {
      this.lastOptionWsTickAt = Date.now();
      const prevOi = this.securityOi.get(securityId) || 0;
      const deltaOi = update.oi - prevOi;
      this.securityOi.set(securityId, update.oi);

      const targetRow = s.optionChain.find(row => row.strike === optionMeta.strike);
      if (targetRow) {
        if (optionMeta.optionType === "CE") {
          targetRow.ce_oi = update.oi;
          targetRow.ce_oi_change = deltaOi;
        } else {
          targetRow.pe_oi = update.oi;
          targetRow.pe_oi_change = deltaOi;
        }
      }

      this._logTick(`[MarketFeed] OI tick token=${securityId} symbol=${symbol} strike=${optionMeta.strike} type=${optionMeta.optionType} oi=${update.oi}`);
      
      // EMIT IMMEDIATELY
      this.io.emit("market:optionTick", {
        symbol,
        strike: optionMeta.strike,
        optionType: optionMeta.optionType,
        securityId,
        oi: update.oi,
        oiChange: deltaOi,
        volume,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour12: false }),
        responseCode: update.responseCode,
        source: "ws",
        latencyMs,
      });
      
      this.io.emit("optionChain:update", {
        symbol,
        strike: optionMeta.strike,
        optionType: optionMeta.optionType,
        securityId,
        oi: update.oi,
        oiChange: deltaOi,
        volume,
        row: targetRow || null,
        source: "ws",
        latencyMs,
      });
      
      // DEFER DB write to next tick (no await)
      setImmediate(() => {
        void db.marketData.put({
          symbol,
          price: s.price,
          change: s.change,
          timestamp: new Date().toISOString(),
          optionChain: s.optionChain,
        }).catch(() => {});
      });
      
      return;
    }

    if (update.responseCode === 6 && update.prevClose !== undefined && !optionMeta) {
      s.prevClose = +update.prevClose.toFixed(2);
    }

    if (optionMeta) {
      this.lastOptionWsTickAt = Date.now();
      const optionPrice = +(update.ltp || 0).toFixed(2);
      if (optionPrice <= 0) return;

      const updatedOption = s.optionChain.find(row => row.strike === optionMeta.strike);
      const previousLtp = updatedOption
        ? (optionMeta.optionType === "CE" ? updatedOption.ce_ltp : updatedOption.pe_ltp)
        : optionPrice;
      const optionChange = +(optionPrice - previousLtp).toFixed(2);
      const optionChangePct = previousLtp > 0 ? +((optionChange / previousLtp) * 100).toFixed(2) : 0;

      if (updatedOption) {
        if (optionMeta.optionType === "CE") {
          updatedOption.ce_ltp = optionPrice;
          if (volume !== undefined) updatedOption.ce_volume = volume;
          updatedOption.ce_change = optionChange;
          updatedOption.ce_change_pct = optionChangePct;
        } else {
          updatedOption.pe_ltp = optionPrice;
          if (volume !== undefined) updatedOption.pe_volume = volume;
          updatedOption.pe_change = optionChange;
          updatedOption.pe_change_pct = optionChangePct;
        }
      }

      // EMIT IMMEDIATELY - Do not await
      this.io.emit("market:optionTick", {
        symbol,
        strike: optionMeta.strike,
        optionType: optionMeta.optionType,
        securityId,
        price: optionPrice,
        change: optionChange,
        changePct: optionChangePct,
        volume,
        source: "ws",
        latencyMs,
      });
      
      this.io.emit("optionChain:update", {
        symbol,
        strike: optionMeta.strike,
        optionType: optionMeta.optionType,
        securityId,
        price: optionPrice,
        volume,
        change: optionChange,
        changePct: optionChangePct,
        row: updatedOption || null,
        source: "ws",
        latencyMs,
      });

      // CHART TICK - Send immediately if subscribed
      const chartKeys = this.chartSubscribersBySecurity.get(securityId);
      if (chartKeys && chartKeys.size > 0) {
        for (const chartKey of chartKeys) {
          const sub = this.chartSubscriptions.get(chartKey);
          if (!sub) continue;
          
          // EMIT CHART TICK IMMEDIATELY
          this.io.emit("chartTick", {
            chartKey: sub.chartKey,
            symbol: sub.symbol,
            securityId: sub.securityId,
            exchangeSegment: sub.exchangeSegment,
            instrument: sub.instrument,
            strike: sub.strike,
            optionType: sub.optionType,
            price: optionPrice,
            volume,
            timestamp: new Date().toISOString(),
            ltt: update.ltt,
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
            this.io.emit("market:candleUpdate", {
              chartKey,
              cacheKey,
              timeframe: tf,
              candle,
            });
          }
        });
      }
      
      // DEFER DB write
      setImmediate(() => {
        void db.marketData.put({
          symbol,
          price: s.price,
          change: s.change,
          timestamp: new Date().toISOString(),
          optionChain: s.optionChain,
        }).catch(() => {});
      });
      
      return;
    }

    // INDEX PRICE TICK
    s.price = +(update.ltp || 0).toFixed(2);
    s.dataSource = "Dhan";
    s.isMarketOpen = this._isMarketOpen();
    s.timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });

    if ("dayOpen" in update) {
      const q = update as QuoteUpdate;
      if (q.dayOpen > 0) s.dayOpen = +q.dayOpen.toFixed(2);
      if (q.dayHigh > 0) s.dayHigh = +q.dayHigh.toFixed(2);
      if (q.dayLow > 0) s.dayLow = +q.dayLow.toFixed(2);
      if (q.volume > 0) s.volume = q.volume;
      if (s.dayOpen > 0) {
        s.change = +(s.price - s.dayOpen).toFixed(2);
        s.changePct = +((s.change / s.dayOpen) * 100).toFixed(2);
      }
    }

    // EMIT INDEX TICK IMMEDIATELY
    this._logTick(`[MarketFeed] tick token=${securityId} symbol=${symbol} price=${s.price}`);
    this.io.emit("market:indexTick", {
      symbol,
      securityId,
      price: s.price,
      change: s.change,
      changePct: s.changePct,
      dayOpen: s.dayOpen,
      dayHigh: s.dayHigh,
      dayLow: s.dayLow,
      volume: s.volume,
      timestamp: s.timestamp,
      source: "ws",
      latencyMs,
    });

    // EMIT CHART TICK IMMEDIATELY if subscribed
    const chartKeys = this.chartSubscribersBySecurity.get(securityId);
    if (chartKeys && chartKeys.size > 0) {
      for (const chartKey of chartKeys) {
        const sub = this.chartSubscriptions.get(chartKey);
        if (!sub) continue;
        
        this.io.emit("chartTick", {
          chartKey: sub.chartKey,
          symbol: sub.symbol,
          securityId: sub.securityId,
          exchangeSegment: sub.exchangeSegment,
          instrument: sub.instrument,
          strike: sub.strike,
          optionType: sub.optionType,
          price: s.price,
          volume,
          timestamp: new Date().toISOString(),
          ltt: update.ltt,
        });
      }
      
      // DEFER chart candle update to next tick
      setImmediate(() => {
        for (const chartKey of chartKeys) {
          const sub = this.chartSubscriptions.get(chartKey);
          if (!sub) continue;
          const tf = sub.timeframe || "5m";
          const chartMetaBase = {
            symbol: sub.symbol,
            securityId: sub.securityId,
            exchangeSegment: sub.exchangeSegment,
            instrumentType: sub.instrument === "INDEX" ? "INDEX" as const : "OPTION" as const,
          };
          const cacheKey = this._chartCacheKey({ ...chartMetaBase, timeframe: tf }, this._tradingDateKey(tickTimeMs));
          const candle = this._upsertChartCandle(cacheKey, tickTimeMs, s.price, volume, tf);
          this.io.emit("market:candleUpdate", {
            chartKey,
            cacheKey,
            timeframe: tf,
            candle,
          });
        }
      });
    }

    // DEFER DB write
    setImmediate(() => {
      void db.marketData.put({
        symbol,
        price: s.price,
        change: s.change,
        timestamp: new Date().toISOString(),
        optionChain: s.optionChain,
      }).catch(() => {});
    });

    // Refresh option chain if stale
    const now = Date.now();
    const lastFetch = this.optionChainLastFetch[symbol] || 0;
    if (
      !this.simulatorActive &&
      process.env.DISABLE_DHAN_AUTOFETCH !== "true" &&
      now - lastFetch > this.OC_CACHE_MS &&
      !this.inFlightFetch.has(symbol)
    ) {
      this._fetchOptionChain(symbol).catch(err =>
        console.error(`[MarketFeed] OC refresh error (${symbol}):`, err.message)
      );
    }
  }

  // ─── Option Chain REST ────────────────────────────────────────────────────

  private async _refreshAllOptionChains() {
    // Fetch one symbol at a time, respecting rate limiter
    for (const symbol of ALL_SYMBOLS) {
      try {
        await this._fetchExpiries(symbol);
        await this._fetchOptionChain(symbol);
      } catch (err: any) {
        console.error(`[MarketFeed] Initial OC fetch failed (${symbol}):`, err.message);
      }
    }
  }

  private async _fetchExpiries(symbol: string): Promise<string[]> {
    const now = Date.now();
    if (
      this.state[symbol]?.expiries.length > 0 &&
      (now - (this.expiryLastFetch[symbol] || 0)) < this.EXPIRY_CACHE_MS
    ) {
      console.log(`[MarketFeed] Cache hit — expiries for ${symbol}`);
      return this.state[symbol].expiries;
    }

    const details = SYMBOL_TO_SCRIP[symbol as SymbolName];
    if (!details) return [];

    return this.rateLimiter.enqueue(async () => {
      try {
        const res = await axios.post(
          "https://api.dhan.co/v2/optionchain/expirylist",
          { UnderlyingScrip: details.scrip, UnderlyingSeg: details.seg },
          {
            headers: {
              "access-token": this.accessToken,
              "client-id":    this.clientId,
              "Content-Type": "application/json",
            },
            timeout: 8000,
          }
        );
        const list: string[] = Array.isArray(res.data?.data) ? res.data.data : [];
        this.expiryLastFetch[symbol] = Date.now();
        if (list.length > 0) {
          if (!this.state[symbol].expiry) this.state[symbol].expiry = list[0];
          this.state[symbol].expiries = list;
        }
        console.log(`[MarketFeed] Expiries for ${symbol}: ${list.slice(0, 3).join(", ")}...`);
        return list;
      } catch (err: any) {
        console.error(`[MarketFeed] Expiry fetch failed (${symbol}):`, err.response?.data || err.message);
        return [];
      }
    });
  }

  private _optionRowsForWebSocket(symbol: SymbolName, chain: OptionStrike[]) {
    if (!chain.length) return [];
    const spot = this.state[symbol]?.price || 0;
    const sorted = [...chain].sort((a, b) => a.strike - b.strike);
    let atmIndex = Math.floor(sorted.length / 2);
    if (spot > 0) {
      let minDiff = Infinity;
      sorted.forEach((row, index) => {
        const diff = Math.abs(row.strike - spot);
        if (diff < minDiff) {
          minDiff = diff;
          atmIndex = index;
        }
      });
    }
    const lo = Math.max(0, atmIndex - this.OPTION_CHAIN_WS_STRIKE_RANGE);
    const hi = Math.min(sorted.length - 1, atmIndex + this.OPTION_CHAIN_WS_STRIKE_RANGE);
    const rows = sorted.slice(lo, hi + 1);
    console.log("[MarketFeed] option WS strike window", {
      symbol,
      spot,
      range: this.OPTION_CHAIN_WS_STRIKE_RANGE,
      totalRows: chain.length,
      wsRows: rows.length,
      requestedTokens: rows.length * 2,
    });
    return rows;
  }

  private async _fetchOptionChain(symbol: string, emitDiffTicks = false) {
    if (this.inFlightFetch.has(symbol)) return;
    const details = SYMBOL_TO_SCRIP[symbol as SymbolName];
    if (!details) return;

    this.inFlightFetch.add(symbol);
    let expiry = this.state[symbol]?.expiry;
    if (!expiry) {
      const list = await this._fetchExpiries(symbol);
      expiry = list[0] || "";
    }
    if (!expiry) {
      console.warn(`[MarketFeed] No expiry for ${symbol} — skipping OC fetch.`);
      this.optionChainLastFetch[symbol] = Date.now();
      this.inFlightFetch.delete(symbol);
      return;
    }

    await this.rateLimiter.enqueue(async () => {
      try {
        console.log(`[MarketFeed] Fetching OC for ${symbol} (${expiry})...`);
        const res = await axios.post(
          "https://api.dhan.co/v2/optionchain",
          { UnderlyingScrip: details.scrip, UnderlyingSeg: details.seg, Expiry: expiry },
          {
            headers: {
              "access-token": this.accessToken,
              "client-id":    this.clientId,
              "Content-Type": "application/json",
            },
            timeout: 10000,
          }
        );
        const chain = this._parseOC(res.data);
        if (chain.length > 0) {
          const previous = this.state[symbol].optionChain || [];
          const nextIds = new Set<string>();
          this.state[symbol].optionChain = chain;
          const wsRows = this._optionRowsForWebSocket(symbol as SymbolName, chain);
          const wsEntries: Array<{ meta: OptionSecurityMeta; securityId: string }> = [];
          const previousWsIds = this.optionChainWsTokensBySymbol.get(symbol as SymbolName) || new Set<string>();
          for (const row of wsRows) {
            if (row.ce_security_id) {
              const token = this._normalizeSecurityId(row.ce_security_id);
              nextIds.add(token);
              if (!previousWsIds.has(token)) {
                wsEntries.push({ meta: { symbol: symbol as SymbolName, strike: row.strike, optionType: "CE" }, securityId: token });
              }
            }
            if (row.pe_security_id) {
              const token = this._normalizeSecurityId(row.pe_security_id);
              nextIds.add(token);
              if (!previousWsIds.has(token)) {
                wsEntries.push({ meta: { symbol: symbol as SymbolName, strike: row.strike, optionType: "PE" }, securityId: token });
              }
            }
          }
          this.subscribeOptionSecurities(wsEntries);

          for (const oldId of previousWsIds) {
            if (!nextIds.has(oldId)) this.unsubscribeOptionSecurity(oldId);
          }
          this.optionChainWsTokensBySymbol.set(symbol as SymbolName, nextIds);
          this.optionChainLastFetch[symbol] = Date.now();
          if (emitDiffTicks) {
            this._emitOptionChainDiffTicks(symbol as SymbolName, previous, chain);
          }
          console.log(`[MarketFeed] ✅ OC loaded for ${symbol}: ${chain.length} strikes, tokens=${nextIds.size}.`);
          console.log(`[MarketFeed] option chain tokens count=${nextIds.size} symbol=${symbol}`);
          this.io.emit("marketUpdate", { [symbol]: this.state[symbol] });
          this.io.emit("optionChain:update", { symbol, expiry, optionChain: chain, source: emitDiffTicks ? "rest-fallback" : "rest-snapshot" });
        }
      } catch (err: any) {
        console.error(`[MarketFeed] OC fetch failed (${symbol}):`, err.response?.data || err.message);
      } finally {
        this.inFlightFetch.delete(symbol);
      }
    });
  }

  private _parseOC(data: any): OptionStrike[] {
    // Dhan v2 format: { data: { last_price, oc: { "25650.000000": { ce: {...}, pe: {...} } } } }
    const oc = data?.data?.oc;
    if (!oc || typeof oc !== "object") return [];

    return (Object.entries(oc) as [string, any][])
      .map(([strikeStr, sides]) => {
        const strike = parseFloat(strikeStr);
        if (!strike || isNaN(strike)) return null;
        const ce = sides?.ce ?? {};
        const pe = sides?.pe ?? {};
        return {
          strike,
          ce_ltp:       +(ce.last_price      ?? 0),
          ce_oi:        +(ce.oi              ?? 0),
          ce_oi_change: +((ce.oi ?? 0) - (ce.previous_oi ?? ce.oi ?? 0)),
          ce_security_id: ce.security_id ? String(ce.security_id) : undefined,
          ce_volume:    +(ce.volume ?? ce.total_volume ?? 0),
          ce_iv:        ce.implied_volatility ? +ce.implied_volatility.toFixed(2) : undefined,
          ce_delta:     ce.greeks?.delta      ? +ce.greeks.delta.toFixed(4)       : undefined,
          pe_ltp:       +(pe.last_price      ?? 0),
          pe_oi:        +(pe.oi              ?? 0),
          pe_oi_change: +((pe.oi ?? 0) - (pe.previous_oi ?? pe.oi ?? 0)),
          pe_security_id: pe.security_id ? String(pe.security_id) : undefined,
          pe_volume:    +(pe.volume ?? pe.total_volume ?? 0),
          pe_iv:        pe.implied_volatility ? +pe.implied_volatility.toFixed(2) : undefined,
          pe_delta:     pe.greeks?.delta      ? +pe.greeks.delta.toFixed(4)       : undefined,
        } as OptionStrike;
      })
      .filter(Boolean) as OptionStrike[];
  }

  private _emitOptionChainDiffTicks(symbol: SymbolName, previous: OptionStrike[], next: OptionStrike[]) {
    const previousByStrike = new Map(previous.map(row => [row.strike, row]));
    const timestamp = new Date().toLocaleTimeString("en-IN", { hour12: false });
    let emitted = 0;

    for (const row of next) {
      const old = previousByStrike.get(row.strike);
      emitted += this._emitOptionSideDiff(symbol, row, old, "CE", timestamp);
      emitted += this._emitOptionSideDiff(symbol, row, old, "PE", timestamp);
    }

    if (emitted > 0) {
      this._logTick(`[MarketFeed] option REST fallback emitted ${emitted} real Dhan updates for ${symbol}`);
    }
  }

  private _emitOptionSideDiff(
    symbol: SymbolName,
    row: OptionStrike,
    old: OptionStrike | undefined,
    optionType: "CE" | "PE",
    timestamp: string
  ) {
    const securityId = optionType === "CE" ? row.ce_security_id : row.pe_security_id;
    if (!securityId) return 0;

    const token = this._normalizeSecurityId(securityId);
    const price = optionType === "CE" ? row.ce_ltp : row.pe_ltp;
    const oldPrice = old ? (optionType === "CE" ? old.ce_ltp : old.pe_ltp) : 0;
    const volume = optionType === "CE" ? row.ce_volume : row.pe_volume;
    const oldVolume = old ? (optionType === "CE" ? old.ce_volume : old.pe_volume) : undefined;
    const oi = optionType === "CE" ? row.ce_oi : row.pe_oi;
    const oldOi = old ? (optionType === "CE" ? old.ce_oi : old.pe_oi) : undefined;

    const changed = price !== oldPrice || volume !== oldVolume || oi !== oldOi;
    if (!changed || price <= 0) return 0;

    const change = +(price - (oldPrice || price)).toFixed(2);
    const changePct = oldPrice > 0 ? +((change / oldPrice) * 100).toFixed(2) : 0;
    const oiChange = oldOi !== undefined ? oi - oldOi : (optionType === "CE" ? row.ce_oi_change : row.pe_oi_change);

    this.io.emit("market:optionTick", {
      symbol,
      strike: row.strike,
      optionType,
      securityId: token,
      price,
      change,
      changePct,
      volume,
      oi,
      oiChange,
      timestamp,
      responseCode: 4,
      source: "rest-fallback",
    });
    this.io.emit("optionChain:update", {
      symbol,
      strike: row.strike,
      optionType,
      securityId: token,
      row,
      change,
      changePct,
      source: "rest-fallback",
      updatedRows: 1,
      timestamp,
    });

    const chartKeys = this.chartSubscribersBySecurity.get(token);
    if (chartKeys && chartKeys.size > 0) {
      const tickTimeMs = Date.now();
      for (const chartKey of chartKeys) {
        const sub = this.chartSubscriptions.get(chartKey);
        if (!sub) continue;
        const tf = sub.timeframe || "5m";
        const cacheKey = this._chartCacheKey({
          instrumentType: "OPTION",
          symbol: sub.symbol,
          securityId: sub.securityId,
          exchangeSegment: sub.exchangeSegment,
          timeframe: tf,
          strike: sub.strike,
          optionType: sub.optionType,
        }, this._tradingDateKey(tickTimeMs));
        const candle = this._upsertChartCandle(cacheKey, tickTimeMs, price, volume, tf);
        this.io.emit("market:candleUpdate", {
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
          source: "rest-fallback",
        });
        this.io.emit("chartTick", {
          chartKey: sub.chartKey,
          symbol: sub.symbol,
          securityId: sub.securityId,
          exchangeSegment: sub.exchangeSegment,
          instrument: sub.instrument,
          strike: sub.strike,
          optionType: sub.optionType,
          price,
          volume,
          timestamp: new Date().toISOString(),
          responseCode: 4,
          source: "rest-fallback",
        });
      }
    }

    return 1;
  }

  private _isMarketOpen(): boolean {
    const ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const day  = ist.getUTCDay();
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return day >= 1 && day <= 5 && mins >= 555 && mins <= 930;
  }

  private _logTick(message: string) {
    const now = Date.now();
    if (now - this.lastTickLogAt < 2000) return;
    this.lastTickLogAt = now;
    console.log(message);
  }
}
