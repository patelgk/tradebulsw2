/**
 * DHAN DIAGNOSTIC TEST ROUTES
 * 
 * Admin-only endpoints for testing Dhan market feed
 * - Completely isolated from production trading
 * - No data stored to MongoDB
 * - No Socket.IO broadcasting
 * - No modifications to existing systems
 * 
 * Access: POST /api/admin/dhan/diagnostic/test (admin only)
 */

import { Router } from "express";
import WebSocket from "ws";

const router = Router();

// Admin middleware - verify admin access
const requireAdmin = (req: any, res: any, next: any) => {
  const adminEmail = "kushwahgourav2018@gmail.com";
  if (req.body?.adminEmail !== adminEmail && req.query?.adminEmail !== adminEmail) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// ──────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC TEST STATE (In-memory only, not persistent)
// ──────────────────────────────────────────────────────────────────────────────

interface DiagnosticSession {
  id: string;
  status: "idle" | "running" | "completed" | "error";
  startTime: number;
  endTime?: number;
  results?: any;
  error?: string;
  progress: {
    connected: boolean;
    subscribed: number;
    receivingTicks: number;
    errors: number;
  };
}

const sessions = new Map<string, DiagnosticSession>();

// ──────────────────────────────────────────────────────────────────────────────
// MINI DIAGNOSTIC ENGINE (Embedded version for API endpoint)
// ──────────────────────────────────────────────────────────────────────────────

async function runDiagnosticTest(sessionId: string): Promise<DiagnosticSession> {
  const session = sessions.get(sessionId)!;
  const DHAN_CLIENT_ID = process.env.DHAN_CLIENT_ID || "";
  const DHAN_ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || "";
  const WS_BASE = "wss://api-feed.dhan.co";

  const RESPONSE_CODE = {
    QUOTE: 4,
    OI: 5,
    DISCONNECT: 50,
  };

  const REQUEST_CODE = {
    SUBSCRIBE_QUOTE: 17,
  };

  const INSTRUMENT_MASTER = [
    { ExchangeSegment: "IDX_I", SecurityId: "13", symbol: "Nifty 50" },
    { ExchangeSegment: "IDX_I", SecurityId: "25", symbol: "Bank Nifty" },
    { ExchangeSegment: "IDX_I", SecurityId: "27", symbol: "Fin Nifty" },
    { ExchangeSegment: "IDX_I", SecurityId: "442", symbol: "Midcap Select" },
    { ExchangeSegment: "NSE_FNO", SecurityId: "40993", symbol: "NIFTY50AUG11C24050" },
    { ExchangeSegment: "NSE_FNO", SecurityId: "40994", symbol: "NIFTY50AUG11P24050" },
  ];

  return new Promise((resolve) => {
    try {
      const url = `${WS_BASE}?version=2&token=${encodeURIComponent(DHAN_ACCESS_TOKEN)}&clientId=${encodeURIComponent(DHAN_CLIENT_ID)}&authType=2`;
      const ws = new WebSocket(url);
      const results = {
        instrumentsLoaded: INSTRUMENT_MASTER.length,
        instrumentsSubscribed: 0,
        instrumentsReceivingTicks: new Set<string>(),
        ticks: [] as any[],
        errors: [] as string[],
        segments: new Map<string, { total: number; ticks: number }>(),
      };
      const ticksPerInstrument = new Map<string, number>();
      let testTimer: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(testTimer);
        ws.close();
      };

      ws.on("open", () => {
        session.progress.connected = true;

        // Subscribe to test instruments
        const packet = {
          RequestCode: REQUEST_CODE.SUBSCRIBE_QUOTE,
          InstrumentCount: INSTRUMENT_MASTER.length,
          InstrumentList: INSTRUMENT_MASTER.map((inst) => ({
            ExchangeSegment: inst.ExchangeSegment,
            SecurityId: inst.SecurityId,
          })),
        };

        ws.send(JSON.stringify(packet), (err) => {
          if (!err) {
            session.progress.subscribed = INSTRUMENT_MASTER.length;
            results.instrumentsSubscribed = INSTRUMENT_MASTER.length;
          }
        });

        // Wait 15 seconds for ticks
        testTimer = setTimeout(() => {
          cleanup();
          finishTest();
        }, 15000);
      });

      ws.on("message", (data: Buffer | string) => {
        if (typeof data === "string") return; // Skip JSON messages

        if (data.length < 8) return;

        try {
          const responseCode = data[0];
          const exchangeSegment = data[3];
          const securityId = data.readInt32LE(4);
          const segmentName = exchangeSegment === 1 ? "IDX_I" : exchangeSegment === 5 ? "NSE_FNO" : "OTHER";
          const key = `${segmentName}:${securityId}`;

          if (responseCode === RESPONSE_CODE.QUOTE && data.length >= 50) {
            const ltp = data.readFloatLE(8);
            const volume = data.readInt32LE(22);
            const dayHigh = data.readFloatLE(42);
            const dayLow = data.readFloatLE(46);

            if (!ticksPerInstrument.has(key)) {
              ticksPerInstrument.set(key, 0);
              results.instrumentsReceivingTicks.add(key);
              session.progress.receivingTicks++;
            }
            ticksPerInstrument.set(key, (ticksPerInstrument.get(key) || 0) + 1);

            // Track segment stats
            if (!results.segments.has(segmentName)) {
              results.segments.set(segmentName, { total: 0, ticks: 0 });
            }
            const seg = results.segments.get(segmentName)!;
            seg.ticks++;

            // Store first 100 ticks
            if (results.ticks.length < 100) {
              results.ticks.push({
                key,
                ltp: ltp.toFixed(2),
                volume,
                dayHigh: dayHigh.toFixed(2),
                dayLow: dayLow.toFixed(2),
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (err: any) {
          results.errors.push(err.message);
          session.progress.errors++;
        }
      });

      ws.on("error", (err: any) => {
        results.errors.push(`WebSocket error: ${err.message}`);
        session.progress.errors++;
      });

      ws.on("close", () => {
        cleanup();
      });

      const finishTest = () => {
        session.status = "completed";
        session.endTime = Date.now();
        session.results = {
          instrumentsLoaded: results.instrumentsLoaded,
          instrumentsSubscribed: results.instrumentsSubscribed,
          instrumentsReceivingTicks: results.instrumentsReceivingTicks.size,
          tickSamples: results.ticks,
          segmentStats: Array.from(results.segments.entries()).map(([seg, stats]) => ({
            segment: seg,
            ...stats,
          })),
          errors: results.errors,
          duration: (session.endTime - session.startTime) / 1000,
        };
        resolve(session);
      };
    } catch (err: any) {
      session.status = "error";
      session.error = err.message;
      session.endTime = Date.now();
      resolve(session);
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/dhan/diagnostic/start
 * Start a new diagnostic test
 */
router.post("/start", requireAdmin, async (req: any, res: any) => {
  try {
    const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: DiagnosticSession = {
      id: sessionId,
      status: "running",
      startTime: Date.now(),
      progress: {
        connected: false,
        subscribed: 0,
        receivingTicks: 0,
        errors: 0,
      },
    };

    sessions.set(sessionId, session);

    // Run test asynchronously
    runDiagnosticTest(sessionId).catch((err) => {
      session.status = "error";
      session.error = err.message;
    });

    res.json({
      sessionId,
      status: "started",
      message: "Diagnostic test initiated. Check status with /status?sessionId=" + sessionId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/dhan/diagnostic/status
 * Get status of a diagnostic test
 */
router.get("/status", requireAdmin, (req: any, res: any) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId required" });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json({
      sessionId,
      status: session.status,
      progress: session.progress,
      results: session.results || null,
      error: session.error || null,
      duration: session.endTime ? (session.endTime - session.startTime) / 1000 : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/dhan/diagnostic/sessions
 * List all diagnostic sessions
 */
router.get("/sessions", requireAdmin, (req: any, res: any) => {
  try {
    const sessionList = Array.from(sessions.entries()).map(([id, session]) => ({
      id,
      status: session.status,
      startTime: new Date(session.startTime).toISOString(),
      endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
      duration: session.endTime ? (session.endTime - session.startTime) / 1000 : null,
      progress: session.progress,
      hasResults: !!session.results,
    }));

    res.json({
      total: sessionList.length,
      sessions: sessionList.slice(-10), // Last 10 sessions
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/dhan/diagnostic/clear
 * Clear old sessions
 */
router.delete("/clear", requireAdmin, (req: any, res: any) => {
  try {
    const before = sessions.size;
    const cutoff = Date.now() - 3600000; // 1 hour old

    for (const [id, session] of sessions.entries()) {
      if (session.startTime < cutoff && session.status !== "running") {
        sessions.delete(id);
      }
    }

    res.json({
      message: "Sessions cleared",
      before,
      after: sessions.size,
      deleted: before - sessions.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
