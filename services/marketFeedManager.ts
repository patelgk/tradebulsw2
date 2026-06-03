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
  ce_iv?:       number;
  ce_delta?:    number;
  pe_ltp:       number;
  pe_oi:        number;
  pe_oi_change: number;
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

  // Cache timestamps
  private optionChainLastFetch: Record<string, number> = {};
  private expiryLastFetch:      Record<string, number> = {};
  private readonly OC_CACHE_MS      = 5 * 60 * 1000;  // 5 minutes
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
    // Stagger option chain fetches to avoid rate limits
    if (process.env.DISABLE_DHAN_AUTOFETCH !== "true") {
      setTimeout(() => this._refreshAllOptionChains(), 5000);
    }
  }

  stop() { this.feed.disconnect(); }

  getState(): Record<string, SymbolState> { return this.state; }
  getSymbolState(symbol: string): SymbolState | undefined { return this.state[symbol]; }
  isConnected(): boolean { return this.feed.isActive(); }
  getAllSymbols(): readonly string[] { return ALL_SYMBOLS; }

  async updateExpiry(symbol: string, expiry: string) {
    if (!this.state[symbol]) return;
    console.log(`[MarketFeed] Expiry updated: ${symbol} → ${expiry}`);
    this.state[symbol].expiry = expiry;
    delete this.optionChainLastFetch[symbol];
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
    const symbol = SECURITY_TO_SYMBOL[update.securityId];
    if (!symbol || !this.state[symbol]) return;

    const s = this.state[symbol];
    const prevPrice = s.price;
    s.price      = +update.ltp.toFixed(2);
    s.dataSource = "Dhan";
    s.isMarketOpen = this._isMarketOpen();
    s.timestamp  = new Date().toLocaleTimeString("en-IN", { hour12: false });

    if ("dayOpen" in update) {
      const q = update as QuoteUpdate;
      if (q.dayOpen  > 0) s.dayOpen  = +q.dayOpen.toFixed(2);
      if (q.dayHigh  > 0) s.dayHigh  = +q.dayHigh.toFixed(2);
      if (q.dayLow   > 0) s.dayLow   = +q.dayLow.toFixed(2);
      if (q.volume   > 0) s.volume   = q.volume;
      if (s.dayOpen  > 0) {
        s.change    = +(s.price - s.dayOpen).toFixed(2);
        s.changePct = +((s.change / s.dayOpen) * 100).toFixed(2);
      }
    }

    // Delta-approximate option LTPs on each tick
    if (s.optionChain.length > 0 && prevPrice > 0 && prevPrice !== s.price) {
      const spotDelta = s.price - prevPrice;
      s.optionChain = s.optionChain.map(opt => {
        const dist    = opt.strike - s.price;
        const ce_d    = 1 / (1 + Math.exp(dist / (s.price * 0.01)));
        const pe_d    = ce_d - 1;
        return {
          ...opt,
          ce_ltp: +Math.max(0.05, opt.ce_ltp + spotDelta * ce_d).toFixed(2),
          pe_ltp: +Math.max(0.05, opt.pe_ltp + spotDelta * pe_d).toFixed(2),
        };
      });
    }

    this.io.volatile.emit("marketUpdate", { [symbol]: s });

    // Refresh option chain if stale
    const now = Date.now();
    const lastFetch = this.optionChainLastFetch[symbol] || 0;
    if (
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

  private async _fetchOptionChain(symbol: string) {
    if (this.inFlightFetch.has(symbol)) return;
    const details = SYMBOL_TO_SCRIP[symbol as SymbolName];
    if (!details) return;

    let expiry = this.state[symbol]?.expiry;
    if (!expiry) {
      const list = await this._fetchExpiries(symbol);
      expiry = list[0] || "";
    }
    if (!expiry) {
      console.warn(`[MarketFeed] No expiry for ${symbol} — skipping OC fetch.`);
      return;
    }

    this.inFlightFetch.add(symbol);

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
          this.state[symbol].optionChain = chain;
          this.optionChainLastFetch[symbol] = Date.now();
          console.log(`[MarketFeed] ✅ OC loaded for ${symbol}: ${chain.length} strikes.`);
          this.io.emit("marketUpdate", { [symbol]: this.state[symbol] });
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
          ce_iv:        ce.implied_volatility ? +ce.implied_volatility.toFixed(2) : undefined,
          ce_delta:     ce.greeks?.delta      ? +ce.greeks.delta.toFixed(4)       : undefined,
          pe_ltp:       +(pe.last_price      ?? 0),
          pe_oi:        +(pe.oi              ?? 0),
          pe_oi_change: +((pe.oi ?? 0) - (pe.previous_oi ?? pe.oi ?? 0)),
          pe_iv:        pe.implied_volatility ? +pe.implied_volatility.toFixed(2) : undefined,
          pe_delta:     pe.greeks?.delta      ? +pe.greeks.delta.toFixed(4)       : undefined,
        } as OptionStrike;
      })
      .filter(Boolean) as OptionStrike[];
  }

  private _isMarketOpen(): boolean {
    const ist  = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const day  = ist.getUTCDay();
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return day >= 1 && day <= 5 && mins >= 555 && mins <= 930;
  }
}
