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
import { connectDB, Setting, User, Trade, Challenge, Rule, Transaction } from "./db.js";
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
  console.log(`[Socket] Client connected. Total: ${connectedClients}`);
  socketChartSubscriptions.set(socket.id, new Set<string>());

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
  });

  socket.on("disconnect", (reason) => {
    connectedClients--;
    console.log(`[Socket] Client disconnected (${reason}). Total: ${connectedClients}`);
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
  });
});

// ─── Health & Status Routes ──────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    dhanWs: marketFeed.isConnected() ? "connected" : "disconnected",
    simulator: marketSimulator.status(),
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
    const user = await User.findOneAndUpdate({ uid }, { $set: data }, { upsert: true, new: true });
    res.json(user);
  } catch { res.status(500).json({ error: "Failed to upsert user" }); }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, phoneNumber, mobile } = req.body;
    const finalPhone = phoneNumber || mobile;
    const existing = await User.findOne({
      $or: [{ email }, { phoneNumber: finalPhone || "___none___" }],
    });
    if (existing) return res.status(400).json({ error: "User already exists with this email or mobile number" });
    const user = new User({
      uid: uuidv4(), email, password, name,
      phoneNumber: finalPhone, balance: 100000, initial_balance: 100000,
    });
    await user.save();
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
          balance: 10000000, initial_balance: 10000000, phoneNumber: mobile,
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

app.get("/api/transactions", async (req, res) => {
  try {
    const filter = req.query.userId ? { userId: req.query.userId as string } : {};
    res.json(await Transaction.find(filter).sort({ time: -1 }));
  } catch { res.status(500).json({ error: "Failed to fetch transactions" }); }
});

app.post("/api/transactions", async (req, res) => {
  try { res.json(await new Transaction(req.body).save()); }
  catch { res.status(500).json({ error: "Failed to create transaction" }); }
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
      app.use(express.static(distPath));
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
