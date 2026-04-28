import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import YahooFinance from 'yahoo-finance2';
import axios from 'axios';
import fs from 'fs';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';
import mongoose from 'mongoose';
import protobuf from "protobufjs";
import { v4 as uuidv4 } from 'uuid';
import { connectDB, Setting, User, Trade, Challenge, Rule, Transaction } from './db.js';

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

// Fix Yahoo Finance initialization for ESM
const yf = (YahooFinance as any).default || YahooFinance;

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
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const marketData: Record<string, { price: number, change: number, optionChain: any[], timestamp: string, expiry: string, isMarketOpen?: boolean, dataSource?: string }> = {
  'Nifty 50': { price: 22453.80, change: 102.45, optionChain: [], timestamp: '--:--:--', expiry: '2026-03-26', isMarketOpen: false, dataSource: 'Live' },
  'Bank Nifty': { price: 47500.00, change: 250.00, optionChain: [], timestamp: '--:--:--', expiry: '2026-03-26', isMarketOpen: false, dataSource: 'Live' },
  'Fin Nifty': { price: 21000.00, change: 50.00, optionChain: [], timestamp: '--:--:--', expiry: '2026-03-26', isMarketOpen: false, dataSource: 'Live' },
  'Midcap Nifty': { price: 10500.00, change: 30.00, optionChain: [], timestamp: '--:--:--', expiry: '2026-03-26', isMarketOpen: false, dataSource: 'Live' },
};

const SYMBOL_MAP: Record<string, string> = {
  'Nifty 50': '^NSEI',
  'Bank Nifty': '^NSEBANK',
  'Fin Nifty': 'NIFTY_FIN_SERVICE.NS',
  'Midcap Nifty': '^NSEMDCP50',
};

const DHAN_SYMBOLS: Record<string, string> = {
  '13': 'Nifty 50',
  '25': 'Bank Nifty',
  '27': 'Fin Nifty',
  '31': 'Midcap Nifty',
};

// --- Dhan Server Service ---
class DhanServerManager {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {}

  isConnectedStatus() {
    return this.isConnected;
  }

  connect() {
    const activeProvider = marketSettings.providers.find(p => p.id === 'dhan');
    const clientId = activeProvider?.clientId || process.env.VITE_DHAN_CLIENT_ID || "";
    const accessToken = activeProvider?.accessToken || process.env.VITE_DHAN_ACCESS_TOKEN || "";

    if (!clientId || !accessToken) {
      console.log('[Dhan Server] Missing credentials (ClientId or AccessToken), skipping connection.');
      return;
    }

    if (this.ws) {
      this.ws.terminate();
    }

    console.log(`[Dhan Server] Connecting to Dhan WebSocket... (ClientId: ${clientId.substring(0, 4)}***, Token: ${accessToken.substring(0, 4)}***)`);
    const url = `wss://api-feed.dhan.co/?api_key=${accessToken}&client_id=${clientId}`;
    
    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('✅ [Dhan Server] WebSocket Connected!');
        this.sendAuthentication(clientId, accessToken);
      });

      this.ws.on('message', (data: any) => {
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
        this.reconnectTimeout = setTimeout(() => this.connect(), 10000);
      });
    } catch (err) {
      console.error('[Dhan Server] Connection failed:', (err as Error).message);
    }
  }

  private sendAuthentication(clientId: string, accessToken: string) {
    const authPacket = {
      RequestCode: 11,
      DhanClientId: clientId,
      AccessToken: accessToken
    };
    this.ws?.send(JSON.stringify(authPacket));
  }

  private subscribeToSymbols() {
    const symbolsToSubscribe = [
      { ExchangeSegment: 1, SecurityId: '13' }, // Nifty 50
      { ExchangeSegment: 1, SecurityId: '25' }, // Bank Nifty
      { ExchangeSegment: 1, SecurityId: '27' }, // Fin Nifty
      { ExchangeSegment: 1, SecurityId: '31' }, // Midcap Nifty
    ];

    const subscribePacket = {
      RequestCode: 15, // 15 for Ticker
      InstrumentList: symbolsToSubscribe
    };

    this.ws?.send(JSON.stringify(subscribePacket));
    console.log("[Dhan Server] Subscribed to indices.");
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
          marketData[displayName].price = ltp;
          marketData[displayName].dataSource = 'Dhan';
          marketData[displayName].timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
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

// --- Upstox Server Service ---
class UpstoxServerManager {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private protoRoot: protobuf.Root | null = null;
  private FeedResponse: any = null;

  constructor() {
    this.initProto();
  }

  async initProto() {
    try {
      const protoPath = path.join(process.cwd(), 'node_modules/upstox-js-sdk/src/feeder/proto/MarketDataFeedV3.proto');
      this.protoRoot = await protobuf.load(protoPath);
      this.FeedResponse = this.protoRoot.lookupType("com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse");
      console.log('✅ [Upstox Server] Protobuf initialized');
    } catch (err) {
      console.error('❌ [Upstox Server] Protobuf init failed:', err);
    }
  }

  isConnectedStatus() {
    return this.isConnected;
  }

  async connect() {
    try {
      const marketDoc = await Setting.findOne({ id: 'market' });
      const activeProvider = marketDoc?.data?.providers?.find((p: any) => p.id === 'upstox');
      const accessToken = activeProvider?.accessToken || process.env.UPSTOX_ACCESS_TOKEN;

      if (!accessToken) {
        console.log('[Upstox Server] No access token found, skipping connection.');
        return;
      }

      if (this.ws) {
        this.ws.terminate();
      }

      // 1. Authorize to get the WebSocket URL
      console.log('[Upstox Server] Authorizing to get WebSocket URL...');
      const authRes = await axios.get('https://api.upstox.com/v2/feed/market-data-feed/authorize', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      const wsUrl = authRes.data.data.authorizedRedirectUri;
      console.log('[Upstox Server] Connecting to Upstox WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('✅ [Upstox Server] WebSocket Connected!');
        this.isConnected = true;
        this.subscribe();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data);
      });

      this.ws.on('error', (error) => {
        console.error("❌ [Upstox Server] WebSocket Error:", error.message);
      });

      this.ws.on('close', () => {
        console.log("🔴 [Upstox Server] WebSocket Closed. Reconnecting in 10s...");
        this.isConnected = false;
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(), 10000);
      });
    } catch (err: any) {
      console.error('[Upstox Server] Connection failed:', err.response?.data || err.message);
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => this.connect(), 30000); 
    }
  }

  private subscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const symbols = [
      'NSE_INDEX|Nifty 50',
      'NSE_INDEX|Nifty Bank',
      'NSE_INDEX|FINNIFTY',
      'NSE_INDEX|Nifty Midcap 100'
    ];

    const data = {
      guid: "guid",
      method: "sub",
      data: {
        mode: "ltpc",
        instrumentKeys: symbols
      }
    };

    this.ws.send(JSON.stringify(data));
    console.log("[Upstox Server] Sent subscription for instruments");
  }

  private handleMessage(data: Buffer) {
    if (!this.FeedResponse) return;

    try {
      const message = this.FeedResponse.decode(data);
      const feeds = message.feeds;

      const nameMap: Record<string, string> = {
        'NSE_INDEX|Nifty 50': 'Nifty 50',
        'NSE_INDEX|Nifty Bank': 'Bank Nifty',
        'NSE_INDEX|FINNIFTY': 'Fin Nifty',
        'NSE_INDEX|Nifty Midcap 100': 'Midcap Nifty',
        'NSE_INDEX|NIFTY MIDCAP 100': 'Midcap Nifty'
      };

      for (const [key, feed] of Object.entries(feeds)) {
        const displayName = nameMap[key];
        if (displayName && marketData[displayName]) {
          const ltpData = (feed as any).ltpc || ((feed as any).fullFeed?.indexFF?.ltpc);
          if (ltpData && ltpData.ltp) {
            marketData[displayName].price = ltpData.ltp;
            marketData[displayName].change = ltpData.ltp - (ltpData.cp || marketData[displayName].price);
            marketData[displayName].dataSource = 'Upstox';
            marketData[displayName].timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
            
            // Emit immediate update via socket for real-time feel
            io.emit("marketUpdate", { [displayName]: marketData[displayName] });
          }
        }
      }
    } catch (e) {
      try {
        const text = data.toString();
        if (text.startsWith('{')) {
          // console.log('[Upstox Server] JSON message:', text);
        }
      } catch (err) {}
    }
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

const upstoxManager = new UpstoxServerManager();
const dhanManager = new DhanServerManager();

let lastFetchTime = 0;
let lastOptionChainFetchTime = 0;
let isFetching = false;
let connectedClients = 0;

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

// --- NSE Session Management ---
let nseCookies = '';
let lastCookieFetch = 0;

const getNSECookies = async (retries = 3) => {
  const now = Date.now();
  if (nseCookies && now - lastCookieFetch < 600000) return nseCookies;

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  ];

  const headers = {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get('https://www.nseindia.com', { headers, timeout: 10000 });
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        nseCookies = cookies.map(c => c.split(';')[0]).join('; ');
        lastCookieFetch = now;
        return nseCookies;
      }
    } catch (err) {
      if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 3000 * (i + 1)));
    }
  }
  return nseCookies;
};

const fetchNSEOptionChain = async (symbol: string) => {
  const nseSymbol = symbol === 'Nifty 50' ? 'NIFTY' : 
                    symbol === 'Bank Nifty' ? 'BANKNIFTY' : 
                    symbol === 'Fin Nifty' ? 'FINNIFTY' : 
                    symbol === 'Midcap Nifty' ? 'MIDCPNIFTY' : 'NIFTY';
  
  const cookies = await getNSECookies();
  if (!cookies) return null;
  
  try {
    const response = await axios.get(`https://www.nseindia.com/api/option-chain-indices?symbol=${nseSymbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Cookie': cookies,
        'Referer': 'https://www.nseindia.com/option-chain',
      },
      timeout: 10000
    });

    if (response.data && response.data.records && response.data.filtered && Array.isArray(response.data.filtered.data)) {
      const data = response.data;
      const price = data.records.underlyingValue || 0;
      const expiry = data.records.expiryDates ? data.records.expiryDates[0] : '';
      const optionChain = data.filtered.data.map((item: any) => ({
        strike: item.strikePrice || 0,
        ce_ltp: item.CE?.lastPrice || 0,
        ce_oi: item.CE?.openInterest || 0,
        ce_oi_change: item.CE?.changeinOpenInterest || 0,
        pe_ltp: item.PE?.lastPrice || 0,
        pe_oi: item.PE?.openInterest || 0,
        pe_oi_change: item.PE?.changeinOpenInterest || 0,
      })).sort((a: any, b: any) => a.strike - b.strike);

      return { price, expiry, optionChain };
    }
  } catch (err) {
    if ((err as any).response?.status === 401 || (err as any).response?.status === 403) {
      nseCookies = '';
      lastCookieFetch = 0;
    }
  }
  return null;
};

// --- Market API State ---
interface MarketProvider {
  id: string;
  name: string;
  type: 'yahoo' | 'dhan' | 'upstox' | 'custom';
  clientId?: string;
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  url?: string;
  headers?: Record<string, string>;
}

let marketSettings = {
  activeProviderId: 'yahoo',
  providers: [
    { id: 'yahoo', name: 'Yahoo Finance', type: 'yahoo' as const },
    { id: 'dhan', name: 'Dhan API', type: 'dhan' as const, clientId: '', accessToken: '' },
    { id: 'upstox', name: 'Upstox API', type: 'upstox' as const, apiKey: '', apiSecret: '' }
  ] as MarketProvider[]
};

let prevActiveProviderId = 'yahoo';

const updateSettings = async () => {
  try {
    const marketDoc = await Setting.findOne({ id: 'market' });
    if (marketDoc) {
      const data = marketDoc.data;
      if (data.marketApiProvider && !data.activeProviderId) {
        marketSettings = {
          activeProviderId: data.marketApiProvider,
          providers: [
            { id: 'yahoo', name: 'Yahoo Finance', type: 'yahoo' },
            { id: 'dhan', name: 'Dhan API', type: 'dhan', clientId: data.dhanClientId || '', accessToken: data.dhanAccessToken || '' }
          ]
        };
      } else {
        marketSettings = data;
      }

      // Automatically manage Dhan & Upstox connection based on settings
      if (marketSettings.activeProviderId !== prevActiveProviderId) {
        console.log(`[Market Feed] Active provider changed from ${prevActiveProviderId} to ${marketSettings.activeProviderId}`);
        
        // Stop previous
        if (prevActiveProviderId === 'dhan') dhanManager.stop();
        if (prevActiveProviderId === 'upstox') upstoxManager.stop();

        // Start new
        if (marketSettings.activeProviderId === 'dhan') dhanManager.connect();
        if (marketSettings.activeProviderId === 'upstox') upstoxManager.connect();
        
        prevActiveProviderId = marketSettings.activeProviderId;
      }
    } else {
      console.log('[Market Feed] Settings document not found. Creating defaults...');
      const defaultSettings = {
        activeProviderId: 'yahoo',
        providers: [
          { id: 'yahoo', name: 'Yahoo Finance', type: 'yahoo' as const },
          { id: 'dhan', name: 'Dhan API', type: 'dhan' as const, clientId: '', accessToken: '' },
          { id: 'upstox', name: 'Upstox API', type: 'upstox' as const, apiKey: '', apiSecret: '' }
        ]
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
  
  const symbols = ['Nifty 50', 'Bank Nifty', 'Fin Nifty', 'Midcap Nifty'];
  const updates: Record<string, any> = {};
  
  try {
    let quotes: Record<string, { price: number; change: number; optionChain?: any[] }> | null = null;
    const activeProvider = marketSettings.providers.find(p => p.id === marketSettings.activeProviderId);
    
    if (isRealFetchTime) {
      lastFetchTime = now;
      isFetching = true;

      if (activeProvider) {
        if (activeProvider.type === 'yahoo') {
          try {
            const symbolsToFetch = symbols.map(s => SYMBOL_MAP[s]);
            const results = await yf.quote(symbolsToFetch);
            
            if (results && Array.isArray(results)) {
              quotes = {};
              results.forEach((result: any) => {
                // Find the original display name from the yahoo symbol
                const displayName = Object.keys(SYMBOL_MAP).find(key => SYMBOL_MAP[key] === result.symbol);
                if (displayName) {
                  quotes![displayName] = {
                    price: result.regularMarketPrice || 0,
                    change: result.regularMarketChange || 0
                  };
                }
              });
            } else if (results && typeof results === 'object') {
              // Handle single result if only one symbol was passed or returned
              const result = results as any;
              const displayName = Object.keys(SYMBOL_MAP).find(key => SYMBOL_MAP[key] === result.symbol);
              if (displayName) {
                quotes = {
                  [displayName]: {
                    price: result.regularMarketPrice || 0,
                    change: result.regularMarketChange || 0
                  }
                };
              }
            }
          } catch (err) {
            console.error('[Market Feed] Yahoo Finance fetch error:', (err as Error).message);
          }
        }
      }
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
        if (activeProvider?.type === 'yahoo') {
          const nseChain = await fetchNSEOptionChain(displayName);
          if (nseChain) {
            optionChain = nseChain.optionChain;
            expiry = nseChain.expiry;
            if (nseChain.price) { price = nseChain.price; fetched = true; }
          }
        }
      }

      if (!fetched && isMarketOpen()) {
        const tickDelta = (Math.random() - 0.5) * (price * 0.0002);
        price += tickDelta;
        change += tickDelta;
      }

      if (optionChain.length > 0 && isMarketOpen() && (!activeProvider || activeProvider.type === 'yahoo' || !fetched)) {
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

      marketData[displayName] = {
        price, change, optionChain, timestamp: new Date().toLocaleTimeString('en-IN', { hour12: false }),
        expiry, isMarketOpen: isMarketOpen(), dataSource: fetched ? (activeProvider?.name || 'API') : 'Live'
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
  res.json(marketData);
});

app.get("/api/market/status", (req, res) => {
  res.json({
    activeProvider: marketSettings.activeProviderId,
    dhan: {
      connected: dhanManager.isConnectedStatus()
    },
    upstox: {
      connected: upstoxManager.isConnectedStatus()
    }
  });
});

app.post("/api/market/upstox/connect", async (req, res) => {
  console.log('[API] Triggering Upstox connection...');
  upstoxManager.connect();
  res.json({ status: "Upstox connection triggered on server" });
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
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const newUser = new User({
      uid: uuidv4(),
      email,
      password, // In a real app, hash this!
      name,
      balance: 100000, // Default signup bonus
      initial_balance: 100000
    });

    await newUser.save();
    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  try {
    const { mobile, password } = req.body;
    
    // Check specific admin credentials from prompt
    if (mobile === "999999999" && password === "888981") {
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

// --- Upstox OAuth Routes ---
app.get("/api/market/upstox/auth-url", (req, res) => {
  const apiKey = process.env.UPSTOX_API_KEY;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/market/upstox/callback`;
  
  if (!apiKey) {
    return res.status(400).json({ error: "UPSTOX_API_KEY not configured" });
  }

  const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.json({ url: authUrl });
});

app.get("/api/market/upstox/callback", async (req, res) => {
  const { code } = req.query;
  const apiKey = process.env.UPSTOX_API_KEY;
  const apiSecret = process.env.UPSTOX_API_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/market/upstox/callback`;

  if (!code || !apiKey || !apiSecret) {
    return res.status(400).send("Missing code or Upstox configuration");
  }

  try {
    const response = await axios.post('https://api.upstox.com/v2/login/authorization/token', 
      new URLSearchParams({
        code: code as string,
        client_id: apiKey,
        client_secret: apiSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    const { access_token } = response.data;
    
    // Update settings in MongoDB
    await Setting.findOneAndUpdate(
      { id: 'market' },
      { 
        $set: { 
          'data.activeProviderId': 'upstox',
          'data.providers.$[elem].accessToken': access_token 
        } 
      },
      { 
        arrayFilters: [{ 'elem.id': 'upstox' }],
        new: true 
      }
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <head><title>Upstox Auth Success</title></head>
        <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0f2f5;">
          <div style="background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
            <h1 style="color: #2e7d32;">Authentication Successful!</h1>
            <p>Upstox has been connected. You can close this window now.</p>
            <button onclick="window.close()" style="background: #1976d2; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 16px;">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'UPSTOX_AUTH_SUCCESS' }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('[Upstox Auth] Error:', error.response?.data || error.message);
    res.status(500).send("Authentication failed: " + (error.response?.data?.errors?.[0]?.message || error.message));
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

app.get("/api/market/history/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const { interval = '5m' } = req.query;
  const yahooSymbol = SYMBOL_MAP[symbol] || symbol;
  const intervalMap: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '1D': '1d' };
  const yfInterval = intervalMap[interval as string] || '5m';
  
  let period1: Date;
  const now = Date.now();
  switch(yfInterval) {
    case '1m': period1 = new Date(now - 4 * 60 * 60 * 1000); break;
    case '5m': period1 = new Date(now - 24 * 60 * 60 * 1000); break;
    case '15m': period1 = new Date(now - 3 * 24 * 60 * 60 * 1000); break;
    case '1h': period1 = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    case '1d': period1 = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
    default: period1 = new Date(now - 24 * 60 * 60 * 1000);
  }

  try {
    const result = await yf.chart(yahooSymbol, { period1, interval: yfInterval as any });
    if (result && result.quotes && result.quotes.length > 0) {
      res.json(result.quotes.map((q: any) => ({ time: q.date, open: q.open, high: q.high, low: q.low, close: q.close, volume: q.volume })).filter((c: any) => c.open != null));
    } else { throw new Error("No quotes found"); }
  } catch (error) {
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
app.use("/api", (req, res, next) => {
  if (req.path === '/health' || req.path === '/market/quotes' || req.path.startsWith('/market/')) {
    return next();
  }
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

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      // Ensure Vite doesn't handle /api requests
      app.use((req, res, next) => {
        if (req.url.startsWith('/api')) return next();
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
    });

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
    console.error('[Server] Failed to start server:', (error as Error).message);
  }
}

startServer().catch(err => console.error('[Server] Initialization error:', err));

export default app;
