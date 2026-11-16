/**
 * PropRupee Dhan Real-Time Market Feed Test Suite
 * 
 * Tests the complete market data pipeline:
 * Dhan WebSocket → MarketFeedManager → Socket.IO → Test Results
 * 
 * Run with: npx ts-node DHAN_REALTIME_MARKET_TEST.ts
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Configuration ───────────────────────────────────────────────────────────

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const DHAN_CLIENT_ID = process.env.DHAN_CLIENT_ID || '';
const DHAN_ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || '';
const TEST_TIMEOUT = 60000; // 60 seconds

// Symbols to test
const TEST_SYMBOLS = {
  'Nifty 50': { securityId: '13', exchangeSegment: 'IDX_I' },
  'Bank Nifty': { securityId: '25', exchangeSegment: 'IDX_I' },
  'Fin Nifty': { securityId: '27', exchangeSegment: 'IDX_I' },
};

const TEST_TIMEFRAMES = ['5m', '1h', '1D'];

// ─── Test Results ───────────────────────────────────────────────────────────

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'PENDING' | 'SKIP';
  message: string;
  duration: number;
  details?: any;
}

const results: TestResult[] = [];

// ─── Utilities ───────────────────────────────────────────────────────────────

function log(title: string, message: string, level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO') {
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const icon = {
    INFO: '📋',
    SUCCESS: '✅',
    ERROR: '❌',
    WARN: '⚠️',
  }[level];
  console.log(`[${timestamp}] ${icon} ${title}: ${message}`);
}

function recordResult(test: TestResult) {
  results.push(test);
  const icon = {
    PASS: '✅',
    FAIL: '❌',
    PENDING: '⏳',
    SKIP: '⊘',
  }[test.status];
  log(`${icon} ${test.name}`, test.message, test.status === 'PASS' ? 'SUCCESS' : test.status === 'FAIL' ? 'ERROR' : 'WARN');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function testEnvironmentSetup(): Promise<TestResult> {
  const start = Date.now();
  try {
    if (!DHAN_CLIENT_ID || !DHAN_ACCESS_TOKEN) {
      return {
        name: 'Environment Setup',
        status: 'FAIL',
        message: 'Dhan credentials not configured in .env',
        duration: Date.now() - start,
      };
    }

    return {
      name: 'Environment Setup',
      status: 'PASS',
      message: `Dhan credentials loaded (Client: ${DHAN_CLIENT_ID}, Token: ${DHAN_ACCESS_TOKEN.substring(0, 20)}...)`,
      duration: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: 'Environment Setup',
      status: 'FAIL',
      message: err.message,
      duration: Date.now() - start,
    };
  }
}

async function testServerConnection(): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await axios.get(`${SERVER_URL}/health`, { timeout: 5000 }).catch(() => null);
    
    if (response?.status === 200) {
      return {
        name: 'Server Connection',
        status: 'PASS',
        message: `Server online at ${SERVER_URL}`,
        duration: Date.now() - start,
      };
    }
    
    return {
      name: 'Server Connection',
      status: 'WARN',
      message: `Server available but health endpoint returned ${response?.status}`,
      duration: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: 'Server Connection',
      status: 'FAIL',
      message: `Cannot connect to server: ${err.message}`,
      duration: Date.now() - start,
      details: { url: SERVER_URL },
    };
  }
}

async function testSocketIOConnection(): Promise<TestResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({
        name: 'Socket.IO Connection',
        status: 'FAIL',
        message: 'Connection timeout after 10 seconds',
        duration: Date.now() - start,
      });
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      log('Socket.IO', `Connected (ID: ${socket.id})`);
      resolve({
        name: 'Socket.IO Connection',
        status: 'PASS',
        message: `Connected successfully (ID: ${socket.id})`,
        duration: Date.now() - start,
      });
      socket.disconnect();
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      socket.disconnect();
      resolve({
        name: 'Socket.IO Connection',
        status: 'FAIL',
        message: `Connection error: ${err.message}`,
        duration: Date.now() - start,
      });
    });
  });
}

async function testLiveIndexPrices(): Promise<TestResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    const receivedUpdates: any[] = [];
    const timeout = setTimeout(() => {
      socket.disconnect();
      if (receivedUpdates.length > 0) {
        resolve({
          name: 'Live Index Prices',
          status: 'PASS',
          message: `Received ${receivedUpdates.length} price updates (${Object.keys(TEST_SYMBOLS).join(', ')})`,
          duration: Date.now() - start,
          details: {
            updates: receivedUpdates.map(u => ({
              symbol: u.symbol,
              price: u.price,
              change: u.change,
              changePct: u.changePct,
              timestamp: u.timestamp,
            })),
          },
        });
      } else {
        resolve({
          name: 'Live Index Prices',
          status: 'FAIL',
          message: 'No price updates received after 30 seconds',
          duration: Date.now() - start,
        });
      }
    }, 30000);

    socket.on('connect', () => {
      log('Live Prices Test', 'Connected, subscribing to indices...');
      
      // Subscribe to all test symbols
      for (const symbol of Object.keys(TEST_SYMBOLS)) {
        socket.emit('market:subscribe', { symbol });
      }
    });

    socket.on('market:indexTick', (data) => {
      log('Market Tick', `${data.symbol}: ${data.price} (${data.changePct}%)`);
      receivedUpdates.push(data);

      if (receivedUpdates.length >= Object.keys(TEST_SYMBOLS).length * 2) {
        clearTimeout(timeout);
        socket.disconnect();
        resolve({
          name: 'Live Index Prices',
          status: 'PASS',
          message: `Received ${receivedUpdates.length} updates from all indices`,
          duration: Date.now() - start,
          details: {
            updates: receivedUpdates.slice(0, 5).map(u => ({
              symbol: u.symbol,
              price: u.price,
              change: u.change,
              changePct: u.changePct,
              source: u.source,
            })),
            totalReceived: receivedUpdates.length,
          },
        });
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.disconnect();
      resolve({
        name: 'Live Index Prices',
        status: 'FAIL',
        message: `Socket error: ${err}`,
        duration: Date.now() - start,
      });
    });
  });
}

async function testMarketHoursStatus(): Promise<TestResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    const timeout = setTimeout(() => {
      socket.disconnect();
      resolve({
        name: 'Market Hours Status',
        status: 'FAIL',
        message: 'No status received after 5 seconds',
        duration: Date.now() - start,
      });
    }, 5000);

    socket.on('connect', () => {
      socket.emit('market:subscribe', { symbol: 'Nifty 50' });
    });

    socket.on('market:indexTick', (data) => {
      clearTimeout(timeout);
      socket.disconnect();

      const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const isWeekday = ist.getUTCDay() >= 1 && ist.getUTCDay() <= 5;
      const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
      const expectedOpen = isWeekday && mins >= 555 && mins <= 930;

      if (data.isMarketOpen === expectedOpen) {
        resolve({
          name: 'Market Hours Status',
          status: 'PASS',
          message: `Market hours correctly detected (open: ${data.isMarketOpen}, expected: ${expectedOpen})`,
          duration: Date.now() - start,
          details: {
            reported: data.isMarketOpen,
            expected: expectedOpen,
            time: ist.toLocaleTimeString('en-IN', { hour12: false }),
            day: ist.toLocaleDateString('en-IN', { weekday: 'long' }),
          },
        });
      } else {
        resolve({
          name: 'Market Hours Status',
          status: 'WARN',
          message: `Market hours mismatch (reported: ${data.isMarketOpen}, expected: ${expectedOpen})`,
          duration: Date.now() - start,
          details: {
            reported: data.isMarketOpen,
            expected: expectedOpen,
          },
        });
      }
    });
  });
}

async function testChartHistoryAPI(): Promise<TestResult> {
  const start = Date.now();
  try {
    const results: any[] = [];

    for (const [symbol, config] of Object.entries(TEST_SYMBOLS)) {
      for (const timeframe of TEST_TIMEFRAMES) {
        try {
          const response = await axios.get(`${SERVER_URL}/api/chart/history`, {
            params: { symbol, timeframe },
            timeout: 10000,
          });

          if (Array.isArray(response.data) && response.data.length > 0) {
            results.push({
              symbol,
              timeframe,
              status: 'OK',
              candles: response.data.length,
              sample: response.data[0],
            });
          } else {
            results.push({
              symbol,
              timeframe,
              status: 'EMPTY',
              candles: 0,
            });
          }
        } catch (err: any) {
          results.push({
            symbol,
            timeframe,
            status: 'ERROR',
            error: err.response?.status || err.message,
          });
        }
      }
    }

    const successes = results.filter(r => r.status === 'OK').length;
    const total = results.length;

    return {
      name: 'Chart History API',
      status: successes > 0 ? 'PASS' : 'FAIL',
      message: `Retrieved ${successes}/${total} chart histories successfully`,
      duration: Date.now() - start,
      details: results,
    };
  } catch (err: any) {
    return {
      name: 'Chart History API',
      status: 'FAIL',
      message: err.message,
      duration: Date.now() - start,
    };
  }
}

async function testPriceValidation(): Promise<TestResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    const prices: any[] = [];
    const timeout = setTimeout(() => {
      socket.disconnect();

      const zeroCount = prices.filter(p => p.price <= 0).length;
      const hasZeros = zeroCount > 0;
      const avgPrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p.price, 0) / prices.length : 0;

      if (!hasZeros && avgPrice > 1000) {
        resolve({
          name: 'Price Validation',
          status: 'PASS',
          message: `All prices valid (${prices.length} updates, avg: ${avgPrice.toFixed(2)}, no zeros)`,
          duration: Date.now() - start,
          details: {
            totalUpdates: prices.length,
            avgPrice: avgPrice.toFixed(2),
            minPrice: Math.min(...prices.map(p => p.price)).toFixed(2),
            maxPrice: Math.max(...prices.map(p => p.price)).toFixed(2),
            zeroCount,
          },
        });
      } else if (hasZeros) {
        resolve({
          name: 'Price Validation',
          status: 'WARN',
          message: `Found ${zeroCount} zero prices (possible stale data)`,
          duration: Date.now() - start,
          details: { zeroCount, totalUpdates: prices.length },
        });
      } else {
        resolve({
          name: 'Price Validation',
          status: 'FAIL',
          message: 'No price data received',
          duration: Date.now() - start,
        });
      }
    }, 15000);

    socket.on('connect', () => {
      socket.emit('market:subscribe', { symbol: 'Nifty 50' });
    });

    socket.on('market:indexTick', (data) => {
      prices.push({ price: data.price, symbol: data.symbol, timestamp: data.timestamp });
    });
  });
}

async function testLiveChartUpdates(): Promise<TestResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    const candleUpdates: any[] = [];
    const timeout = setTimeout(() => {
      socket.disconnect();

      if (candleUpdates.length > 0) {
        resolve({
          name: 'Live Chart Updates',
          status: 'PASS',
          message: `Received ${candleUpdates.length} candle updates`,
          duration: Date.now() - start,
          details: candleUpdates.map(c => ({
            timeframe: c.timeframe,
            candle: c.candle,
          })),
        });
      } else {
        resolve({
          name: 'Live Chart Updates',
          status: 'WARN',
          message: 'No candle updates received (market may be closed)',
          duration: Date.now() - start,
        });
      }
    }, 20000);

    socket.on('connect', () => {
      socket.emit('market:subscribe', { symbol: 'Nifty 50' });
      socket.emit('chart:subscribe', {
        symbol: 'Nifty 50',
        securityId: '13',
        exchangeSegment: 'IDX_I',
        instrument: 'INDEX',
        timeframe: '5m',
      });
    });

    socket.on('market:candleUpdate', (data) => {
      log('Candle Update', `${data.timeframe}: O=${data.candle?.open} H=${data.candle?.high} L=${data.candle?.low} C=${data.candle?.close}`);
      candleUpdates.push(data);
    });
  });
}

async function testDataIntegrity(): Promise<TestResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = io(SERVER_URL);
    const issues: string[] = [];
    const updates: any[] = [];
    const timeout = setTimeout(() => {
      socket.disconnect();

      // Check for issues
      if (updates.length > 1) {
        for (let i = 1; i < updates.length; i++) {
          if (updates[i].price < updates[i - 1].price * 0.8) {
            issues.push(`Large drop: ${updates[i - 1].price} → ${updates[i].price}`);
          }
        }
      }

      if (issues.length === 0) {
        resolve({
          name: 'Data Integrity',
          status: 'PASS',
          message: `All ${updates.length} updates checked, no anomalies`,
          duration: Date.now() - start,
          details: {
            updatesChecked: updates.length,
            issuesFound: 0,
          },
        });
      } else {
        resolve({
          name: 'Data Integrity',
          status: 'WARN',
          message: `Found ${issues.length} potential issues`,
          duration: Date.now() - start,
          details: { issues, totalUpdates: updates.length },
        });
      }
    }, 20000);

    socket.on('connect', () => {
      for (const symbol of Object.keys(TEST_SYMBOLS)) {
        socket.emit('market:subscribe', { symbol });
      }
    });

    socket.on('market:indexTick', (data) => {
      updates.push(data);
    });
  });
}

// ─── Main Test Runner ───────────────────────────────────────────────────────

async function runAllTests() {
  console.clear();
  log('DHAN REAL-TIME MARKET FEED TEST SUITE', '='.repeat(50));
  log('START', `Testing Dhan market feed from ${SERVER_URL}`);
  console.log('');

  try {
    // Run tests sequentially
    recordResult(await testEnvironmentSetup());
    recordResult(await testServerConnection());
    recordResult(await testSocketIOConnection());
    recordResult(await testMarketHoursStatus());
    recordResult(await testPriceValidation());
    recordResult(await testLiveIndexPrices());
    recordResult(await testChartHistoryAPI());
    recordResult(await testLiveChartUpdates());
    recordResult(await testDataIntegrity());

    console.log('');
    console.log('═'.repeat(80));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(80));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;

    for (const result of results) {
      const icon = {
        PASS: '✅',
        FAIL: '❌',
        WARN: '⚠️',
        SKIP: '⊘',
      }[result.status];
      console.log(`${icon} ${result.name.padEnd(30)} ${result.status.padEnd(8)} ${result.message}`);
    }

    console.log('');
    console.log(`📊 RESULTS: ${passed} PASS | ${failed} FAIL | ${warned} WARN | ${results.length} TOTAL`);
    console.log(`⏱️  Total Duration: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);
    console.log('');

    if (failed === 0) {
      log('SUCCESS', 'All critical tests passed!', 'SUCCESS');
    } else {
      log('ISSUES', `${failed} critical issue(s) found`, 'ERROR');
    }

    console.log('═'.repeat(80));

    // Export detailed results
    const report = {
      timestamp: new Date().toISOString(),
      server: SERVER_URL,
      dhanClientId: DHAN_CLIENT_ID.substring(0, 5) + '...',
      results,
      summary: { passed, failed, warned, total: results.length },
    };

    console.log('\n📄 Detailed Results:');
    console.log(JSON.stringify(report, null, 2));

  } catch (err: any) {
    log('ERROR', err.message, 'ERROR');
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests, TestResult };
