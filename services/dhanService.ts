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

  // Retry policy
  private readonly maxApiRetries = 3;
  private readonly baseRetryDelay = 1000; // ms

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
    console.log("[DhanService] Fetching fund details from Dhan API...");
    const url = `${this.baseUrl}/fundlimit`;
    return await this.requestWithRetry("get", url, undefined, {
      "access-token": token,
      "client-id": clientId,
      "Content-Type": "application/json",
    });
  }

  /**
   * Fetch Option Chain from Dhan API
   * Endpoint: POST /v2/optionchain
   */
  async getOptionChain(payload: { UnderlyingScrip: number; UnderlyingSeg: string; Expiry: string }) {
    const { token, clientId } = this.validateCredentials();
    console.log(`[DhanService] Fetching option chain for UnderlyingScrip: ${payload.UnderlyingScrip}, Expiry: ${payload.Expiry}...`);
    const url = `${this.baseUrl}/optionchain`;
    return await this.requestWithRetry("post", url, payload, {
      "access-token": token,
      "client-id": clientId,
      "Content-Type": "application/json",
    });
  }

  /**
   * Connect to Dhan Live Feed WebSocket
   */
  connectWebSocket() {
    const token = process.env.DHAN_ACCESS_TOKEN;
    const clientId = process.env.DHAN_CLIENT_ID;

    // Allow disabling WS during development to avoid rate-limits and repeated 400s
    if (process.env.DISABLE_DHAN_WS === 'true') {
      console.log('⚠️ [DhanService WS] DISABLE_DHAN_WS=true, skipping WebSocket connection');
      return;
    }

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

    // Construct connection URL and set auth headers for the initial handshake.
    // Some Dhan endpoints reject query-params in the WS handshake; prefer headers.
    const url = `${this.wsUrl}`;
    const wsHeaders: any = {
      "access-token": token,
      "client-id": clientId,
    };
    console.log(`[DhanService WS] Connecting to ${this.wsUrl} (ClientID: ${clientId.substring(0, 4)}***) using headers`);

    try {
      // Pass credentials as headers during websocket handshake to avoid 400 responses
      // Include common headers and origin to match browser handshake expectations
      const handshakeHeaders = Object.assign({}, wsHeaders, {
        Origin: "https://api.dhan.co",
        "User-Agent": "tradebulsw2/1.0 (Node)",
        // Provide multiple header variants in case the server expects a different casing/format
        "client_id": clientId,
        "clientid": clientId,
        "clientId": clientId,
        "Client-Id": clientId,
        "access_token": token,
        Authorization: `Bearer ${token}`,
        api_key: token,
      });

      // Some implementations require `api_key` and `client_id` as query params
      const urlWithQuery = `${url}/?api_key=${encodeURIComponent(token)}&client_id=${encodeURIComponent(clientId)}`;
      this.ws = new WebSocket(urlWithQuery, { headers: handshakeHeaders } as any);

      // Capture non-101 upgrade responses for diagnostics
      (this.ws as any).on && (this.ws as any).on("unexpected-response", (req: any, res: any) => {
        console.error(`❌ [DhanService WS] Unexpected upgrade response: ${res.statusCode} ${res.statusMessage}`);
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: any) => (body += chunk));
        res.on("end", () => {
          console.error("❌ [DhanService WS] Upgrade response body:", body);
        });
      });

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
    // Exponential backoff for reconnects
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 600000); // cap 10 minutes
    console.log(`🔄 [DhanService WS] Reconnect scheduled in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
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

  /**
   * Generic request helper with retry/backoff for transient Dhan API failures
   */
  private async requestWithRetry(method: string, url: string, data?: any, headers?: any) {
    let attempt = 0;
    while (attempt < this.maxApiRetries) {
      attempt++;
      try {
        console.debug(`[DhanService] [Attempt ${attempt}] ${method.toUpperCase()} ${url} payload=${data ? JSON.stringify(data) : "-"}`);
        const resp = await axios.request({
          method: method as any,
          url,
          data,
          headers,
          timeout: 10000,
        });

        // If API returns custom failed status, handle known transient codes
        if (resp.data && resp.data.status === "failed") {
          const codeMap = resp.data.data || {};
          const codes = Object.keys(codeMap);
          // Common transient codes: 805 (rate limit), 811 (invalid expiry) is not transient
          if (codes.includes("805") && attempt < this.maxApiRetries) {
            const delay = this.baseRetryDelay * attempt;
            console.warn(`[DhanService] Rate-limited (805). Retrying after ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          // For other failures, throw to be handled
          const err: any = new Error("Dhan API returned failed status");
          err.response = { status: 400, data: resp.data };
          throw err;
        }

        return resp.data;
      } catch (err: any) {
        // Decide whether to retry
        const isRetryableStatus = err?.response && (err.response.status === 429 || err.response.status >= 500);
        const isNetworkError = err?.code === 'ECONNABORTED' || err?.code === 'ECONNREFUSED' || err?.request;

        if ((isRetryableStatus || isNetworkError) && attempt < this.maxApiRetries) {
          const delay = this.baseRetryDelay * attempt;
          console.warn(`[DhanService] Request error (attempt ${attempt}): ${err.message}. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Exhausted retries or non-retryable error
        this.handleApiError(url, err);
      }
    }
    // If we somehow exit loop without returning or throwing, throw generic error
    const e: any = new Error("Dhan API request failed after retries");
    e.statusCode = 500;
    throw e;
  }
}

// Single instance for global reuse
export const dhanServiceInstance = new DhanService();
