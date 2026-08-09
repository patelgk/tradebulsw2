/**
 * DHAN Market Feed Diagnostic Test
 * Tests Dhan WebSocket connection and instrument subscriptions
 * Usage: npx tsx DHAN_DIAGNOSTIC_TEST.ts
 */

import dotenv from "dotenv";
dotenv.config();

import WebSocket from "ws";

const DHAN_CLIENT_ID = process.env.DHAN_CLIENT_ID || "";
const DHAN_ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "";
const WS_BASE = "wss://api-feed.dhan.co";

const RESPONSE_CODE = { QUOTE: 4, DISCONNECT: 50 };
const REQUEST_CODE = { SUBSCRIBE_QUOTE: 17 };

const INSTRUMENTS = [
  { ExchangeSegment: "IDX_I", SecurityId: "13", symbol: "Nifty 50" },
  { ExchangeSegment: "IDX_I", SecurityId: "25", symbol: "Bank Nifty" },
  { ExchangeSegment: "IDX_I", SecurityId: "27", symbol: "Fin Nifty" },
];

class DiagnosticTest {
  private ws: WebSocket | null = null;
  private receivedTicks = new Set<string>();
  private startTime = Date.now();

  async run() {
    console.log("\n🔍 DHAN DIAGNOSTIC TEST\n");
    console.log(`Connecting to ${WS_BASE}...`);

    await this.connect();
    await this.subscribe();
    await this.waitForTicks();
    this.report();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE}?version=2&token=${encodeURIComponent(DHAN_ACCESS_TOKEN)}&clientId=${encodeURIComponent(DHAN_CLIENT_ID)}&authType=2`;
      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        console.log("✅ Connected\n");
        resolve();
      });

      this.ws.on("message", (data) => this.handleMessage(data));
      this.ws.on("error", (err) => reject(err));
      this.ws.on("close", () => console.log("Connection closed"));
    });
  }

  private subscribe() {
    const packet = {
      RequestCode: REQUEST_CODE.SUBSCRIBE_QUOTE,
      InstrumentCount: INSTRUMENTS.length,
      InstrumentList: INSTRUMENTS.map((i) => ({
        ExchangeSegment: i.ExchangeSegment,
        SecurityId: i.SecurityId,
      })),
    };

    this.ws?.send(JSON.stringify(packet));
    console.log(`📡 Subscribed to ${INSTRUMENTS.length} instruments\n`);

    return new Promise((r) => setTimeout(r, 1000));
  }

  private handleMessage(data: Buffer | string) {
    if (typeof data === "string") return;
    if (data.length < 8) return;

    try {
      const responseCode = data[0];
      const securityId = data.readInt32LE(4).toString();

      if (responseCode === RESPONSE_CODE.QUOTE && data.length >= 50) {
        const ltp = data.readFloatLE(8).toFixed(2);
        const key = `${securityId}`;
        if (!this.receivedTicks.has(key)) {
          this.receivedTicks.add(key);
          const inst = INSTRUMENTS.find((i) => i.SecurityId === securityId);
          console.log(`  ✅ ${inst?.symbol || key}: LTP ₹${ltp}`);
        }
      } else if (responseCode === RESPONSE_CODE.DISCONNECT) {
        console.warn(`⚠️  Server disconnect`);
      }
    } catch (err) {
      // Silently ignore parse errors
    }
  }

  private async waitForTicks() {
    console.log("\n⏳ Waiting for live ticks...\n");
    await new Promise((r) => setTimeout(r, 15000));
  }

  private report() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n📊 RESULTS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Instruments Subscribed: ${INSTRUMENTS.length}`);
    console.log(`Ticks Received: ${this.receivedTicks.size}/${INSTRUMENTS.length}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Status: ${this.receivedTicks.size > 0 ? "✅ SUCCESS" : "⚠️  No ticks"}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    this.ws?.close();
  }
}

new DiagnosticTest().run().catch((err) => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
