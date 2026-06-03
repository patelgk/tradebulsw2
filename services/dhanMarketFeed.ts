/**
 * Dhan Live Market Feed - Single WebSocket Connection Manager
 *
 * Official Dhan v2 WebSocket Protocol:
 * Endpoint : wss://api-feed.dhan.co?version=2&token=TOKEN&clientId=ID&authType=2
 * Auth     : Query parameters only — NO JSON auth packet after connect
 * Subscribe: JSON { RequestCode, InstrumentCount, InstrumentList: [{ExchangeSegment: string, SecurityId: string}] }
 * Response : Binary packets, Little Endian
 *
 * Response Header (8 bytes):
 *   byte  0      : Feed Response Code (1=Index, 2=Ticker, 4=Quote, 5=OI, 6=PrevClose, 8=Full, 50=Disconnect)
 *   bytes 1-2    : int16 — message length
 *   byte  3      : Exchange Segment
 *   bytes 4-7    : int32 — Security ID
 *
 * Ticker Packet (bytes after header):
 *   bytes 8-11   : float32 — LTP
 *   bytes 12-15  : int32   — Last Trade Time (epoch)
 *
 * Quote Packet (bytes after header):
 *   bytes 8-11   : float32 — LTP
 *   bytes 12-13  : int16   — Last Traded Qty
 *   bytes 14-17  : int32   — Last Trade Time
 *   bytes 18-21  : float32 — ATP
 *   bytes 22-25  : int32   — Volume
 *   bytes 26-29  : int32   — Total Sell Qty
 *   bytes 30-33  : int32   — Total Buy Qty
 *   bytes 34-37  : float32 — Day Open
 *   bytes 38-41  : float32 — Day Close (post-market only)
 *   bytes 42-45  : float32 — Day High
 *   bytes 46-49  : float32 — Day Low
 *
 * Feed Request Codes:
 *   15 = Subscribe Ticker | 16 = Unsubscribe Ticker
 *   17 = Subscribe Quote  | 18 = Unsubscribe Quote
 *   21 = Subscribe Full   | 22 = Unsubscribe Full
 *   12 = Disconnect
 *
 * Exchange Segments (strings for subscription):
 *   "IDX_I"   = Index (Nifty, BankNifty etc.)
 *   "NSE_EQ"  = NSE Equity
 *   "NSE_FNO" = NSE F&O
 *
 * Disconnect codes (byte 9-10 int16 in disconnect packet):
 *   805 = Too many connections (>5)
 *   806 = Data APIs not subscribed
 *   807 = Access token expired
 *   808 = Authentication failed
 *   809 = Access token invalid
 *   810 = Client ID invalid
 */

import WebSocket from "ws";
import { Server as SocketIOServer } from "socket.io";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DhanInstrument {
  ExchangeSegment: string; // e.g. "IDX_I", "NSE_EQ", "NSE_FNO"
  SecurityId: string;      // exchange security ID as string
}

export interface TickerUpdate {
  securityId: string;
  exchangeSegment: number;
  ltp: number;
  ltt: number; // epoch seconds
  responseCode: number;
}

export interface QuoteUpdate extends TickerUpdate {
  lastTradedQty: number;
  atp: number;
  volume: number;
  totalSellQty: number;
  totalBuyQty: number;
  dayOpen: number;
  dayClose: number;
  dayHigh: number;
  dayLow: number;
}

export type FeedUpdateCallback = (update: TickerUpdate | QuoteUpdate) => void;
export type DisconnectCallback = (code: number, reason: string) => void;
export type ConnectCallback = () => void;
export type ErrorCallback = (error: Error) => void;

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_BASE = "wss://api-feed.dhan.co";

// Official Feed Response Codes from Annexure
const RESPONSE_CODE = {
  INDEX:      1,
  TICKER:     2,
  QUOTE:      4,
  OI:         5,
  PREV_CLOSE: 6,
  MKT_STATUS: 7,
  FULL:       8,
  DISCONNECT: 50,
} as const;

// Official Feed Request Codes from Annexure
const REQUEST_CODE = {
  SUBSCRIBE_TICKER:    15,
  UNSUBSCRIBE_TICKER:  16,
  SUBSCRIBE_QUOTE:     17,
  UNSUBSCRIBE_QUOTE:   18,
  SUBSCRIBE_FULL:      21,
  UNSUBSCRIBE_FULL:    22,
  DISCONNECT:          12,
} as const;

// Reconnect config
const RECONNECT_BASE_MS  = 2000;
const RECONNECT_MAX_MS   = 60000;
const RECONNECT_MAX_TRIES = 10;

// Disconnect reason codes from Annexure
const DISCONNECT_REASONS: Record<number, string> = {
  800: "Internal Server Error",
  804: "Exceeded instrument limit",
  805: "Too many connections (>5 WebSockets)",
  806: "Data APIs not subscribed",
  807: "Access token expired",
  808: "Authentication failed — Client ID or Access Token invalid",
  809: "Access token is invalid",
  810: "Client ID is invalid",
  811: "Invalid Expiry Date",
  812: "Invalid Date Format",
  813: "Invalid SecurityId",
  814: "Invalid Request",
};

// ─── DhanMarketFeed ───────────────────────────────────────────────────────────

export class DhanMarketFeed {
  private ws: WebSocket | null = null;
  private instruments: DhanInstrument[] = [];
  private subscribeMode: 15 | 17 | 21 = REQUEST_CODE.SUBSCRIBE_QUOTE; // Quote by default

  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private intentionalDisconnect = false;
  private isConnected = false;

  private onUpdate: FeedUpdateCallback | null = null;
  private onConnect: ConnectCallback | null = null;
  private onDisconnect: DisconnectCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor(
    private readonly clientId: string,
    private readonly accessToken: string
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  setInstruments(instruments: DhanInstrument[], mode: 15 | 17 | 21 = REQUEST_CODE.SUBSCRIBE_QUOTE) {
    this.instruments = instruments;
    this.subscribeMode = mode;
  }

  onTickerUpdate(cb: FeedUpdateCallback)    { this.onUpdate     = cb; }
  onConnected(cb: ConnectCallback)          { this.onConnect    = cb; }
  onDisconnected(cb: DisconnectCallback)    { this.onDisconnect = cb; }
  onFeedError(cb: ErrorCallback)            { this.onError      = cb; }

  isActive(): boolean { return this.isConnected; }

  connect() {
    this.intentionalDisconnect = false;
    this._connect();
  }

  disconnect() {
    this.intentionalDisconnect = true;
    this._clearReconnectTimer();
    if (this.ws) {
      // Send graceful disconnect packet per official spec
      this._safeSend(JSON.stringify({ RequestCode: REQUEST_CODE.DISCONNECT }));
      this.ws.terminate();
      this.ws = null;
    }
    this.isConnected = false;
    console.log("[DhanFeed] Intentionally disconnected.");
  }

  // ─── Internal Connection ────────────────────────────────────────────────────

  private _connect() {
    if (!this.clientId || !this.accessToken) {
      console.error("[DhanFeed] ❌ Missing clientId or accessToken — cannot connect.");
      return;
    }

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }

    // Official v2 endpoint — auth is ONLY in query params
    const url = `${WS_BASE}?version=2&token=${encodeURIComponent(this.accessToken)}&clientId=${encodeURIComponent(this.clientId)}&authType=2`;

    console.log(`[DhanFeed] Connecting... (clientId: ${this.clientId.substring(0, 4)}***, attempt: ${this.reconnectAttempts + 1})`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => this._onOpen());
      this.ws.on("message", (data) => this._onMessage(data));
      this.ws.on("close", (code, reason) => this._onClose(code, reason.toString()));
      this.ws.on("error", (err) => this._onError(err));
      this.ws.on("unexpected-response", (_req, res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => (body += c));
        res.on("end", () => {
          console.error(`[DhanFeed] ❌ Upgrade failed — HTTP ${res.statusCode}: ${body}`);
        });
      });

      // ws library handles Pong automatically when server sends Ping
      this.ws.on("ping", () => {
        console.log("[DhanFeed] ⟳ Ping received from server — pong sent automatically.");
      });

    } catch (err: any) {
      console.error("[DhanFeed] ❌ Connection initiation error:", err.message);
      this._scheduleReconnect();
    }
  }

  private _onOpen() {
    console.log("[DhanFeed] ✅ WebSocket connected successfully.");
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.onConnect?.();

    // Subscribe immediately after connection — no auth packet needed
    this._subscribe();
  }

  private _subscribe() {
    if (!this.instruments.length) {
      console.warn("[DhanFeed] ⚠️ No instruments configured — nothing to subscribe.");
      return;
    }

    // API allows max 100 instruments per message — batch if needed
    const BATCH = 100;
    for (let i = 0; i < this.instruments.length; i += BATCH) {
      const batch = this.instruments.slice(i, i + BATCH);
      const packet = {
        RequestCode: this.subscribeMode,
        InstrumentCount: batch.length,
        InstrumentList: batch,
      };
      this._safeSend(JSON.stringify(packet));
      console.log(
        `[DhanFeed] 📡 Subscribed batch ${Math.floor(i / BATCH) + 1}: ` +
        `${batch.length} instruments (RequestCode: ${this.subscribeMode})`
      );
      batch.forEach(inst =>
        console.log(`[DhanFeed]    → ${inst.ExchangeSegment}:${inst.SecurityId}`)
      );
    }
  }

  private _onMessage(data: WebSocket.RawData) {
    try {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

      // Short JSON-style messages from server (status, errors)
      const text = buf.toString("utf8").trim();
      if (text.startsWith("{")) {
        const msg = JSON.parse(text);
        console.log("[DhanFeed] 📩 JSON message:", JSON.stringify(msg));
        return;
      }

      // Binary packet — needs at least 8-byte header
      if (buf.length < 8) return;

      this._parseBinaryPacket(buf);
    } catch (err: any) {
      console.debug("[DhanFeed] Parse error:", err.message);
    }
  }

  private _parseBinaryPacket(buf: Buffer) {
    // Official header layout (8 bytes, Little Endian):
    // byte  0    : Feed Response Code
    // bytes 1-2  : int16 — total message length
    // byte  3    : Exchange Segment
    // bytes 4-7  : int32 — Security ID
    const responseCode     = buf.readUInt8(0);
    const exchangeSegment  = buf.readUInt8(3);
    const securityId       = buf.readInt32LE(4).toString();

    switch (responseCode) {

      case RESPONSE_CODE.TICKER:
      case RESPONSE_CODE.INDEX: {
        if (buf.length < 12) return;
        const ltp = buf.readFloatLE(8);
        const ltt = buf.length >= 16 ? buf.readInt32LE(12) : 0;
        const update: TickerUpdate = { securityId, exchangeSegment, ltp, ltt, responseCode };
        this.onUpdate?.(update);
        break;
      }

      case RESPONSE_CODE.QUOTE: {
        if (buf.length < 50) return;
        const update: QuoteUpdate = {
          securityId,
          exchangeSegment,
          responseCode,
          ltp:          buf.readFloatLE(8),
          lastTradedQty: buf.readInt16LE(12),
          ltt:          buf.readInt32LE(14),
          atp:          buf.readFloatLE(18),
          volume:       buf.readInt32LE(22),
          totalSellQty: buf.readInt32LE(26),
          totalBuyQty:  buf.readInt32LE(30),
          dayOpen:      buf.readFloatLE(34),
          dayClose:     buf.readFloatLE(38),
          dayHigh:      buf.readFloatLE(42),
          dayLow:       buf.readFloatLE(46),
        };
        this.onUpdate?.(update);
        break;
      }

      case RESPONSE_CODE.OI: {
        if (buf.length < 12) return;
        const oi = buf.readInt32LE(8);
        console.log(`[DhanFeed] OI update — Security: ${securityId}, OI: ${oi}`);
        break;
      }

      case RESPONSE_CODE.PREV_CLOSE: {
        if (buf.length < 12) return;
        const prevClose = buf.readFloatLE(8);
        console.log(`[DhanFeed] Prev Close — Security: ${securityId}, Close: ${prevClose}`);
        break;
      }

      case RESPONSE_CODE.FULL: {
        if (buf.length < 50) return;
        // Full packet has same layout as Quote up to byte 50, then OI fields and market depth
        const update: QuoteUpdate = {
          securityId,
          exchangeSegment,
          responseCode,
          ltp:          buf.readFloatLE(8),
          lastTradedQty: buf.readInt16LE(12),
          ltt:          buf.readInt32LE(14),
          atp:          buf.readFloatLE(18),
          volume:       buf.readInt32LE(22),
          totalSellQty: buf.readInt32LE(26),
          totalBuyQty:  buf.readInt32LE(30),
          dayOpen:      buf.length >= 51 ? buf.readFloatLE(47) : 0,
          dayClose:     buf.length >= 55 ? buf.readFloatLE(51) : 0,
          dayHigh:      buf.length >= 59 ? buf.readFloatLE(55) : 0,
          dayLow:       buf.length >= 63 ? buf.readFloatLE(59) : 0,
        };
        this.onUpdate?.(update);
        break;
      }

      case RESPONSE_CODE.DISCONNECT: {
        if (buf.length >= 10) {
          const reasonCode = buf.readInt16LE(8);
          const reason = DISCONNECT_REASONS[reasonCode] || `Unknown reason code ${reasonCode}`;
          console.error(`[DhanFeed] 🔴 Server disconnect packet — Code: ${reasonCode}, Reason: ${reason}`);
          this.onDisconnect?.(reasonCode, reason);
        }
        break;
      }

      default:
        // Silently ignore unknown packets (MKT_STATUS etc.)
        break;
    }
  }

  private _onClose(code: number, reason: string) {
    this.isConnected = false;
    console.warn(`[DhanFeed] 🔴 Closed — code: ${code}, reason: "${reason || "none"}"`);
    this.onDisconnect?.(code, reason);
    if (!this.intentionalDisconnect) {
      this._scheduleReconnect();
    }
  }

  private _onError(err: Error) {
    console.error("[DhanFeed] ❌ WebSocket error:", err.message);
    this.onError?.(err);
  }

  private _scheduleReconnect() {
    if (this.intentionalDisconnect) return;
    if (this.reconnectAttempts >= RECONNECT_MAX_TRIES) {
      console.error(`[DhanFeed] ❌ Max reconnect attempts (${RECONNECT_MAX_TRIES}) reached. Giving up.`);
      return;
    }
    this._clearReconnectTimer();
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts), RECONNECT_MAX_MS);
    this.reconnectAttempts++;
    console.log(`[DhanFeed] 🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${RECONNECT_MAX_TRIES})...`);
    this.reconnectTimer = setTimeout(() => this._connect(), delay);
  }

  private _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private _safeSend(data: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn("[DhanFeed] ⚠️ Cannot send — socket not open.");
    }
  }
}
