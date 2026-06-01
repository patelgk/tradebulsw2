import axios from "axios";
import WebSocket from "ws";
import * as dotenv from "dotenv";

dotenv.config();

export class DhanService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private reconnectInterval = 5000; // 5 seconds
  private maxReconnectAttempts = 10;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Dhan API Endpoints
  private readonly baseUrl = "https://api.dhan.co/v2";
  private readonly wsUrl = "wss://api-feed.dhan.co";

  constructor() {
    // Get credentials from environment variables
    const token = process.env.DHAN_ACCESS_TOKEN;
    const clientId = process.env.DHAN_CLIENT_ID;

    if (!token || !clientId) {
      console.warn("⚠️ [DhanService] DHAN_ACCESS_TOKEN or DHAN_CLIENT_ID environment variable is missing.");
    }
  }

  /**
   * Helper to validate if credentials exist
   */
  private validateCredentials() {
    const token = process.env.DHAN_ACCESS_TOKEN;
    const clientId = process.env.DHAN_CLIENT_ID;

    if (!token || !clientId) {
      const error: any = new Error("Invalid or missing Dhan API credentials (DHAN_ACCESS_TOKEN, DHAN_CLIENT_ID)");
      error.statusCode = 401;
      throw error;
    }
    return { token, clientId };
  }

  /**
   * Fetch Funds Details from Dhan API
   * Endpoint: GET /v2/fundlimit
   */
  async getFunds() {
    const { token, clientId } = this.validateCredentials();

    try {
      console.log("[DhanService] Fetching fund details from Dhan API...");
      const response = await axios.get(`${this.baseUrl}/fundlimit`, {
        headers: {
          "access-token": token,
          "client-id": clientId,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10s timeout
      });

      return response.data;
    } catch (error: any) {
      this.handleApiError("getFunds", error);
    }
  }

  /**
   * Fetch Option Chain from Dhan API
   * Endpoint: POST /v2/optionchain
   */
  async getOptionChain(payload: { UnderlyingScrip: number; UnderlyingSeg: string; Expiry: string }) {
    const { token, clientId } = this.validateCredentials();

    try {
      console.log(`[DhanService] Fetching option chain for UnderlyingScrip: ${payload.UnderlyingScrip}, Expiry: ${payload.Expiry}...`);
      const response = await axios.post(`${this.baseUrl}/optionchain`, payload, {
        headers: {
          "access-token": token,
          "client-id": clientId,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      this.handleApiError("getOptionChain", error);
    }
  }

  /**
   * Connect to Dhan Live Feed WebSocket
   */
  connectWebSocket() {
    const token = process.env.DHAN_ACCESS_TOKEN;
    const clientId = process.env.DHAN_CLIENT_ID;

    // Check credentials before connecting
    if (!token || !clientId) {
      console.error("❌ [DhanService WS] Cannot connect: DHAN_ACCESS_TOKEN or DHAN_CLIENT_ID is missing.");
      return;
    }

    if (this.ws) {
      console.log("[DhanService WS] Terminating existing connection...");
      this.ws.terminate();
      this.ws = null;
    }

    // Construct connection URL with credentials (standard query parametrization)
    const url = `${this.wsUrl}/?api_key=${encodeURIComponent(token)}&client_id=${encodeURIComponent(clientId)}`;
    console.log(`[DhanService WS] Connecting to ${this.wsUrl} (ClientID: ${clientId.substring(0, 4)}***)`);

    try {
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        console.log("✅ [DhanService WS] Connection established successfully!");
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // 1. Send Authentication packet (RequestCode: 11)
        this.sendAuthentication(clientId, token);

        // 2. Subscribe to Nifty 50 live data (Requirement 7)
        this.subscribeToNifty();
      });

      this.ws.on("message", (data: any) => {
        this.handleMessage(data);
      });

      this.ws.on("error", (error: any) => {
        console.error("❌ [DhanService WS] Error detected:", error.message || error);
      });

      this.ws.on("close", (code, reason) => {
        this.isConnected = false;
        console.warn(`🔴 [DhanService WS] Closed (Code: ${code}, Reason: ${reason || "No reason given"}).`);
        this.scheduleReconnect();
      });
    } catch (err: any) {
      console.error("[DhanService WS] Connection initiation failed:", err.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Send standard authentication packet
   */
  private sendAuthentication(clientId: string, token: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const authPacket = {
      RequestCode: 11,
      DhanClientId: clientId,
      AccessToken: token,
    };

    console.log("[DhanService WS] Sending authentication packet...");
    this.ws.send(JSON.stringify(authPacket));
  }

  /**
   * Subscribe to Nifty 50 live data (SecurityId '13', ExchangeSegment 1 or 2 as fallback)
   */
  private subscribeToNifty() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    console.log("[DhanService WS] Subscribing to Nifty 50 live quotes...");

    // Standard Dhan indices subscription:
    // Nifty 50 has SecurityId: '13', ExchangeSegment: 1 (NSE_EQ) or 2 (NSE_IDX)
    const subscribePacket = {
      RequestCode: 15, // 15 represents Live LTP / Ticker
      InstrumentList: [
        { ExchangeSegment: 1, SecurityId: "13" }, // Nifty 50 Subscription
      ],
    };

    this.ws.send(JSON.stringify(subscribePacket));
    console.log("📡 [DhanService WS] Nifty 50 subscription packet transmitted successfully.");
  }

  /**
   * Handle incoming WebSocket messages and buffers
   */
  private handleMessage(data: any) {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      
      // If it is JSON format (connection notifications, auth status, etc.)
      const textMessage = buffer.toString().trim();
      if (textMessage.startsWith("{")) {
        const parsed = JSON.parse(textMessage);
        
        // Log subscription status/authentication responses
        if (parsed.RequestCode === 11) {
          console.log(`🔑 [DhanService WS] Auth response received. Status: ${parsed.Status || "N/A"}, Message: ${parsed.Message || ""}`);
        } else {
          console.log(`📥 [DhanService WS] Received JSON message:`, parsed);
        }
        return;
      }

      // Handle binary Ticker feed data
      if (buffer.length >= 9) {
        const responseCode = buffer.readUint8(0);
        
        // Response Code 17 (Ticker Feed / LTP) or Response Code 2
        if (responseCode === 17 || responseCode === 2) {
          const securityId = buffer.readInt32LE(1).toString();
          const ltp = buffer.readFloatLE(5);

          if (securityId === "13") {
            console.log(`📈 [DhanService WS] Nifty 50 (SecurityID: 13) Real-time Price Update: ₹${ltp.toFixed(2)} [Time: ${new Date().toLocaleTimeString()}]`);
          } else {
            console.log(`📊 [DhanService WS] Live Quote - Security: ${securityId}, Price: ₹${ltp.toFixed(2)}`);
          }
        }
      }
    } catch (e: any) {
      // Catch silently to keep Websocket client running robustly
      console.debug("[DhanService WS] Error processing stream frame:", e.message);
    }
  }

  /**
   * Schedule WebSocket auto-reconnection
   */
  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [DhanService WS] Max reconnect attempts (${this.maxReconnectAttempts}) reached. Auto-reconnection aborted.`);
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 [DhanService WS] Reconnect scheduled in ${this.reconnectInterval / 1000}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, this.reconnectInterval);
  }

  /**
   * Disconnect WebSocket intentionally
   */
  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      console.log("[DhanService WS] Gracefully shutting down WebSocket...");
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Common API Error Handler
   */
  private handleApiError(method: string, error: any) {
    console.error(`❌ [DhanService] Error in ${method}:`, error.message);

    const apiError: any = new Error();
    apiError.statusCode = 500;

    if (error.response) {
      // Server responded with non-2xx status
      const status = error.response.status;
      const responseData = error.response.data;

      console.error(`  ↳ Dhan API Response Error Status: ${status}`, JSON.stringify(responseData));

      apiError.statusCode = status;
      apiError.message = `Dhan API request failed: ${responseData?.remark || responseData?.message || error.message}`;
    } else if (error.request) {
      // Request made but no response
      console.error("  ↳ No response received from Dhan API Server. Network/CORS Error.");
      apiError.statusCode = 503;
      apiError.message = "Dhan API Server is unreachable. Please check your network connection.";
    } else {
      // Error in setup
      apiError.statusCode = error.statusCode || 500;
      apiError.message = error.message;
    }

    throw apiError;
  }
}

// Single instance for global reuse
export const dhanServiceInstance = new DhanService();
