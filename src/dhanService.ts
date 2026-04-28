"use client";   // ← Yeh line sabse upar hona chahiye!!

export class DhanService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  public onPriceUpdate: ((symbol: string, price: number) => void) | null = null;
  public onStatusChange: ((status: 'connected' | 'disconnected' | 'connecting' | 'error') => void) | null = null;

  private clientId = "";
  private accessToken = "";
  private statusInterval: any = null;

  private symbols = {
    'Nifty 50': '13',
    'Bank Nifty': '25',
    'Fin Nifty': '27',
    'Midcap Nifty': '31',
  };

  constructor() {
    // Handling both Vite and Render/Next.js environment variables
    this.clientId = import.meta.env.VITE_DHAN_CLIENT_ID || "";
    this.accessToken = import.meta.env.VITE_DHAN_ACCESS_TOKEN || "";
    
    console.log("DhanService initialized with Client ID:", this.clientId ? "Present" : "Missing");
  }

  isConfigured() {
    return !!this.clientId && !!this.accessToken;
  }

  connect() {
    // Client-side direct connection disabled to fix WebSocket errors in iframe.
    // Dhan is now handled server-side to bypass network restrictions and protect keys.
    console.log("ℹ️ Dhan connection is now handled server-side.");
    this.onStatusChange?.('connecting');
    
    // Check server status periodically
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/market/dhan/status');
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data.wsConnected) {
              this.isConnected = true;
              this.onStatusChange?.('connected');
            } else {
              this.isConnected = false;
              this.onStatusChange?.('disconnected');
            }
          } else {
            console.warn('[DhanService] Received non-JSON status response');
            this.onStatusChange?.('error');
          }
        } else {
          this.onStatusChange?.('error');
        }
      } catch (e) {
        this.onStatusChange?.('error');
      }
    };

    checkStatus();
    this.statusInterval = setInterval(checkStatus, 10000);
  }

  private sendAuthentication() {
    const authPacket = {
      RequestCode: 11,
      DhanClientId: this.clientId,
      AccessToken: this.accessToken
    };
    this.ws?.send(JSON.stringify(authPacket));
  }

  private subscribeToSymbols() {
    console.log("📡 Symbols subscribe kar raha hun...");
    
    // Dhan API Feed Subscription Packet (Binary)
    // For Ticker Data (LTP): RequestCode = 15
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
    console.log("Subscription bheji gayi (Nifty, BankNifty etc.)");
  }

  private handlePriceUpdate(data: any) {
    if (!(data instanceof ArrayBuffer)) return;
    
    const view = new DataView(data);
    try {
      const responseCode = view.getUint8(0);
      
      // Response Code 17 is Ticker Data (LTP)
      if (responseCode === 17 || responseCode === 2) {
        const securityId = view.getInt32(1, true).toString();
        const ltp = view.getFloat32(5, true);
        
        // Find display name from security ID
        const displayName = Object.keys(this.symbols).find(
          key => (this.symbols as any)[key] === securityId
        );

        if (displayName && this.onPriceUpdate) {
          this.onPriceUpdate(displayName, ltp);
        }
      }
    } catch (e) {
      // Silent fail for malformed packets
    }
  }

  disconnect() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional close
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.onStatusChange?.('disconnected');
  }
}

export const dhanService = new DhanService();
