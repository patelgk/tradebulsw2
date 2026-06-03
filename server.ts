import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from 'axios';
import fs from 'fs';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { connectDB, Setting, User, Trade, Challenge, Rule, Transaction } from './db.js';
import dhanRoutes from "./routes/dhanRoutes.js";
import { dhanServiceInstance } from "./services/dhanService.js";

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
// Removed from top-level to await inside startServer

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

// Dhan API routes registration
app.use("/", dhanRoutes);
app.use("/api", dhanRoutes);
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// --- Helper Functions ---
const isMarketOpen = () => {
  const now = new Date();
  // Convert to IST (UTC + 5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  const day = istTime.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Market open: Mon-Fri, 09:15 to 15:30 IST
  const isOpenDay = day >= 1 && day <= 5;
  const isOpenTime = timeInMinutes >= (9 * 60 + 15) && timeInMinutes <= (15 * 60 + 30);

  return isOpenDay && isOpenTime;
};

const getNextExpiry = (symbol: string) => {
  const today = new Date();
  const day = today.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
  
  // Default expiry days for Indian Indices
  // Nifty 50: Thursday (4)
  // Bank Nifty: Wednesday (3)
  // Fin Nifty: Tuesday (2)
  // Midcap Nifty: Monday (1)
  const expiryDays: Record<string, number> = {
    'Nifty 50': 4,
    'Bank Nifty': 3,
    'Fin Nifty': 2,
    'Midcap Nifty': 1
  };

  const targetDay = expiryDays[symbol] || 4;
  let diff = (targetDay - day + 7) % 7;
  
  // If today is the expiry day, we might want today's expiry or next week's
  // For simplicity, if it's before 3:30 PM, we use today, else next week
  const now = new Date();
  const isAfterMarket = now.getHours() > 15 || (now.getHours() === 15 && now.getMinutes() > 30);
  
  if (diff === 0 && isAfterMarket) {
    diff = 7;
  }

  const nextExpiry = new Date(today);
  nextExpiry.setDate(today.getDate() + diff);
  return nextExpiry.toISOString().split('T')[0];
};

const generateOptionChain = (spotPrice: number, strikeStep: number = 50, symbol: string = 'Nifty 50') => {
  const strikes = [];
  const roundedSpot = Math.round(spotPrice / strikeStep) * strikeStep;
  
  // Black-Scholes-like simplified pricing
  const volatility = 0.15; // 15% annual vol
  const daysToExpiry = 4; // Assuming 4 days to expiry
  const t = daysToExpiry / 365;
  
  // Realistic OI base based on symbol
  const oiBase = symbol.includes('Bank') ? 100000 : (symbol.includes('Midcap') ? 50000 : 200000);
  
  for (let i = -10; i <= 10; i++) {
    const strike = roundedSpot + (i * strikeStep);
    
    // Simplified Intrinsic + Extrinsic value
    const intrinsic_ce = Math.max(0, spotPrice - strike);
    const intrinsic_pe = Math.max(0, strike - spotPrice);
    
    // Extrinsic value using a simple Gaussian-like curve centered at ATM
    const distance = Math.abs(strike - spotPrice);
    const extrinsic = spotPrice * volatility * Math.sqrt(t) * Math.exp(-Math.pow(distance / (spotPrice * volatility * Math.sqrt(t) * 2), 2));
    
    const ce_ltp = intrinsic_ce + extrinsic + (Math.random() - 0.5) * 2;
    const pe_ltp = intrinsic_pe + extrinsic + (Math.random() - 0.5) * 2;
    
    strikes.push({
      strike,
      ce_oi: Math.floor(Math.random() * oiBase) + (oiBase / 2),
      ce_oi_change: Math.floor((Math.random() - 0.2) * (oiBase / 10)),
      ce_ltp: Number(Math.max(0.05, ce_ltp).toFixed(2)),
      pe_ltp: Number(Math.max(0.05, pe_ltp).toFixed(2)),
      pe_oi_change: Math.floor((Math.random() - 0.2) * (oiBase / 10)),
      pe_oi: Math.floor(Math.random() * oiBase) + (oiBase / 2),
    });
  }
  return strikes;
};

const marketData: Record<string, { price: number, change: number, optionChain: any[], timestamp: string, expiry: string, expiries?: string[], isMarketOpen?: boolean, dataSource?: string }> = {
  'Nifty 50': { price: 22453.80, change: 102.45, optionChain: [], timestamp: '--:--:--', expiry: '', isMarketOpen: false, dataSource: 'Live' },
  'Bank Nifty': { price: 47500.00, change: 250.00, optionChain: [], timestamp: '--:--:--', expiry: '', isMarketOpen: false, dataSource: 'Live' },
  'Fin Nifty': { price: 21000.00, change: 50.00, optionChain: [], timestamp: '--:--:--', expiry: '', isMarketOpen: false, dataSource: 'Live' },
  'Midcap Nifty': { price: 10500.00, change: 30.00, optionChain: [], timestamp: '--:--:--', expiry: '', isMarketOpen: false, dataSource: 'Live' },
  'RELIANCE': { price: 2950.00, change: 15.00, optionChain: [], timestamp: '--:--:--', expiry: '', isMarketOpen: false, dataSource: 'Live' },
};

// Update expiries immediately
Object.keys(marketData).forEach(symbol => {
  marketData[symbol].expiry = getNextExpiry(symbol);
});

const SYMBOL_MAP: Record<string, string> = {
  'Nifty 50': 'NSE_INDEX|Nifty 50',
  'Bank Nifty': 'NSE_INDEX|Nifty Bank',
  'Fin Nifty': 'NSE_INDEX|FINNIFTY',
  'Midcap Nifty': 'NSE_INDEX|MIDCPNIFTY',
  'RELIANCE': 'NSE_EQ|RELIANCE'
};

const DHAN_SYMBOLS: Record<string, string> = {
  '13': 'Nifty 50',
  '25': 'Bank Nifty',
  '27': 'Fin Nifty',
  '31': 'Midcap Nifty',
  '32': 'Midcap Nifty',
};

// --- Dhan Server Service ---
class DhanServerManager {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastOptionFetch: Record<string, number> = {};
  private availableExpiries: Record<string, string[]> = {};

  constructor() {}

  clearCache(displayName: string) {
    delete this.lastOptionFetch[displayName];
  }

  getAvailableExpiries(displayName: string) {
    return this.availableExpiries[displayName] || [];
  }

  getDhanScripDetails(displayName: string) {
    const mappings: Record<string, { scrip: number, seg: string }> = {
      'Nifty 50': { scrip: 13, seg: 'IDX_I' },
      'Bank Nifty': { scrip: 25, seg: 'IDX_I' },
      'Fin Nifty': { scrip: 27, seg: 'IDX_I' },
      'Midcap Nifty': { scrip: 31, seg: 'IDX_I' },
      'RELIANCE': { scrip: 2885, seg: 'NSE_EQ' },
    };
    return mappings[displayName] || { scrip: 13, seg: 'IDX_I' };
  }

  async fetchExpiries(displayName: string, accessToken: string) {
    try {
      if (!accessToken) {
        console.warn(`[Dhan Server] No access token provided for fetchExpiries(${displayName})`);
        return [];
      }

      const details = this.getDhanScripDetails(displayName);
      const url = 'https://api.dhan.co/v2/optionchain/expiry-list';
      console.log(`[Dhan Server] Fetching expiries for ${displayName} (Scrip: ${details.scrip}, Seg: ${details.seg})`);
      
      const provider = marketSettings.providers.find(p => p.id === 'dhan');
      const clientId = provider?.clientId || process.env.VITE_DHAN_CLIENT_ID || "";

      const res = await axios.post(url, {
        UnderlyingScrip: details.scrip,
        UnderlyingSeg: details.seg
      }, {
        headers: {
          'access-token': accessToken,
          'client-id': clientId,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      if (res.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        this.availableExpiries[displayName] = list;
        return list;
      }
      return [];
    } catch (err: any) {
      console.error(`[Dhan Server] Failed to fetch expiries for ${displayName}:`, err.response?.data || err.message);
      return [];
    }
  }

  async fetchOptionChain(displayName: string, accessToken: string) {
    try {
      if (!accessToken) {
        console.warn(`[Dhan Server] No access token provided for fetchOptionChain(${displayName})`);
        return;
      }

      const now = Date.now();
      if (this.lastOptionFetch[displayName] && now - this.lastOptionFetch[displayName] < 300000) {
        return; 
      }

      const details = this.getDhanScripDetails(displayName);
      
      // Ensure we have expiries
      if (!this.availableExpiries[displayName] || this.availableExpiries[displayName].length === 0) {
        await this.fetchExpiries(displayName, accessToken);
      }

      let expiry = marketData[displayName].expiry;
      const expiries = this.availableExpiries[displayName] || [];
      
      if (expiries.length > 0 && !expiries.includes(expiry)) {
        console.log(`[Dhan Server] Expiry ${expiry} not found for ${displayName}. Using available: ${expiries[0]}`);
        expiry = expiries[0];
        marketData[displayName].expiry = expiry;
      }

      if (!expiry && expiries.length > 0) {
        expiry = expiries[0];
        marketData[displayName].expiry = expiry;
      }

      if (!expiry) {
        expiry = getNextExpiry(displayName);
        marketData[displayName].expiry = expiry;
      }

      const url = 'https://api.dhan.co/v2/optionchain';
      console.log(`[Dhan Server] Fetching option chain for ${displayName} with expiry ${expiry}`);
      
      const provider = marketSettings.providers.find(p => p.id === 'dhan');
      const clientId = provider?.clientId || process.env.VITE_DHAN_CLIENT_ID || "";

      const res = await axios.post(url, {
        UnderlyingScrip: details.scrip,
        UnderlyingSeg: details.seg,
        Expiry: expiry
      }, {
        headers: {
          'access-token': accessToken,
          'client-id': clientId,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (res.data) {
        this.lastOptionFetch[displayName] = now;
        
        let chain: any[] = [];
        if (res.data.data) {
          if (Array.isArray(res.data.data)) {
            chain = res.data.data;
          } else if (res.data.data.oc_list && Array.isArray(res.data.data.oc_list)) {
            chain = res.data.data.oc_list;
          } else if (res.data.data.data && Array.isArray(res.data.data.data)) {
            chain = res.data.data.data;
          }
        } else if (Array.isArray(res.data)) {
          chain = res.data;
        }

        console.log(`[Dhan Server] Received ${chain.length} strikes for ${displayName}`);
        
        const updatedOptionChain: any[] = [];

        chain.forEach((item: any) => {
          const strike = item.strikePrice || item.strike_price || item.strike || 0;
          if (!strike) return;

          const callObj = item.callOption || item.call_options || item.ce;
          const putObj = item.putOption || item.put_options || item.pe;

          const ce_ltp = callObj ? (callObj.lastPrice || callObj.last_price || callObj.ltp || 0) : 0;
          const ce_oi = callObj ? (callObj.openInterest || callObj.open_interest || callObj.oi || 0) : 0;
          const ce_oi_change = callObj ? (callObj.oiChange || callObj.oi_change || 0) : 0;

          const pe_ltp = putObj ? (putObj.lastPrice || putObj.last_price || putObj.ltp || 0) : 0;
          const pe_oi = putObj ? (putObj.openInterest || putObj.open_interest || putObj.oi || 0) : 0;
          const pe_oi_change = putObj ? (putObj.oiChange || putObj.oi_change || 0) : 0;

          updatedOptionChain.push({
            strike,
            ce_ltp,
            ce_oi,
            ce_oi_change,
            pe_ltp,
            pe_oi,
            pe_oi_change
          });
        });

        if (updatedOptionChain.length > 0) {
          marketData[displayName].optionChain = updatedOptionChain;
          marketData[displayName].dataSource = 'Dhan';
        }
      }
    } catch (err: any) {
      console.error(`[Dhan Server] Failed to fetch option chain for ${displayName}:`, err.response?.data || err.message);
    }
  }

  isConnectedStatus() {
    return this.isConnected;
  }

  async getHistory(symbol: string, interval: string) {
    try {
      const dhanKey = {
        'Nifty 50': '13',
        'Bank Nifty': '25',
        'Fin Nifty': '27',
        'Midcap Nifty': '32'
      }[symbol];

      if (!dhanKey) return null;

      const provider = marketSettings.providers.find(p => p.id === 'dhan');
      const accessToken = provider?.accessToken || process.env.VITE_DHAN_ACCESS_TOKEN || process.env.DHAN_ACCESS_TOKEN || "";
      if (!accessToken) return null;

      const dhanInterval = {
        '1m': '1',
        '5m': '5',
        '15m': '15',
        '30m': '30',
        '1h': '60',
        '1D': 'DAY'
      }[interval] || '5';

      const isIntraday = dhanInterval !== 'DAY';
      const endpoint = isIntraday 
        ? 'https://api.dhan.co/v2/charts/intraday' 
        : 'https://api.dhan.co/v2/charts/historical';

      const payload: any = {
        symbol: symbol,
        exchangeSegment: 'NSE_IDX',
        instrumentType: 'INDEX',
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        securityId: dhanKey
      };

      if (isIntraday) {
        payload.interval = dhanInterval;
      } else {
        payload.expiryCode = 0;
      }

      console.log(`[Dhan Server] Fetching historical charts for ${symbol} using endpoint: ${endpoint}`);
      const res = await axios.post(endpoint, payload, {
        headers: { 'access-token': accessToken, 'Content-Type': 'application/json' }
      });

      if (res.data?.data) {
        const data = res.data.data;
        // Case 1: Object of arrays (e.g. { start_Time: [...], open: [...] })
        if (data && Array.isArray(data.start_Time)) {
          return data.start_Time.map((timeVal: number, idx: number) => ({
            time: new Date(timeVal * 1000).toISOString(),
            open: data.open?.[idx] || 0,
            high: data.high?.[idx] || 0,
            low: data.low?.[idx] || 0,
            close: data.close?.[idx] || 0,
            volume: data.volume?.[idx] || 0
          }));
        }
        // Case 2: Array of objects
        if (Array.isArray(data)) {
          return data.map((c: any) => ({
            time: new Date((c.start_Time || c.startTime || c.time || 0) * 1000).toISOString(),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume || 0
          }));
        }
      }
      return null;
    } catch (err: any) {
      console.error('[Dhan Server] History fetch failed:', err.response?.data || err.message);
      return null;
    }
  }

  connect() {
    console.log("DISABLE_DHAN_WS =", process.env.DISABLE_DHAN_WS);
    if (process.env.DISABLE_DHAN_WS === 'true') {
      console.log('[Dhan Server] DISABLE_DHAN_WS=true, skipping Dhan WebSocket connection');
      return;
    }

    const activeProvider = marketSettings.providers.find(p => p.id === 'dhan');
    const clientId = activeProvider?.clientId || process.env.VITE_DHAN_CLIENT_ID || process.env.DHAN_CLIENT_ID || "";
    const accessToken = activeProvider?.accessToken || process.env.VITE_DHAN_ACCESS_TOKEN || process.env.DHAN_ACCESS_TOKEN || "";

    if (!clientId || !accessToken) {
      console.log('[Dhan Server] Missing credentials (ClientId or AccessToken), skipping connection.');
      return;
    }

    if (this.ws) {
      this.ws.terminate();
    }
    console.log("WS_CLIENT_ID =", JSON.stringify(clientId));
    console.log("WS_TOKEN_LEN =", accessToken.length);

    console.log(`[Dhan Server] Connecting to Dhan WebSocket... (ClientId: ${clientId.substring(0, 4)}***, Token: ${accessToken.substring(0, 4)}***)`);
    const wsUrl = `wss://api-feed.dhan.co?clientId=${clientId}&accessToken=${accessToken}`;

    console.log("[Dhan Server] WS URL:", wsUrl.replace(accessToken, "***TOKEN***"));

try {
  this.ws = new WebSocket(wsUrl);

  
      this.ws.on('open', () => {
        console.log('✅ [Dhan Server] WebSocket Connected!');
      //this.sendAuthentication(clientId, accessToken);
      });

      this.ws.on('message', (data: any) => {console.log("RAW MESSAGE =", data.toString());
        try {
          if (typeof data === 'string' || Buffer.isBuffer(data)) {
            const message = data.toString();
            if (message.startsWith('{')) {
              const parsed = JSON.parse(message);
              if (parsed.RequestCode === 11 && parsed.Status === "Success") {
                console.log("✅ [Dhan Server] Authentication Successful!");
                this.isConnected = true;
                this.subscribeToSymbols();
              }
            } else {
              this.handlePriceUpdate(data);
            }
          }
        } catch (e) {
          // console.error("[Dhan Server] Error processing message:", e);
        }
      });

      this.ws.on('error', (error) => {
        console.error("❌ [Dhan Server] WebSocket Error:", error.message);
      });

      this.ws.on('close', () => {
        console.log("🔴 [Dhan Server] WebSocket Closed. Reconnecting in 10s...");
        this.isConnected = false;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
       // this.reconnectTimeout = setTimeout(() => this.connect(), 10000);
      });
    } catch (err) {
      console.error('[Dhan Server] Connection failed:', (err as Error).message);
    }
  }
private sendAuthentication(clientId: string, accessToken: string) {
  const authPacket = {
    RequestCode: 11,
    ClientId: clientId,
    Token: accessToken
  };

  console.log("AUTH PACKET =", JSON.stringify(authPacket));

  this.ws?.send(JSON.stringify(authPacket));

  }

  private subscribeToSymbols() {
    const symbolsToSubscribe = [
      { ExchangeSegment: 2, SecurityId: '13' }, // Nifty 50 (NSE_IDX)
      { ExchangeSegment: 2, SecurityId: '25' }, // Bank Nifty (NSE_IDX)
      { ExchangeSegment: 2, SecurityId: '27' }, // Fin Nifty (NSE_IDX)
      { ExchangeSegment: 2, SecurityId: '31' }, // Midcap Nifty (NSE_IDX)
      { ExchangeSegment: 2, SecurityId: '32' }, // Midcap Nifty Fallback (NSE_IDX)
    ];

    const subscribePacket = {
      RequestCode: 15, // 15 for Ticker
      InstrumentList: symbolsToSubscribe
    };

    this.ws?.send(JSON.stringify(subscribePacket));
    console.log("[Dhan Server] Subscribed to index symbols (ExchangeSegment: 2).");
  }

  private handlePriceUpdate(data: any) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (buffer.length < 9) return;
    
    try {
      const responseCode = buffer.readUint8(0);
      
      // Response Code 17 is Ticker Data (LTP)
      if (responseCode === 17 || responseCode === 2) {
        const securityId = buffer.readInt32LE(1).toString();
        const ltp = buffer.readFloatLE(5);
        
        const displayName = DHAN_SYMBOLS[securityId];

        if (displayName && marketData[displayName]) {
          const oldPrice = marketData[displayName].price;
          marketData[displayName].price = ltp;
          marketData[displayName].dataSource = 'Dhan';
          marketData[displayName].timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });

          // Synchronize Option Chain LTP values dynamically on every WebSocket tick
          let optionChain = marketData[displayName].optionChain || [];
          if (optionChain.length > 0 && oldPrice > 0) {
            const spotDelta = ltp - oldPrice;
            marketData[displayName].optionChain = optionChain.map(opt => {
              const distance = opt.strike - ltp;
              const ce_delta = 1 / (1 + Math.exp(distance / (ltp * 0.01)));
              const pe_delta = ce_delta - 1;
              return {
                ...opt,
                ce_ltp: Number(Math.max(0.05, opt.ce_ltp + (spotDelta * ce_delta)).toFixed(2)),
                pe_ltp: Number(Math.max(0.05, opt.pe_ltp + (spotDelta * pe_delta)).toFixed(2)),
              };
            });
          }

          io.emit("marketUpdate", { [displayName]: marketData[displayName] });
        }
      }
    } catch (e) {}
  }

  stop() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

const dhanManager = new DhanServerManager();

let lastFetchTime = 0;
let lastOptionChainFetchTime = 0;
let isFetching = false;
let connectedClients = 0;


// --- NSE Session Management ---
let nseCookies = '';
// --- Market API State ---
interface MarketProvider {
  id: string;
  name: string;
  type: 'dhan' | 'custom';
  clientId?: string;
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  url?: string;
  headers?: Record<string, string>;
}

let marketSettings = {
  activeProviderId: 'dhan',
  providers: [
    { id: 'dhan', name: 'Dhan API', type: 'dhan' as const, clientId: process.env.VITE_DHAN_CLIENT_ID || '', accessToken: process.env.VITE_DHAN_ACCESS_TOKEN || process.env.DHAN_ACCESS_TOKEN || '' }
  ] as MarketProvider[]
};

let prevActiveProviderId = 'dhan';

const updateSettings = async () => {
  try {
    const marketDoc = await Setting.findOne({ id: 'market' });
    if (marketDoc) {
      const data = marketDoc.data;
      const dhapi = {
        id: 'dhan',
        name: 'Dhan API',
        type: 'dhan' as const,
        clientId: data.dhanClientId || process.env.VITE_DHAN_CLIENT_ID || process.env.DHAN_CLIENT_ID || '',
        accessToken: data.dhanAccessToken || process.env.VITE_DHAN_ACCESS_TOKEN || process.env.DHAN_ACCESS_TOKEN || ''
      };

      marketSettings = {
        activeProviderId: 'dhan',
        providers: [dhapi]
      };

      if (marketSettings.activeProviderId !== prevActiveProviderId) {
        console.log(`[Market Feed] Active provider changed from ${prevActiveProviderId} to ${marketSettings.activeProviderId}`);
        if (prevActiveProviderId === 'dhan') dhanManager.stop();
        if (!dhanManager.isConnectedStatus() && process.env.DISABLE_DHAN_WS !== 'true') {
          dhanManager.connect();
        }
        prevActiveProviderId = marketSettings.activeProviderId;
      } else {
        if (!dhanManager.isConnectedStatus() && process.env.DISABLE_DHAN_WS !== 'true') {
          dhanManager.connect();
        }
      }
    } else {
      console.log('[Market Feed] Settings document not found. Creating defaults...');
      const defaultSettings = {
        activeProviderId: 'dhan',
        providers: [
          { id: 'dhan', name: 'Dhan API', type: 'dhan' as const, clientId: '', accessToken: '' },        ]
      };
      await Setting.findOneAndUpdate({ id: 'market' }, { data: defaultSettings }, { upsert: true });
    }
  } catch (error) {
    console.error('[Market Feed] Failed to poll settings:', (error as Error).message);
  }
};

async function fetchMarketData(force = false) {
  if (isFetching) return;
  const now = Date.now();
  if (!force && connectedClients === 0) return;

  const isRealFetchTime = force || (now - lastFetchTime >= 3000);
  if (isRealFetchTime) console.log(`[Market Feed] Fetching data (force=${force}, clients=${connectedClients})...`);
  
  const symbols = ['Nifty 50', 'Bank Nifty', 'Fin Nifty', 'Midcap Nifty', 'RELIANCE'];
  const updates: Record<string, any> = {};
  
  try {
    let quotes: Record<string, { price: number; change: number; optionChain?: any[] }> | null = null;
    const activeProvider = marketSettings.providers.find(p => p.id === marketSettings.activeProviderId);
    
    if (isRealFetchTime) {
      lastFetchTime = now;
      isFetching = true;

    }

    const shouldFetchOptionChain = isRealFetchTime && (force || (now - lastOptionChainFetchTime > 60000));
    if (shouldFetchOptionChain) lastOptionChainFetchTime = now;

    for (const displayName of symbols) {
      let fetched = false;
      let price = marketData[displayName]?.price || 20000;
      let change = marketData[displayName]?.change || 0;
      let optionChain = marketData[displayName]?.optionChain || [];
      let expiry = marketData[displayName]?.expiry || getNextExpiry(displayName);

      if (isRealFetchTime && quotes && quotes[displayName]) {
        price = quotes[displayName].price;
        change = quotes[displayName].change;
        if (quotes[displayName].optionChain) optionChain = quotes[displayName].optionChain!;
        fetched = true;
      }

      if (isRealFetchTime && shouldFetchOptionChain && !quotes?.[displayName]?.optionChain) {
        // Allow disabling automatic Dhan option-chain fetches via env for development
        if (process.env.DISABLE_DHAN_AUTOFETCH === 'true') {
          console.log('[Market Feed] DISABLE_DHAN_AUTOFETCH=true, skipping automatic option-chain fetch');
        } else {
        const activeDhanProvider = marketSettings.providers.find(p => p.id === 'dhan');
        if (activeDhanProvider?.accessToken) {
          await dhanManager.fetchOptionChain(displayName, activeDhanProvider.accessToken);
          optionChain = marketData[displayName].optionChain;
          expiry = marketData[displayName].expiry;
          fetched = true;
        }
        }
      }

      const isDhan = activeProvider?.type === 'dhan';
      const isDhanConnected = dhanManager.isConnectedStatus();
      const isRealTimeProviderActive = isDhan && isDhanConnected;

      if (!fetched && isMarketOpen() && !isRealTimeProviderActive) {
        const tickDelta = (Math.random() - 0.5) * (price * 0.0002);
        price += tickDelta;
        change += tickDelta;
      }

      if (optionChain.length > 0 && isMarketOpen() && (!fetched && !isRealTimeProviderActive)) {
        const spotDelta = price - (marketData[displayName]?.price || price);
        optionChain = optionChain.map(opt => {
          const distance = opt.strike - price;
          const ce_delta = 1 / (1 + Math.exp(distance / (price * 0.01)));
          const pe_delta = ce_delta - 1;
          return {
            ...opt,
            ce_ltp: Number(Math.max(0.05, opt.ce_ltp + (spotDelta * ce_delta)).toFixed(2)),
            pe_ltp: Number(Math.max(0.05, opt.pe_ltp + (spotDelta * pe_delta)).toFixed(2)),
          };
        });
      }

      if (optionChain.length === 0) {
        const strikeStep = displayName.includes('Bank') ? 100 : (displayName.includes('Midcap') ? 25 : 50);
        optionChain = generateOptionChain(price, strikeStep, displayName);
      }

      // Determine the correct data source
      let currentDataSource = marketData[displayName]?.dataSource || 'Live';
      if (fetched) {
        currentDataSource = activeProvider?.name || 'API';
      } else if (isRealTimeProviderActive) {
        currentDataSource = 'Dhan';
      } else {
        currentDataSource = 'Simulated';
      }

      let expiries: string[] = [];
      if (activeProvider?.type === 'dhan') {
        expiries = dhanManager.getAvailableExpiries(displayName);
      }

      if (!expiries || expiries.length === 0) {
        const defaultExp = expiry || getNextExpiry(displayName);
        expiries = [defaultExp];
        try {
          const date = new Date(defaultExp);
          if (!isNaN(date.getTime())) {
            for (let i = 1; i < 4; i++) {
              const nextW = new Date(date);
              nextW.setDate(date.getDate() + i * 7);
              expiries.push(nextW.toISOString().split('T')[0]);
            }
          }
        } catch (e) {}
      }

      marketData[displayName] = {
        price, 
        change, 
        optionChain, 
        timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
        expiry, 
        expiries,
        isMarketOpen: isMarketOpen(), 
        dataSource: currentDataSource
      };
      updates[displayName] = marketData[displayName];
    }

    if (Object.keys(updates).length > 0) io.emit("marketUpdate", updates);
  } catch (error) {
    console.error(`[Market Feed] Critical Error:`, (error as Error).message);
    if (axios.isAxiosError(error)) {
      console.error('[Market Feed] Axios Error Details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
  } finally {
    if (isRealFetchTime) isFetching = false;
  }
}

// --- Routes & Socket ---
io.on("connection", (socket) => {
  connectedClients++;
  console.log(`[Socket] Client connected. Total: ${connectedClients}`);
  socket.emit('marketUpdate', marketData);
  
  socket.on("disconnect", (reason) => { 
    connectedClients--; 
    console.log(`[Socket] Client disconnected (${reason}). Total: ${connectedClients}`);
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.get("/api/market/quotes", async (req, res) => {
  const now = Date.now();
  // Log request for debugging
  // console.log(`[API] ${req.method} ${req.path} from ${req.ip}`);
  
    if (now - lastFetchTime > 5000 && !isFetching) {
    // Trigger update in background, don't await
    fetchMarketData(true).catch(err => console.error('[Market Feed] Background fetch error:', err));
  }
  // Strip huge option chain if not requested to save bandwidth
  const data = JSON.parse(JSON.stringify(marketData));
  if (req.query.minimal === 'true') {
     Object.keys(data).forEach(k => data[k].optionChain = []);
  }
  res.json(data);
});

app.get("/api/debug/market-status", (req, res) => {
  res.json({
    activeProviderId: marketSettings.activeProviderId,
    providers: marketSettings.providers.map(p => ({
      id: p.id,
      name: p.name,
      hasKey: !!p.clientId,
      hasSecret: !!p.accessToken,
      tokenLength: p.accessToken?.length || 0,
      tokenStart: p.accessToken ? p.accessToken.substring(0, 10) + '...' : null
    })),
    dhanConnected: dhanManager.isConnectedStatus(),
    env: {
      hasDhanClientId: !!process.env.VITE_DHAN_CLIENT_ID || !!process.env.DHAN_CLIENT_ID,
      hasDhanAccessToken: !!process.env.VITE_DHAN_ACCESS_TOKEN || !!process.env.DHAN_ACCESS_TOKEN
    }
  });
});

app.get("/api/market/status", (req, res) => {
  res.json({
    activeProvider: marketSettings.activeProviderId,
    dhan: {
      connected: dhanManager.isConnectedStatus()
    }
  });
});

app.get("/api/market/dhan/status", (req, res) => {
  res.json({
    isConfigured: !!(process.env.VITE_DHAN_CLIENT_ID && process.env.VITE_DHAN_ACCESS_TOKEN),
    wsConnected: dhanManager.isConnectedStatus(),
    activeProviderId: marketSettings.activeProviderId,
    message: marketSettings.activeProviderId === 'dhan' ? "Dhan is active on server" : "Dhan is inactive"
  });
});

// --- MongoDB API Routes ---
const requireDbConnection: express.RequestHandler = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  return res.status(503).json({
    error: "Database unavailable",
    message: "MongoDB is not connected yet. The UI is available, but this API needs the database.",
  });
};

app.use([
  "/api/users",
  "/api/auth",
  "/api/trades",
  "/api/challenges",
  "/api/rules",
  "/api/settings",
  "/api/transactions",
], requireDbConnection);

// Users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/api/users/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { uid, ...data } = req.body;
    const user = await User.findOneAndUpdate(
      { uid },
      { $set: data },
      { upsert: true, new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to upsert user" });
  }
});

// Auth Routes (Local Backend)
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, phoneNumber, mobile } = req.body;
    const finalPhone = phoneNumber || mobile;
    
    // Check if user exists by email or phone
    const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber: finalPhone || '___none___' }] });
    if (existingUser) return res.status(400).json({ error: "User already exists with this email or mobile number" });

    const newUser = new User({
      uid: uuidv4(),
      email,
      password, // In a real app, hash this!
      name,
      phoneNumber: finalPhone,
      balance: 100000, 
      initial_balance: 100000
    });

    await newUser.save();
    console.log('[Auth] New user registered:', email);
    res.json(newUser);
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: "Signup failed: " + (err instanceof Error ? err.message : String(err)) });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, mobile, phoneNumber } = req.body;
    const finalPhone = mobile || phoneNumber;

    // Build query to find user by email or phone
    let query: any = {};
    if (email) {
      query.email = email;
    } else if (finalPhone) {
      query.phoneNumber = finalPhone;
    } else {
      return res.status(400).json({ error: "Email or Mobile is required" });
    }

    // Find user by email or phone
    const user = await User.findOne(query);
    if (!user) {
      console.warn('[Auth] Login failed for:', email || finalPhone);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    if (!password || user.password !== password) {
      console.warn('[Auth] Login failed - invalid password for:', email || finalPhone);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    console.log('[Auth] User logged in:', user.email);
    res.json(user);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Login failed: " + (err instanceof Error ? err.message : String(err)) });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email, mobile } = req.body;
    const query: any = {};
    if (email) query.email = email;
    else if (mobile) query.phoneNumber = mobile;
    else return res.status(400).json({ error: "Identification required" });

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });

    // In this app, we'll just return the password for simplicity in this dev environment
    // In production, you'd send a reset link via email
    if (process.env.SMTP_USER && process.env.SMTP_PASS && user.email) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: "Password Recovery - Indo Trader",
        text: `Hello ${user.name},\n\nYour password for Indo Trader is: ${user.password}\n\nPlease keep it secure.`,
      });
      return res.json({ message: "Password sent to your email" });
    }

    // Fallback if SMTP not configured: just show it (for demo/development convenience)
    res.json({ 
      message: "Security Notice: In production, an email would be sent. For this demo, here is your password:",
      password: user.password 
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: "Password recovery failed" });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    
    // Check specific admin credentials from prompt
    if (mobile === "9691827337" && password === "888981") {
      let user = await User.findOne({ email: "admin@indotrader.com" });
      
      if (!user) {
        // Create the admin user if not exists
        user = new User({
          uid: uuidv4(),
          email: "admin@indotrader.com",
          password: password,
          name: "System Admin",
          role: "admin",
          balance: 10000000, // 1cr for admin
          initial_balance: 10000000,
          phoneNumber: mobile
        });
        await user.save();
      } else if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
      }
      
      return res.json(user);
    }
    
    res.status(401).json({ error: "Invalid admin credentials" });
  } catch (err) {
    res.status(500).json({ error: "Admin login failed" });
  }
});

// Trades
app.get("/api/trades", async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId: userId as string } : {};
    const trades = await Trade.find(filter).sort({ time: -1 });
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

app.post("/api/trades", async (req, res) => {
  try {
    const trade = new Trade(req.body);
    await trade.save();
    res.json(trade);
  } catch (err) {
    res.status(500).json({ error: "Failed to create trade" });
  }
});

app.put("/api/trades/:id", async (req, res) => {
  try {
    const trade = await Trade.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(trade);
  } catch (err) {
    res.status(500).json({ error: "Failed to update trade" });
  }
});

// Challenges
app.get("/api/challenges", async (req, res) => {
  try {
    const challenges = await Challenge.find();
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

app.post("/api/challenges", async (req, res) => {
  try {
    const challenge = await Challenge.findByIdAndUpdate(req.body._id || new mongoose.Types.ObjectId(), req.body, { upsert: true, new: true });
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: "Failed to upsert challenge" });
  }
});

app.delete("/api/challenges/:id", async (req, res) => {
  try {
    await Challenge.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete challenge" });
  }
});

// Rules
app.get("/api/rules", async (req, res) => {
  try {
    const rules = await Rule.find();
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch rules" });
  }
});

app.post("/api/rules", async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(req.body._id || new mongoose.Types.ObjectId(), req.body, { upsert: true, new: true });
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: "Failed to upsert rule" });
  }
});

app.delete("/api/rules/:id", async (req, res) => {
  try {
    await Rule.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

// Settings
app.get("/api/settings/:id", async (req, res) => {
  try {
    const setting = await Setting.findOne({ id: req.params.id });
    res.json(setting?.data || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/settings/:id", async (req, res) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { id: req.params.id },
      { $set: { data: req.body } },
      { upsert: true, new: true }
    );
    if (req.params.id === 'market') {
      console.log("[API] Setting update detected for market. Forcing instant sync...");
      await updateSettings();
    }
    res.json(setting.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId: userId as string } : {};
    const transactions = await Transaction.find(filter).sort({ time: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const transaction = new Transaction(req.body);
    await transaction.save();
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: "Failed to create transaction" });
  }
});



app.post("/api/market/dhan/connect", async (req, res) => {
  console.log('[API] Triggering Dhan connection...');
  dhanManager.connect();
  res.json({ status: "Dhan connection triggered on server" });
});

app.post("/api/market/dhan/reconnect", (req, res) => {
  console.log('[API] Triggering Dhan reconnection...');
  dhanManager.connect();
  res.json({ status: "Dhan reconnection triggered on server" });
});

app.post("/api/market/expiry", async (req, res) => {
  const { symbol, expiry } = req.body;
  if (!symbol || !expiry) {
    return res.status(400).json({ error: "Missing symbol or expiry parameter" });
  }

  try {
    if (marketData[symbol]) {
      console.log(`[API] Updating expiry for ${symbol} to ${expiry}`);
      marketData[symbol].expiry = expiry;
      
      const activeProvider = marketSettings.providers.find(p => p.id === marketSettings.activeProviderId);
      
      if (activeProvider?.type === 'dhan') {
        const activeDhanProvider = marketSettings.providers.find(p => p.id === 'dhan');
        if (activeDhanProvider?.accessToken) {
          dhanManager.clearCache(symbol);
          await dhanManager.fetchOptionChain(symbol, activeDhanProvider.accessToken);
        }
      }
      
      io.emit("marketUpdate", { [symbol]: marketData[symbol] });
      return res.json({ success: true, marketData: marketData[symbol] });
    } else {
      return res.status(404).json({ error: "Symbol not found" });
    }
  } catch (error: any) {
    console.error("[API] Failed to update expiry:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/market/history/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const { interval = '5m' } = req.query;

  try {
    // 1. Try active provider first
    const activeProvider = marketSettings.providers.find(p => p.id === marketSettings.activeProviderId);
    let candles = null;

    candles = await dhanManager.getHistory(symbol, interval as string);

    if (candles && candles.length > 0) {
      return res.json(candles);
    }

    throw new Error("No quotes found from provider");
  } catch (error) {
    // 2. Last fallback: Simulation
    const now = Date.now();
    const intervalMap: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '1D': '1d' };
    const yfInterval = intervalMap[interval as string] || '5m';
    const fallbackCandles = [];
    let lastPrice = marketData[symbol]?.price || 20000;
    const ms = { '1m': 60000, '5m': 300000, '15m': 900000, '1h': 3600000, '1d': 86400000 }[yfInterval] || 300000;
    for (let i = 0; i < 100; i++) {
      const time = new Date(now - (100 - i) * ms);
      const open = lastPrice;
      const close = lastPrice + (Math.random() - 0.5) * (lastPrice * 0.001);
      fallbackCandles.push({ time, open, high: Math.max(open, close) + 2, low: Math.min(open, close) - 2, close, volume: 1000 });
      lastPrice = close;
    }
    res.json(fallbackCandles);
  }
});

// Final API Handlers (Must be after all API routes)
// Explicitly handle 404 for /api routes to avoid falling through to SPA fallback
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found", path: req.originalUrl });
});

// Global error handler for /api routes to ensure they return JSON
app.use("/api", (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[API Error] ${req.method} ${req.path}:`, err);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
    path: req.path
  });
});

const PORT = Number(process.env.PORT) || 3000;

async function initializeDatabase() {
  try {
    await connectDB();

    try {
      Object.keys(marketData).forEach(symbol => { marketData[symbol].expiry = getNextExpiry(symbol); });
      await updateSettings();
      await fetchMarketData(true);
    } catch (err) {
      console.error('[Server] Initial data fetch failed:', err);
    }

    setInterval(updateSettings, 30000); // Check settings every 30s
    setInterval(() => {
      fetchMarketData().catch(err => console.error('[Server] Market data fetch interval error:', err));
    }, 5000); // Fetch every 5s instead of 1s to avoid rate limits
  } catch (error) {
    console.error('[Server] MongoDB unavailable:', (error as Error).message);
    console.error('[Server] UI will keep running; DB-backed API routes will return 503 until MongoDB is fixed.');
  }
}

async function startServer() {
  try {
    if (process.env.API_ONLY === "true") {
      console.log("[Server] API-only mode enabled; Vite frontend is running separately.");
    } else if (process.env.NODE_ENV !== "production") {
      console.log("🔵 [Vite] Initializing Vite dev server...");
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      console.log("🟢 [Vite] Vite dev server ready");
      // Ensure Vite doesn't handle /api requests
      app.use((req, res, next) => {
        if (req.url.startsWith('/api')) {
          console.log(`⏭️ [Vite] Skipping Vite for API: ${req.url}`);
          return next();
        }
        console.log(`🔄 [Vite] Handling request: ${req.url}`);
        vite.middlewares(req, res, next);
      });
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      // Only serve index.html for non-API routes
      app.get("*", (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: "API route not found" });
        }
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);

      // Start Dhan WebSocket connection for real-time market data feed
      try {
      
        {
          console.log("[Server] Dhan WebSocket disabled.");
        }
      } catch (wsError: any) {
        console.error("❌ [Server] Failed to initialize Dhan WebSocket:", wsError.message);
      }
    });

    initializeDatabase();
  } catch (error) {
    console.error('[Server] Failed to start server:', (error as Error).message);
    process.exit(1);
  }
}

startServer().catch(err => console.error('[Server] Initialization error:', err));

export default app;
