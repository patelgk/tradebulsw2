/**
 * TradeBul Server
 *
 * Architecture:
 *   DhanMarketFeed (single WS) → MarketFeedManager → Socket.IO → Clients
 *
 * All market data flows through MarketFeedManager.
 * No duplicate WebSocket implementations.
 * No mock/fake market data.
 * No polling when WebSocket is active.
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import { connectDB, Setting, User, Trade, Challenge, Rule, Transaction, ChallengePurchase, FundHistory, AdminAction, ChallengeStatus, TradingAccount, Notification, Partner, Referral, Commission, Payout } from "./db.js";
import dhanRoutes from "./routes/dhanRoutes.js";
import { MarketFeedManager } from "./services/marketFeedManager.js";
import { DevelopmentMarketSimulator } from "./services/developmentMarketSimulator.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on("uncaughtException", (err) => {
  console.error("[Server] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Server] Unhandled Rejection:", reason);
});

// ─── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", dhanRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// ─── Market Feed Manager (single instance) ────────────────────────────────────

const DHAN_CLIENT_ID    = process.env.DHAN_CLIENT_ID    || "";
const DHAN_ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "";

const marketFeed = new MarketFeedManager(DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN, io);
const marketSimulator = new DevelopmentMarketSimulator(marketFeed);

function isSimulatorAllowed() {
  return process.env.NODE_ENV !== "production" && (
    process.env.TEST_MODE === "true" ||
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_MARKET_SIMULATOR === "true"
  );
}

function shouldAutoStartSimulator() {
  return process.env.NODE_ENV !== "production" && (
    process.env.TEST_MODE === "true" ||
    process.env.ENABLE_MARKET_SIMULATOR === "true"
  );
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────

let connectedClients = 0;
const socketChartSubscriptions = new Map<string, Set<string>>();
const socketSymbolSubscriptions = new Map<string, Set<string>>();
const chartSubscriptionRefCounts = new Map<string, number>();

const INDEX_SECURITY_MAP: Record<string, { securityId: string; exchangeSegment: "IDX_I" | "NSE_FNO"; instrument: "INDEX" | "OPTIDX" }> = {
  "Nifty 50":      { securityId: "13",  exchangeSegment: "IDX_I", instrument: "INDEX" },
  "Bank Nifty":    { securityId: "25",  exchangeSegment: "IDX_I", instrument: "INDEX" },
  "Fin Nifty":     { securityId: "27",  exchangeSegment: "IDX_I", instrument: "INDEX" },
  "Midcap Select": { securityId: "442", exchangeSegment: "IDX_I", instrument: "INDEX" },
  "Nifty Next 50": { securityId: "28",  exchangeSegment: "IDX_I", instrument: "INDEX" },
  "SENSEX":        { securityId: "51",  exchangeSegment: "IDX_I", instrument: "INDEX" },
  "Bankex":        { securityId: "10",  exchangeSegment: "IDX_I", instrument: "INDEX" },
};

function resolveChartHistoryRequest(req: express.Request) {
  const symbol = (req.query.symbol as string) || req.params.symbol;
  const securityId = req.query.securityId as string | undefined;
  const exchangeSegment = ((req.query.exchangeSegment as string | undefined) || (securityId ? "NSE_FNO" : undefined)) as "IDX_I" | "NSE_FNO" | undefined;
  const instrument = ((req.query.instrument as string | undefined) || (securityId ? "OPTIDX" : undefined)) as "INDEX" | "OPTIDX" | undefined;
  const timeframe = ((req.query.timeframe as string) || (req.query.interval as string) || "5m") as "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "1D";
  const date = (req.query.date as string | undefined) || new Date().toISOString().slice(0, 10);
  const strike = req.query.strike ? Number(req.query.strike) : undefined;
  const optionType = (req.query.optionType as "CE" | "PE" | undefined) || undefined;

  if (securityId) {
    return {
      instrumentType: "OPTION" as const,
      securityId,
      exchangeSegment: exchangeSegment || "NSE_FNO",
      instrument: instrument || "OPTIDX",
      timeframe,
      symbol: symbol || securityId,
      date,
      strike,
      optionType,
    };
  }

  if (!symbol) return null;
  const mapped = INDEX_SECURITY_MAP[symbol];
  if (!mapped) return null;
  return {
    instrumentType: "INDEX" as const,
    symbol,
    securityId: mapped.securityId,
    exchangeSegment: mapped.exchangeSegment,
    instrument: mapped.instrument,
    timeframe,
    date,
  };
}

async function fetchChartHistory(params: { symbol: string; securityId: string; exchangeSegment: "IDX_I" | "NSE_FNO"; instrument: "INDEX" | "OPTIDX"; timeframe: string }) {
  const intervalMap: Record<string, string> = {
    "1m": "1",
    "3m": "3",
    "5m": "5",
    "15m": "15",
    "30m": "30",
    "1h": "60",
    "1D": "DAY",
  };
  const dhanInterval = intervalMap[params.timeframe] || "5";
  const isIntraday = dhanInterval !== "DAY";
  const endpoint = isIntraday ? "https://api.dhan.co/v2/charts/intraday" : "https://api.dhan.co/v2/charts/historical";

  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

  const payload: any = {
    symbol: params.symbol,
    securityId: params.securityId,
    exchangeSegment: params.exchangeSegment,
    instrument: params.instrument,
    interval: dhanInterval,
    fromDate: fmt(from),
    toDate: fmt(now), 
  };

  if (!isIntraday) {
    payload.fromDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    payload.toDate = now.toISOString().split("T")[0];
  }

  const r = await axios.post(endpoint, payload, {
    headers: { "access-token": DHAN_ACCESS_TOKEN, "Content-Type": "application/json" },
    timeout: 10000,
  });
  const d = r.data?.data;
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
  if (d && Array.isArray(d.start_Time)) {
    return d.start_Time.map((t: number, i: number) => ({
      time:   new Date(t * 1000).toISOString(),
      open:   d.open?.[i]   || 0,
      high:   d.high?.[i]   || 0,
      low:    d.low?.[i]    || 0,
      close:  d.close?.[i]  || 0,
      volume: d.volume?.[i] || 0,
    }));
  }
  if (Array.isArray(d)) {
    return d.map((c: any) => ({
      time:   new Date((c.start_Time || c.time || 0) * 1000).toISOString(),
      open:   c.open, high: c.high, low: c.low, close: c.close,
      volume: c.volume || 0,
    }));
  }
  throw new Error("Unexpected response format from Dhan history API");
}

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

io.on("connection", (socket) => {
  connectedClients++;
  const timestamp = new Date().toISOString();
  console.log(`[Socket] ✅ Client connected. Total: ${connectedClients} [${timestamp}]`);
  console.log(`[Socket] socket.id=${socket.id} namespace=${socket.nsp.name}`);
  socketChartSubscriptions.set(socket.id, new Set<string>());
  socketSymbolSubscriptions.set(socket.id, new Set<string>());

  // Send current state immediately on connect
  const state = marketFeed.getState();
  socket.emit("marketUpdate", state);

  socket.on("chart:subscribe", (payload) => {
    if (!payload?.chartKey || !payload?.securityId || !payload?.exchangeSegment || !payload?.instrument) return;
    const socketSubs = socketChartSubscriptions.get(socket.id);
    if (socketSubs?.has(payload.chartKey)) return;
    const nextCount = (chartSubscriptionRefCounts.get(payload.chartKey) || 0) + 1;
    chartSubscriptionRefCounts.set(payload.chartKey, nextCount);
    if (nextCount === 1) {
      marketFeed.subscribeChart(payload);
    }
    socket.join(`chart:${payload.chartKey}`);
    console.log(`[Socket] chart subscribed key=${payload.chartKey} token=${payload.securityId} count=${nextCount}`);
    socketSubs?.add(payload.chartKey);
  });

  socket.on("chart:unsubscribe", (payload) => {
    if (!payload?.chartKey) return;
    const current = chartSubscriptionRefCounts.get(payload.chartKey) || 0;
    if (current <= 1) {
      chartSubscriptionRefCounts.delete(payload.chartKey);
      marketFeed.unsubscribeChart(payload.chartKey);
    } else {
      chartSubscriptionRefCounts.set(payload.chartKey, current - 1);
    }
    console.log(`[Socket] chart unsubscribed key=${payload.chartKey} remaining=${chartSubscriptionRefCounts.get(payload.chartKey) || 0}`);
    socketChartSubscriptions.get(socket.id)?.delete(payload.chartKey);
    socket.leave(`chart:${payload.chartKey}`);
  });

  socket.on("symbol:subscribe", (payload) => {
    if (!payload?.symbol) return;
    const symbol = String(payload.symbol);
    const subscriptions = socketSymbolSubscriptions.get(socket.id);
    if (!subscriptions || subscriptions.has(symbol)) return;
    subscriptions.add(symbol);
    socket.join(`symbol:${symbol}`);
    console.log(`[Socket] symbol subscribed symbol=${symbol} total=${subscriptions.size}`);
  });

  socket.on("symbol:unsubscribe", (payload) => {
    if (!payload?.symbol) return;
    const symbol = String(payload.symbol);
    const subscriptions = socketSymbolSubscriptions.get(socket.id);
    if (!subscriptions || !subscriptions.has(symbol)) return;
    subscriptions.delete(symbol);
    socket.leave(`symbol:${symbol}`);
    console.log(`[Socket] symbol unsubscribed symbol=${symbol} remaining=${subscriptions.size}`);
  });

  socket.on("disconnect", (reason) => {
    connectedClients--;
    const timestamp = new Date().toISOString();
    console.log(`[Socket] ❌ Client disconnected [${timestamp}]`);
    console.log(`[Socket] socket.id=${socket.id} reason=${reason} total=${connectedClients}`);
    const subs = socketChartSubscriptions.get(socket.id);
    if (subs) {
      for (const chartKey of subs) {
        const current = chartSubscriptionRefCounts.get(chartKey) || 0;
        if (current <= 1) {
          chartSubscriptionRefCounts.delete(chartKey);
          marketFeed.unsubscribeChart(chartKey);
        } else {
          chartSubscriptionRefCounts.set(chartKey, current - 1);
        }
      }
    }
    socketChartSubscriptions.delete(socket.id);
    socketSymbolSubscriptions.delete(socket.id);
  });
});

// ─── Health & Status Routes ──────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbReadyStates: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };
  
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    mongodb: {
      status: dbReadyStates[dbState] || "unknown",
      readyState: dbState,
      host: mongoose.connection.host || "N/A",
      db: mongoose.connection.name || "N/A",
    },
    dhanWs: marketFeed.isConnected() ? "connected" : "disconnected",
    simulator: marketSimulator.status(),
  });
});

app.get("/api/health/db", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    return res.json({
      status: "ok",
      message: "MongoDB is connected",
      readyState: dbState,
    });
  }
  res.status(503).json({
    status: "error",
    message: "MongoDB is not connected",
    readyState: dbState,
    hint: "Check MONGODB_URI in .env and verify MongoDB Atlas IP whitelist includes deployment IP",
  });
});

app.get("/api/market/status", (_req, res) => {
  res.json({
    dhan: { connected: marketFeed.isConnected() },
    simulator: marketSimulator.status(),
    disableWs: process.env.DISABLE_DHAN_WS === "true",
  });
});

app.get("/api/market/dhan/status", (_req, res) => {
  res.json({
    isConfigured: !!(DHAN_CLIENT_ID && DHAN_ACCESS_TOKEN),
    wsConnected:  marketFeed.isConnected(),
  });
});

// ─── Market Data Routes ──────────────────────────────────────────────────────

app.get("/api/market/quotes", (req, res) => {
  const state = marketFeed.getState();
  if (req.query.minimal === "true") {
    const minimal: any = {};
    for (const [k, v] of Object.entries(state)) {
      minimal[k] = { ...v, optionChain: [] };
    }
    return res.json(minimal);
  }
  res.json(state);
});

app.post("/api/market/expiry", async (req, res) => {
  const { symbol, expiry } = req.body;
  if (!symbol || !expiry) {
    return res.status(400).json({ error: "Missing symbol or expiry parameter" });
  }
  try {
    await marketFeed.updateExpiry(symbol, expiry);
    res.json({ success: true, state: marketFeed.getSymbolState(symbol) });
  } catch (err: any) {
    console.error("[API] updateExpiry error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/market/dhan/connect", (_req, res) => {
  console.log("[API] Manual Dhan connect triggered.");
  marketFeed.stop();
  marketFeed.start();
  res.json({ status: "Dhan WebSocket connection triggered." });
});

app.post("/api/market/dhan/reconnect", (_req, res) => {
  console.log("[API] Manual Dhan reconnect triggered.");
  marketFeed.stop();
  marketFeed.start();
  res.json({ status: "Dhan WebSocket reconnection triggered." });
});

app.get("/api/market/simulator/status", (_req, res) => {
  res.json(marketSimulator.status());
});

app.post("/api/market/simulator/start", (_req, res) => {
  if (!isSimulatorAllowed()) {
    return res.status(403).json({
      error: "Development market simulator is disabled in production.",
      nodeEnv: process.env.NODE_ENV,
    });
  }
  const started = marketSimulator.start();
  res.json({ success: started, simulator: marketSimulator.status() });
});

app.post("/api/market/simulator/stop", (_req, res) => {
  if (!isSimulatorAllowed()) {
    return res.status(403).json({
      error: "Development market simulator is disabled in production.",
      nodeEnv: process.env.NODE_ENV,
    });
  }
  marketSimulator.stop();
  res.json({ success: true, simulator: marketSimulator.status() });
});

app.post("/api/market/simulator/sample-positions", async (req, res) => {
  if (!isSimulatorAllowed()) {
    return res.status(403).json({
      error: "Development market simulator is disabled in production.",
      nodeEnv: process.env.NODE_ENV,
    });
  }

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const state = marketFeed.getState();
  const nifty = state["Nifty 50"];
  const atm = nifty?.optionChain?.find((row) => row.ce_ltp > 0 && row.pe_ltp > 0) || nifty?.optionChain?.[0];
  if (!atm) {
    return res.status(400).json({ error: "Simulator option chain is not ready. Start simulator first." });
  }

  try {
    const samples = await Trade.insertMany([
      {
        id: uuidv4(),
        userId,
        symbol: "Nifty 50",
        type: "BUY",
        optionType: "CE",
        strike: atm.strike,
        qty: 50,
        price: atm.ce_ltp,
        status: "Open",
        pnl: 0,
        charges: 20,
        time: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        userId,
        symbol: "Nifty 50",
        type: "BUY",
        optionType: "PE",
        strike: atm.strike,
        qty: 50,
        price: atm.pe_ltp,
        status: "Open",
        pnl: 0,
        charges: 20,
        time: new Date().toISOString(),
      },
    ]);

    console.log(`[MarketSimulator] sample positions created userId=${userId} count=${samples.length}`);
    res.json({ success: true, trades: samples });
  } catch (err: any) {
    console.error("[MarketSimulator] sample position creation failed:", err.message);
    res.status(500).json({ error: "Failed to create sample positions", message: err.message });
  }
});

// Historical data (Dhan REST charts)
app.get("/api/chart/history", handleChartHistory);
app.get("/api/market/history/:symbol", handleChartHistory);
app.get("/api/market/history", handleChartHistory);

// ─── Database Middleware ──────────────────────────────────────────────────────

const requireDbConnection: express.RequestHandler = (_req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  res.status(503).json({
    error: "Database unavailable",
    message: "MongoDB is not connected. Please check your MONGODB_URI.",
  });
};

app.use(
  ["/api/users", "/api/auth", "/api/trades", "/api/challenges", "/api/rules", "/api/settings", "/api/transactions"],
  requireDbConnection
);

// Withdraw request
app.post("/api/withdraw", requireDbConnection, async (req, res) => {
  try {
    const { userId, amount, method, details } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: "userId and amount required" });
    const user = await User.findOne({ uid: userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.balance < amount) return res.status(400).json({ error: "Insufficient balance" });
    await User.findOneAndUpdate({ uid: userId }, { $inc: { balance: -amount } });
    const tx = new Transaction({ userId, type: "withdrawal", amount, time: new Date() });
    await tx.save();
    res.json({ success: true, newBalance: user.balance - amount });
  } catch (err: any) {
    res.status(500).json({ error: "Withdrawal failed: " + err.message });
  }
});

// ─── Users ────────────────────────────────────────────────────────────────────

app.get("/api/users", async (_req, res) => {
  try { res.json(await User.find().sort({ createdAt: -1 })); }
  catch { res.status(500).json({ error: "Failed to fetch users" }); }
});

app.get("/api/users/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch { res.status(500).json({ error: "Failed to fetch user" }); }
});

app.post("/api/users", async (req, res) => {
  try {
    const { uid, ...data } = req.body;
    if (!uid) return res.status(400).json({ error: "uid is required" });

    const currentUser = await User.findOne({ uid });
    const isAdmin = currentUser?.role === 'admin' || data.role === 'admin';
    const sensitiveFields = ['balance', 'initial_balance', 'accountStatus', 'tradingCapital', 'tradingPermission', 'challenge', 'challengeStatus', 'currentChallengeName', 'challengeActivatedAt', 'tradingAccountId', 'role'];
    const isSensitiveUpdate = sensitiveFields.some((field) => Object.prototype.hasOwnProperty.call(data, field));
    const allowSensitiveUpdate = isAdmin || data.allowFundingUpdate === true || data.source === 'trade-engine';

    if (isSensitiveUpdate && !allowSensitiveUpdate) {
      return res.status(403).json({ error: "Only admin can modify funding and challenge account state" });
    }

    const sanitized = { ...data };
    delete sanitized.allowFundingUpdate;
    delete sanitized.source;

    const user = await User.findOneAndUpdate({ uid }, { $set: sanitized }, { upsert: true, new: true });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to upsert user", message: err.message });
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

// User Signup - creates regular trader account
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, phoneNumber, mobile, referralCode, isPartner } = req.body;
    const finalPhone = phoneNumber || mobile;
    const existing = await User.findOne({
      $or: [{ email }, { phoneNumber: finalPhone || "___none___" }],
    });
    if (existing) return res.status(400).json({ error: "User already exists with this email or mobile number" });
    
    // PARTNER SIGNUP PATH
    if (isPartner) {
      const partnerCode = `PARTNER_${uuidv4().substring(0, 8).toUpperCase()}`;
      const uid = uuidv4();
      const user = new User({
        uid,
        email,
        password,
        name,
        phoneNumber: finalPhone,
        balance: 0,
        initial_balance: 0,
        accountStatus: "active",
        tradingCapital: 0,
        tradingPermission: false,
        role: 'partner',
        partnerCode,
        referralCode: partnerCode,
      });
      await user.save();
      
      const partner = new Partner({
        userId: uid,
        partnerName: name,
        referralCode: partnerCode,
        status: 'approved',
        commissionRate: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await partner.save();
      
      return res.json(user);
    }
    
    // REGULAR USER SIGNUP PATH
    const user = new User({
      uid: uuidv4(), email, password, name,
      phoneNumber: finalPhone,
      balance: 0,
      initial_balance: 0,
      accountStatus: "inactive",
      tradingCapital: 0,
      tradingPermission: false,
      challenge: null,
      challengeStatus: "none",
      role: 'user',
    });
    await user.save();
    // Attach partner attribution if a valid referral code was provided
    if (referralCode) {
      try {
        const partner = await Partner.findOne({ referralCode: String(referralCode).toUpperCase() });
        if (partner && partner.status === 'approved') {
          user.partnerId = partner._id.toString();
          user.partnerCode = partner.referralCode;
          user.referralSource = 'partner';
          await user.save();
          await new Referral({ referralCode: partner.referralCode, partnerId: partner._id.toString(), type: 'signup', userId: user.uid }).save();
        }
      } catch (err) {
        console.error('[Referral] attach failed', err);
      }
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Signup failed: " + err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, mobile, phoneNumber } = req.body;
    const finalPhone = mobile || phoneNumber;
    const query: any = email ? { email } : finalPhone ? { phoneNumber: finalPhone } : null;
    if (!query) return res.status(400).json({ error: "Email or Mobile is required" });
    const user = await User.findOne(query);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Login failed: " + err.message });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (mobile === "9691827337" && password === "888981") {
      let user = await User.findOne({ email: "admin@indotrader.com" });
      if (!user) {
        user = new User({
          uid: uuidv4(), email: "admin@indotrader.com", password,
          name: "System Admin", role: "admin",
          balance: 0, initial_balance: 0, phoneNumber: mobile,
          accountStatus: "active",
          tradingCapital: 0,
          tradingPermission: false,
        });
        await user.save();
      } else if (user.role !== "admin") {
        user.role = "admin";
        await user.save();
      }
      return res.json(user);
    }
    res.status(401).json({ error: "Invalid admin credentials" });
  } catch (err: any) {
    res.status(500).json({ error: "Admin login failed" });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email, mobile } = req.body;
    const query: any = email ? { email } : mobile ? { phoneNumber: mobile } : null;
    if (!query) return res.status(400).json({ error: "Identification required" });
    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (process.env.SMTP_USER && process.env.SMTP_PASS && user.email) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: "Password Recovery - Indo Trader",
        text: `Hello ${user.name},\n\nYour password is: ${user.password}\n\nPlease keep it secure.`,
      });
      return res.json({ message: "Password sent to your email" });
    }
    res.json({ message: "Demo: password recovery (SMTP not configured)", password: user.password });
  } catch (err: any) {
    res.status(500).json({ error: "Password recovery failed" });
  }
});

// ─── Trades ───────────────────────────────────────────────────────────────────

app.get("/api/trades", async (req, res) => {
  try {
    const filter = req.query.userId ? { userId: req.query.userId as string } : {};
    res.json(await Trade.find(filter).sort({ time: -1 }));
  } catch { res.status(500).json({ error: "Failed to fetch trades" }); }
});

app.post("/api/trades", async (req, res) => {
  try { res.json(await new Trade(req.body).save()); }
  catch { res.status(500).json({ error: "Failed to create trade" }); }
});

app.put("/api/trades/:id", async (req, res) => {
  try {
    res.json(await Trade.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true }));
  } catch { res.status(500).json({ error: "Failed to update trade" }); }
});

// ─── Challenges ───────────────────────────────────────────────────────────────

app.get("/api/challenges", async (_req, res) => {
  try { res.json(await Challenge.find()); }
  catch { res.status(500).json({ error: "Failed to fetch challenges" }); }
});

app.post("/api/challenges", async (req, res) => {
  try {
    const id = req.body._id || new mongoose.Types.ObjectId();
    res.json(await Challenge.findByIdAndUpdate(id, req.body, { upsert: true, new: true }));
  } catch { res.status(500).json({ error: "Failed to upsert challenge" }); }
});

app.delete("/api/challenges/:id", async (req, res) => {
  try { await Challenge.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: "Failed to delete challenge" }); }
});

// ─── Rules ────────────────────────────────────────────────────────────────────

app.get("/api/rules", async (_req, res) => {
  try { res.json(await Rule.find()); }
  catch { res.status(500).json({ error: "Failed to fetch rules" }); }
});

app.post("/api/rules", async (req, res) => {
  try {
    const id = req.body._id || new mongoose.Types.ObjectId();
    res.json(await Rule.findByIdAndUpdate(id, req.body, { upsert: true, new: true }));
  } catch { res.status(500).json({ error: "Failed to upsert rule" }); }
});

app.delete("/api/rules/:id", async (req, res) => {
  try { await Rule.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch { res.status(500).json({ error: "Failed to delete rule" }); }
});

// ─── Settings ─────────────────────────────────────────────────────────────────

app.get("/api/settings/:id", async (req, res) => {
  try {
    const setting = await Setting.findOne({ id: req.params.id });
    res.json(setting?.data || {});
  } catch { res.status(500).json({ error: "Failed to fetch settings" }); }
});

app.post("/api/settings/:id", async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { id: req.params.id },
      { $set: { data: req.body } },
      { upsert: true, new: true }
    );
    res.json(setting.data);
  } catch { res.status(500).json({ error: "Failed to update settings" }); }
});

// ─── Transactions ─────────────────────────────────────────────────────────────

const createNotification = async (userId: string, type: string, title: string, message: string) => {
  try {
    await new Notification({ userId, type, title, message }).save();
  } catch (err) {
    console.error("[Notification] failed", err);
  }
};

const recordAdminAction = async (adminId: string, action: string, targetType: string, targetId: string, details: any) => {
  try {
    await new AdminAction({ adminId, action, targetType, targetId, details }).save();
  } catch (err) {
    console.error("[AdminAction] failed", err);
  }
};

const recordFundHistory = async (userId: string, type: string, amount: number, balanceBefore: number, balanceAfter: number, reason: string, referenceId: string, adminId?: string) => {
  try {
    await new FundHistory({ userId, type, amount, balanceBefore, balanceAfter, reason, referenceId, adminId }).save();
  } catch (err) {
    console.error("[FundHistory] failed", err);
  }
};

// ─── Partner / Referral Helpers & Endpoints ───────────────────────────────

const generateReferralCode = async (baseName: string) => {
  const base = (baseName || 'PARTNER').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'PARTNER';
  for (let i = 0; i < 8; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000).toString().slice(0, 4);
    const code = (base + suffix).slice(0, 10).toUpperCase();
    const exists = await Partner.findOne({ referralCode: code });
    if (!exists) return code;
  }
  // fallback
  return base + Date.now().toString().slice(-6);
};

app.get('/api/referral/validate', async (req, res) => {
  try {
    const { code } = req.query as any;
    if (!code) return res.status(400).json({ error: 'code is required' });
    const partner = await Partner.findOne({ referralCode: String(code).toUpperCase() });
    if (!partner) return res.status(404).json({ valid: false });
    res.json({ valid: true, partnerId: partner._id.toString(), partnerName: partner.partnerName });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/referral/click', async (req, res) => {
  try {
    const { referralCode, partnerId, ip, userAgent, path } = req.body || {};
    if (!referralCode || !partnerId) return res.status(400).json({ error: 'referralCode and partnerId required' });
    await new Referral({ referralCode: String(referralCode).toUpperCase(), partnerId, type: 'click', ip, userAgent, path }).save();
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.post('/api/partners/apply', async (req, res) => {
  try {
    const { uid, partnerName, partnerType, instagram, youtube, website, audienceSize, city, reason } = req.body || {};
    if (!uid || !partnerName) return res.status(400).json({ error: 'uid and partnerName required' });
    const existing = await Partner.findOne({ userId: uid });
    if (existing) return res.status(400).json({ error: 'Partner application already exists for this user' });
    const partner = new Partner({ userId: uid, partnerName, partnerType, commissionRate: 15, status: 'pending', createdAt: new Date(), updatedAt: new Date(), application: { instagram, youtube, website, audienceSize, city, reason } });
    await partner.save();
    res.json({ success: true, partner });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin: list partners
app.get('/api/partners', async (req, res) => {
  try {
    const uid = (req.query.uid as string) || (req.body && req.body.uid);
    const currentUser = uid ? await User.findOne({ uid }) : null;
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    const partners = await Partner.find().sort({ createdAt: -1 });
    res.json(partners);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin: approve partner application
app.post('/api/partners/:id/approve', async (req, res) => {
  try {
    const uid = req.body.uid;
    const currentUser = uid ? await User.findOne({ uid }) : null;
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    if (partner.status === 'approved') return res.json({ success: true, partner });
    partner.status = 'approved';
    partner.referralCode = await generateReferralCode(partner.partnerName || partner.userId || 'PART');
    partner.updatedAt = new Date();
    await partner.save();
    // attach partner to user record - be tolerant of stored key (uid vs _id)
    try {
      let updatedUser = await User.findOneAndUpdate({ uid: partner.userId }, { $set: { partnerId: partner._id.toString(), partnerCode: partner.referralCode, referralSource: 'partner', role: 'partner' } }, { new: true });
      if (!updatedUser) {
        // maybe partner.userId holds the Mongo _id
        try {
          updatedUser = await User.findByIdAndUpdate(partner.userId, { $set: { partnerId: partner._id.toString(), partnerCode: partner.referralCode, referralSource: 'partner', role: 'partner' } }, { new: true });
        } catch (innerErr) {
          console.error('[PartnerApprove] findById update failed', innerErr?.message || innerErr);
        }
      }
      if (!updatedUser) {
        console.warn('[PartnerApprove] Warning: no matching User found to attach partner for partner.userId=', partner.userId);
      } else {
        console.log('[PartnerApprove] User updated to partner:', { uid: updatedUser.uid, _id: updatedUser._id.toString(), partnerId: updatedUser.partnerId, partnerCode: updatedUser.partnerCode, role: updatedUser.role });
      }
    } catch (err: any) {
      console.error('[PartnerApprove] attaching partner to user failed', err.message);
    }
    res.json({ success: true, partner });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Partner: list commissions
app.get('/api/partner/commissions', async (req, res) => {
  try {
    const uid = (req.query.uid as string) || (req.body && req.body.uid);
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const user = await User.findOne({ uid });
    let partnerId = user?.partnerId;
    if (!partnerId) {
      const p = await Partner.findOne({ userId: uid });
      partnerId = p?._id?.toString() || null;
    }
    if (!partnerId) return res.status(403).json({ error: 'Partner role required' });
    const commissions = await Commission.find({ partnerId }).sort({ createdAt: -1 });
    res.json(commissions);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Partner: request payout
app.post('/api/partner/payouts/request', async (req, res) => {
  try {
    const { uid, amount, paymentMethod, payoutDetails } = req.body || {};
    if (!uid || !amount) return res.status(400).json({ error: 'uid and amount required' });
    const user = await User.findOne({ uid });
    let partnerId = user?.partnerId;
    if (!partnerId) {
      const p = await Partner.findOne({ userId: uid });
      partnerId = p?._id?.toString() || null;
    }
    if (!partnerId) return res.status(403).json({ error: 'Partner role required' });
    // calculate available balance: sum(approved commissions) - sum(payouts in pending/processing/paid)
    const agg = await Commission.aggregate([
      { $match: { partnerId, status: 'approved' } },
      { $group: { _id: null, totalApproved: { $sum: '$commissionAmount' } } }
    ]);
    const totalApproved = agg[0]?.totalApproved || 0;
    const payoutsAgg = await Payout.aggregate([
      { $match: { partnerId, status: { $in: ['pending', 'processing', 'paid'] } } },
      { $group: { _id: null, totalOut: { $sum: '$amount' } } }
    ]);
    const totalOut = payoutsAgg[0]?.totalOut || 0;
    const available = totalApproved - totalOut;
    if (amount > available) return res.status(400).json({ error: 'Requested amount exceeds available balance', available });
    const payout = await new Payout({ partnerId, amount, paymentMethod, payoutDetails, status: 'pending', requestedAt: new Date() }).save();
    res.json({ success: true, payout });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Partner: list own payouts
app.get('/api/partner/payouts', async (req, res) => {
  try {
    const uid = (req.query.uid as string) || (req.body && req.body.uid);
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const user = await User.findOne({ uid });
    let partnerId = user?.partnerId;
    if (!partnerId) {
      const p = await Partner.findOne({ userId: uid });
      partnerId = p?._id?.toString() || null;
    }
    if (!partnerId) return res.status(403).json({ error: 'Partner role required' });
    const payouts = await Payout.find({ partnerId }).sort({ requestedAt: -1 });
    res.json(payouts);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Partner: list referrals
app.get('/api/partner/referrals', async (req, res) => {
  try {
    const uid = (req.query.uid as string) || (req.body && req.body.uid);
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const user = await User.findOne({ uid });
    let partnerId = user?.partnerId;
    if (!partnerId) {
      const p = await Partner.findOne({ userId: uid });
      partnerId = p?._id?.toString() || null;
    }
    if (!partnerId) return res.status(403).json({ error: 'Partner role required' });
    const referrals = await Referral.find({ partnerId }).sort({ createdAt: -1 });
    res.json(referrals);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin: list payout requests
app.get('/api/admin/payouts', async (req, res) => {
  try {
    const uid = (req.query.uid as string) || (req.body && req.body.uid);
    const currentUser = uid ? await User.findOne({ uid }) : null;
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    const payouts = await Payout.find().sort({ requestedAt: -1 });
    res.json(payouts);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin: list all commissions (admin-only)
app.get('/api/admin/commissions', async (req, res) => {
  try {
    const uid = (req.query.uid as string) || (req.body && req.body.uid);
    const currentUser = uid ? await User.findOne({ uid }) : null;
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    const commissions = await Commission.find().sort({ createdAt: -1 });
    res.json(commissions);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin: mark payout as paid
app.post('/api/admin/payouts/:id/mark-paid', async (req, res) => {
  try {
    const uid = req.body.uid;
    const currentUser = uid ? await User.findOne({ uid }) : null;
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    const { transactionRef, paidAmount } = req.body || {};
    if (!transactionRef) return res.status(400).json({ error: 'transactionRef required' });
    payout.status = 'paid';
    payout.processedAt = new Date();
    payout.transactionRef = transactionRef;
    await payout.save();
    res.json({ success: true, payout });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Admin: reject payout
app.post('/api/admin/payouts/:id/reject', async (req, res) => {
  try {
    const uid = req.body.uid;
    const currentUser = uid ? await User.findOne({ uid }) : null;
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    const payout = await Payout.findById(req.params.id);
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    payout.status = 'rejected';
    payout.processedAt = new Date();
    payout.adminNote = req.body.adminNote || '';
    await payout.save();
    res.json({ success: true, payout });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});


app.get("/api/transactions", async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.userId) filter.userId = req.query.userId as string;
    if (req.query.status) filter.status = req.query.status as string;
    if (req.query.type) filter.type = req.query.type as string;
    res.json(await Transaction.find(filter).sort({ time: -1 }));
  } catch { res.status(500).json({ error: "Failed to fetch transactions" }); }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const payload = req.body;
    const transaction = await new Transaction(payload).save();
    if (payload.type === 'challenge_purchase' && payload.userId) {
      const user = await User.findOne({ uid: payload.userId });
      const purchase = await new ChallengePurchase({
        userId: payload.userId,
        userEmail: user?.email || '',
        challengeName: payload.challengeName || payload.planName || 'Challenge',
        fundingAmount: payload.capital || 0,
        challengeFee: payload.amount || 0,
        transactionId: String(transaction._id),
        paymentReference: payload.paymentReference || payload.paymentLink || '',
        paymentDate: payload.paymentDate || new Date(),
        paymentStatus: 'successful',
        invoiceNumber: payload.invoiceNumber || `INV-${Date.now()}`,
        status: 'pending',
      }).save();
      // If the user was referred by a partner, create one commission record (idempotent)
      try {
        const referringPartnerId = user?.partnerId;
        if (referringPartnerId) {
          const existing = await Commission.findOne({ transactionId: String(transaction._id) });
          if (!existing) {
            const partner = await Partner.findById(referringPartnerId);
            const commissionRate = partner?.commissionRate ?? 15;
            const commissionAmount = ((purchase.challengeFee || 0) * commissionRate) / 100;
            await new Commission({ partnerId: referringPartnerId, userId: payload.userId, transactionId: String(transaction._id), challengeName: purchase.challengeName, purchaseAmount: purchase.challengeFee || 0, commissionRate, commissionAmount, status: 'pending' }).save();
          }
        }
      } catch (err: any) {
        console.error('[Commission] creation failed', err.message);
      }
      await createNotification(payload.userId, 'payment_successful', 'Payment Successful', 'Payment Successful. Your challenge is under review. Once approved, your funded account will be activated.');
      await ChallengeStatus.findOneAndUpdate({ userId: payload.userId }, { $set: { status: 'pending', challengeName: purchase.challengeName, fundingAmount: purchase.fundingAmount, tradingCapital: 0, updatedAt: new Date() } }, { upsert: true, new: true });
      await TradingAccount.findOneAndUpdate({ userId: payload.userId }, { $set: { status: 'inactive', fundingAmount: purchase.fundingAmount, challengeName: purchase.challengeName, tradingCapital: 0, updatedAt: new Date() } }, { upsert: true, new: true });
      return res.json({ transaction, purchase });
    }
    res.json(transaction);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create transaction", message: err.message });
  }
});

app.put("/api/transactions/:id", async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    const updates = req.body;
    const updatedTx = await Transaction.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });

    if (updates.status === 'approved' && tx.status !== 'approved' && tx.capital && tx.userId) {
      const user = await User.findOne({ uid: tx.userId });
      const before = user?.tradingCapital ?? user?.balance ?? 0;
      const after = before + tx.capital;
      await User.findOneAndUpdate({ uid: tx.userId }, {
        $set: {
          balance: after,
          tradingCapital: after,
          tradingPermission: true,
          accountStatus: 'active',
          challengeStatus: 'active',
          challenge: tx.planName || tx.challengeName || 'Challenge',
          currentChallengeName: tx.planName || tx.challengeName || 'Challenge',
          challengeActivatedAt: new Date(),
        }
      });
      await ChallengePurchase.findOneAndUpdate({ transactionId: String(tx._id) }, { $set: { status: 'approved', paymentStatus: 'approved', approvedAt: new Date() } }, { new: true });
      // Create commission on approval if not already created
      try {
        const userRecord = await User.findOne({ uid: tx.userId });
        const referringPartnerId = userRecord?.partnerId;
        if (referringPartnerId) {
          const existing = await Commission.findOne({ transactionId: String(tx._id) });
          if (!existing) {
            const partner = await Partner.findById(referringPartnerId);
            const commissionRate = partner?.commissionRate ?? 15;
            const commissionAmount = ((tx.amount || 0) * commissionRate) / 100;
            await new Commission({ partnerId: referringPartnerId, userId: tx.userId, transactionId: String(tx._id), challengeName: tx.planName || tx.challengeName, purchaseAmount: tx.amount || 0, commissionRate, commissionAmount, status: 'pending' }).save();
          }
        }
      } catch (err: any) {
        console.error('[Commission] creation on approval failed', err.message);
      }
      await ChallengeStatus.findOneAndUpdate({ userId: tx.userId }, { $set: { status: 'active', challengeName: tx.planName || tx.challengeName || 'Challenge', fundingAmount: tx.capital, tradingCapital: tx.capital, activationDate: new Date(), updatedAt: new Date() } }, { upsert: true, new: true });
      await TradingAccount.findOneAndUpdate({ userId: tx.userId }, { $set: { status: 'active', fundingAmount: tx.capital, challengeName: tx.planName || tx.challengeName || 'Challenge', tradingCapital: tx.capital, activatedAt: new Date(), updatedAt: new Date() } }, { upsert: true, new: true });
      await recordFundHistory(tx.userId, 'credit', tx.capital, before, after, 'Challenge approved', String(tx._id));
      await createNotification(tx.userId, 'challenge_approved', 'Challenge Approved', 'Your challenge has been approved and your funded account is now active.');
    }

    if (updates.status === 'rejected' && tx.status !== 'rejected' && tx.userId) {
      const user = await User.findOne({ uid: tx.userId });
      const before = user?.tradingCapital ?? user?.balance ?? 0;
      await User.findOneAndUpdate({ uid: tx.userId }, { $set: { balance: before, tradingCapital: 0, tradingPermission: false, challengeStatus: 'rejected' } });
      await ChallengePurchase.findOneAndUpdate({ transactionId: String(tx._id) }, { $set: { status: 'rejected', paymentStatus: 'rejected', reviewReason: updates.reviewReason || 'Rejected by admin' } }, { new: true });
      await ChallengeStatus.findOneAndUpdate({ userId: tx.userId }, { $set: { status: 'rejected', challengeName: tx.planName || tx.challengeName || 'Challenge', fundingAmount: tx.capital, tradingCapital: 0, updatedAt: new Date() } }, { upsert: true, new: true });
      await TradingAccount.findOneAndUpdate({ userId: tx.userId }, { $set: { status: 'rejected', fundingAmount: tx.capital, challengeName: tx.planName || tx.challengeName || 'Challenge', tradingCapital: 0, updatedAt: new Date() } }, { upsert: true, new: true });
      await createNotification(tx.userId, 'challenge_rejected', 'Challenge Rejected', 'Your challenge purchase was rejected.');
    }

    res.json(updatedTx);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update transaction", message: err.message });
  }
});

app.get("/api/challenge-purchases", async (req, res) => {
  try {
    const purchases = await ChallengePurchase.find().sort({ createdAt: -1 });
    res.json(purchases);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch challenge purchases", message: err.message });
  }
});

app.post("/api/challenge-purchases/:id/approve", async (req, res) => {
  try {
    const adminId = req.body.adminId || 'admin';
    const purchase = await ChallengePurchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    const user = await User.findOne({ uid: purchase.userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const before = user.tradingCapital ?? user.balance ?? 0;
    const after = before + (purchase.fundingAmount || 0);
    await User.findOneAndUpdate({ uid: purchase.userId }, {
      $set: {
        balance: after,
        tradingCapital: after,
        tradingPermission: true,
        accountStatus: 'active',
        challengeStatus: 'active',
        challenge: purchase.challengeName,
        currentChallengeName: purchase.challengeName,
        challengeActivatedAt: new Date(),
      }
    });
    purchase.status = 'approved';
    purchase.paymentStatus = 'approved';
    purchase.approvedAt = new Date();
    purchase.adminId = adminId;
    await purchase.save();
    await ChallengeStatus.findOneAndUpdate({ userId: purchase.userId }, { $set: { status: 'active', challengeName: purchase.challengeName, fundingAmount: purchase.fundingAmount, tradingCapital: purchase.fundingAmount, activationDate: new Date(), updatedAt: new Date() } }, { upsert: true, new: true });
    await TradingAccount.findOneAndUpdate({ userId: purchase.userId }, { $set: { status: 'active', accountNumber: `TRD-${Date.now()}`, fundingAmount: purchase.fundingAmount, challengeName: purchase.challengeName, tradingCapital: purchase.fundingAmount, activatedAt: new Date(), updatedAt: new Date() } }, { upsert: true, new: true });
    await recordFundHistory(String(purchase.userId), 'credit', purchase.fundingAmount || 0, before, after, 'Challenge approved', purchase._id.toString(), adminId);
    await createNotification(String(purchase.userId), 'challenge_approved', 'Challenge Approved', 'Your challenge has been approved and your funded account is now active.');
    await recordAdminAction(adminId, 'approve_challenge', 'ChallengePurchase', purchase._id.toString(), { challengeName: purchase.challengeName });
    res.json({ success: true, purchase });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to approve purchase", message: err.message });
  }
});

app.post("/api/challenge-purchases/:id/reject", async (req, res) => {
  try {
    const adminId = req.body.adminId || 'admin';
    const purchase = await ChallengePurchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });
    const user = await User.findOne({ uid: purchase.userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    purchase.status = 'rejected';
    purchase.paymentStatus = 'rejected';
    purchase.reviewReason = req.body.reason || 'Rejected by admin';
    purchase.adminId = adminId;
    await purchase.save();
    const before = user.tradingCapital ?? user.balance ?? 0;
    await User.findOneAndUpdate({ uid: purchase.userId }, { $set: { balance: before, tradingCapital: 0, tradingPermission: false, challengeStatus: 'rejected' } });
    await ChallengeStatus.findOneAndUpdate({ userId: purchase.userId }, { $set: { status: 'rejected', challengeName: purchase.challengeName, fundingAmount: purchase.fundingAmount, tradingCapital: 0, updatedAt: new Date() } }, { upsert: true, new: true });
    await TradingAccount.findOneAndUpdate({ userId: purchase.userId }, { $set: { status: 'rejected', fundingAmount: purchase.fundingAmount, challengeName: purchase.challengeName, tradingCapital: 0, updatedAt: new Date() } }, { upsert: true, new: true });
    await createNotification(String(purchase.userId), 'challenge_rejected', 'Challenge Rejected', 'Your challenge purchase was rejected.');
    await recordAdminAction(adminId, 'reject_challenge', 'ChallengePurchase', purchase._id.toString(), { reason: purchase.reviewReason });
    res.json({ success: true, purchase });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to reject purchase", message: err.message });
  }
});

app.post("/api/funds/adjust", async (req, res) => {
  try {
    const { userId, type, amount, reason, referenceId, adminId } = req.body;
    const user = await User.findOne({ uid: userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const balanceBefore = user.tradingCapital ?? user.balance ?? 0;
    const balanceAfter = type === 'debit' ? Math.max(0, balanceBefore - (amount || 0)) : balanceBefore + (amount || 0);
    await User.findOneAndUpdate({ uid: userId }, { $set: { balance: balanceAfter, tradingCapital: balanceAfter } });
    await recordFundHistory(userId, type, amount || 0, balanceBefore, balanceAfter, reason || 'Fund update', referenceId, adminId);
    await recordAdminAction(adminId || 'admin', 'fund_update', 'User', userId, { type, amount, reason });
    await createNotification(userId, 'funds_updated', type === 'debit' ? 'Funds Removed' : 'Funds Added', reason || 'Fund update completed.');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update funds", message: err.message });
  }
});

app.post("/api/fund-history", async (req, res) => {
  try {
    const { userId, type, amount, reason, referenceId, adminId } = req.body;
    const user = await User.findOne({ uid: userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    const balanceBefore = user.tradingCapital ?? user.balance ?? 0;
    const balanceAfter = type === 'debit' ? Math.max(0, balanceBefore - (amount || 0)) : balanceBefore + (amount || 0);
    await User.findOneAndUpdate({ uid: userId }, { $set: { balance: balanceAfter, tradingCapital: balanceAfter } });
    await recordFundHistory(userId, type, amount || 0, balanceBefore, balanceAfter, reason || 'Fund update', referenceId, adminId);
    await recordAdminAction(adminId || 'admin', 'fund_update', 'User', userId, { type, amount, reason });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update funds", message: err.message });
  }
});

app.get("/api/fund-history", async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.userId) filter.userId = req.query.userId as string;
    res.json(await FundHistory.find(filter).sort({ createdAt: -1 }));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch fund history", message: err.message });
  }
});

// Debug: list registered API routes
app.get('/api/debug/routes', (_req, res) => {
  try {
    const routes: string[] = [];
    (app as any)._router.stack.forEach((middleware: any) => {
      if (middleware.route) {
        routes.push(middleware.route.path);
      } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
        middleware.handle.stack.forEach((handler: any) => {
          if (handler.route) routes.push(handler.route.path);
        });
      }
    });
    res.json({ routes });
  } catch (err) { res.status(500).json({ error: 'failed' }); }
});

app.get("/api/admin-actions", async (_req, res) => {
  try {
    res.json(await AdminAction.find().sort({ createdAt: -1 }));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch admin actions", message: err.message });
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const filter: any = {};
    if (req.query.userId) filter.userId = req.query.userId as string;
    res.json(await Notification.find(filter).sort({ createdAt: -1 }));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch notifications", message: err.message });
  }
});

app.post("/api/notifications/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { $set: { read: true } }, { new: true });
    res.json(notification);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to mark notification read", message: err.message });
  }
});

// ─── API 404 & Error Handler ─────────────────────────────────────────────────

app.use("/api/*", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

app.use("/api", (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[API Error]", err);
  res.status(err.status || 500).json({ error: "Internal Server Error", message: err.message });
});

// ─── Server Start ─────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  try {
    if (process.env.API_ONLY === "true") {
      console.log("[Server] API-only mode — Vite running separately.");
    } else if (process.env.NODE_ENV !== "production") {
      console.log("🔵 [Vite] Initializing Vite dev server...");
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      console.log("🟢 [Vite] Vite dev server ready.");
      app.use((req, res, next) => {
        if (req.url.startsWith("/api")) return next();
        vite.middlewares(req, res, next);
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.xml')) {
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
          } else if (filePath.endsWith('.txt')) {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          }
        },
      }));
      app.get('/sitemap.xml', (_req, res) => {
        res.sendFile(path.join(distPath, 'sitemap.xml'));
      });
      app.get('/robots.txt', (_req, res) => {
        res.sendFile(path.join(distPath, 'robots.txt'));
      });
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api")) return res.status(404).json({ error: "Not found" });
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      // Start market feed after server is listening
      marketFeed.start();
      if (shouldAutoStartSimulator()) {
        marketSimulator.start();
      } else if (process.env.NODE_ENV !== "production") {
        console.log("[MarketSimulator] available in development. Set TEST_MODE=true or ENABLE_MARKET_SIMULATOR=true, or POST /api/market/simulator/start.");
      }
    });

    // Connect to MongoDB (non-blocking — server stays up even if DB is down)
    connectDB()
      .then(() => console.log("✅ MongoDB connected."))
      .catch((err: Error) => {
        console.error("❌ MongoDB unavailable:", err.message);
        console.error("[Server] UI and market data will work; DB-backed routes return 503.");
      });

  } catch (err: any) {
    console.error("[Server] Fatal startup error:", err.message);
    process.exit(1);
  }
}

startServer();

export default app;
