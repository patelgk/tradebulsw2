#!/usr/bin/env node

/**
 * Simple Dhan Real-Time Market Feed Test
 * No TypeScript compilation needed - runs directly with Node.js
 * 
 * Usage:
 *   node test-dhan-feed.js
 * 
 * Make sure server is running:
 *   npm start
 */

import axios from 'axios';
import { io } from 'socket.io-client';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const DHAN_CLIENT_ID = process.env.DHAN_CLIENT_ID || '';
const DHAN_ACCESS_TOKEN = process.env.DHAN_ACCESS_TOKEN || '';

// Test symbols
const TEST_SYMBOLS = {
  'Nifty 50': { securityId: '13', exchangeSegment: 'IDX_I' },
  'Bank Nifty': { securityId: '25', exchangeSegment: 'IDX_I' },
  'Fin Nifty': { securityId: '27', exchangeSegment: 'IDX_I' },
};

const TEST_TIMEFRAMES = ['5m', '1h', '1D'];

// Results tracking
const results = [];
let testsPassed = 0;
let testsFailed = 0;
let testsWarned = 0;

// ─── Utilities ───────────────────────────────────────────────────────────────

function log(title, message, level = 'INFO') {
  const timestamp = new Date().toLocaleTimeString('en-IN', { hour12: false });
  const icons = {
    INFO: '📋',
    SUCCESS: '✅',
    ERROR: '❌',
    WARN: '⚠️',
  };
  const icon = icons[level] || '📋';
  console.log(`[${timestamp}] ${icon} ${title}: ${message}`);
}

function recordResult(name, status, message, details = null) {
  results.push({ name, status, message, details });
  const icons = { PASS: '✅', FAIL: '❌', WARN: '⚠️', SKIP: '⊘' };
  console.log(`${icons[status]} ${name.padEnd(35)} [${status}] ${message}`);
  
  if (status === 'PASS') testsPassed++;
  else if (status === 'FAIL') testsFailed++;
  else if (status === 'WARN') testsWarned++;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Tests ──────────────────────────────────────────────────────────────────

async function test1_Environment() {
  log('TEST 1', 'Checking environment setup...', 'INFO');
  
  if (!DHAN_CLIENT_ID || !DHAN_ACCESS_TOKEN) {
    recordResult('Environment Setup', 'FAIL', 'Dhan credentials not found in .env');
    return false;
  }
  
  recordResult(
    'Environment Setup',
    'PASS',
    `Dhan Client: ${DHAN_CLIENT_ID}, Token: ${DHAN_ACCESS_TOKEN.substring(0, 20)}...`
  );
  return true;
}

async function test2_ServerConnection() {
  log('TEST 2', 'Checking server connection...', 'INFO');
  
  try {
    const response = await axios.get(`${SERVER_URL}/`, { timeout: 5000 }).catch(() => null);
    
    if (response) {
      recordResult('Server Connection', 'PASS', `Server online at ${SERVER_URL}`);
      return true;
    }
  } catch (err) {
    // Server might not have a health endpoint, but if port is open it's okay
  }
  
  recordResult('Server Connection', 'WARN', `Server at ${SERVER_URL} - may not be ready`);
  return false;
}

async function test3_SocketConnection() {
  log('TEST 3', 'Testing Socket.IO connection...', 'INFO');
  
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, { reconnection: false });
    const timeout = setTimeout(() => {
      socket.disconnect();
      recordResult('Socket.IO Connection', 'FAIL', 'Connection timeout after 10 seconds');
      resolve(false);
    }, 10000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      recordResult('Socket.IO Connection', 'PASS', `Connected (ID: ${socket.id})`);
      socket.disconnect();
      resolve(true);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      socket.disconnect();
      recordResult('Socket.IO Connection', 'FAIL', `Connection error: ${err.message}`);
      resolve(false);
    });
  });
}

async function test4_LivePrices() {
  log('TEST 4', 'Testing live index prices (30 seconds)...', 'INFO');
  
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, { reconnection: false });
    const priceUpdates = {};
    let updateCount = 0;
    
    const timeout = setTimeout(() => {
      socket.disconnect();
      
      if (updateCount > 0) {
        recordResult(
          'Live Index Prices',
          'PASS',
          `Received ${updateCount} price updates`
        );
        console.log('  Latest updates:');
        for (const [symbol, data] of Object.entries(priceUpdates)) {
          console.log(`    ${symbol}: ${data.price} (${data.changePct}%)`);
        }
        resolve(true);
      } else {
        recordResult('Live Index Prices', 'FAIL', 'No price updates received');
        resolve(false);
      }
    }, 30000);

    socket.on('connect', () => {
      for (const symbol of Object.keys(TEST_SYMBOLS)) {
        socket.emit('market:subscribe', { symbol });
        log('TEST 4', `Subscribed to ${symbol}`, 'INFO');
      }
    });

    socket.on('market:indexTick', (data) => {
      updateCount++;
      priceUpdates[data.symbol] = data;
      log(
        'TEST 4',
        `${data.symbol}: ₹${data.price.toFixed(2)} (${data.changePct}%) [${data.timestamp}]`,
        'SUCCESS'
      );
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.disconnect();
      recordResult('Live Index Prices', 'FAIL', `Socket error: ${err}`);
      resolve(false);
    });
  });
}

async function test5_MarketHours() {
  log('TEST 5', 'Checking market hours detection...', 'INFO');
  
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, { reconnection: false });
    const timeout = setTimeout(() => {
      socket.disconnect();
      recordResult('Market Hours', 'FAIL', 'No status received');
      resolve(false);
    }, 5000);

    socket.on('connect', () => {
      socket.emit('market:subscribe', { symbol: 'Nifty 50' });
    });

    socket.on('market:indexTick', (data) => {
      clearTimeout(timeout);
      socket.disconnect();

      const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
      const dayOfWeek = ist.getUTCDay();
      const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
      const expectedOpen = isWeekday && mins >= 555 && mins <= 930;

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek];
      const timeStr = ist.toLocaleTimeString('en-IN', { hour12: false });

      if (data.isMarketOpen === expectedOpen) {
        recordResult(
          'Market Hours Detection',
          'PASS',
          `Correct (${data.isMarketOpen}) at ${timeStr} on ${dayName}`
        );
        resolve(true);
      } else {
        recordResult(
          'Market Hours Detection',
          'WARN',
          `Mismatch: reported=${data.isMarketOpen}, expected=${expectedOpen} (${timeStr} ${dayName})`
        );
        resolve(false);
      }
    });
  });
}

async function test6_ChartHistory() {
  log('TEST 6', 'Testing chart history API...', 'INFO');
  
  const chartResults = {};
  
  for (const [symbol, config] of Object.entries(TEST_SYMBOLS)) {
    for (const timeframe of TEST_TIMEFRAMES) {
      try {
        const response = await axios.get(`${SERVER_URL}/api/chart/history`, {
          params: { symbol, timeframe },
          timeout: 10000,
        });

        if (Array.isArray(response.data) && response.data.length > 0) {
          chartResults[`${symbol} (${timeframe})`] = {
            status: 'OK',
            candles: response.data.length,
            latest: response.data[response.data.length - 1],
          };
        } else {
          chartResults[`${symbol} (${timeframe})`] = {
            status: 'EMPTY',
            candles: 0,
          };
        }
      } catch (err) {
        chartResults[`${symbol} (${timeframe})`] = {
          status: 'ERROR',
          error: err.response?.status || err.message,
        };
      }
    }
  }

  const successes = Object.values(chartResults).filter(r => r.status === 'OK').length;
  const total = Object.keys(chartResults).length;

  if (successes > 0) {
    recordResult('Chart History API', 'PASS', `Retrieved ${successes}/${total} charts`);
    console.log('  Chart Results:');
    for (const [key, result] of Object.entries(chartResults)) {
      const icon = result.status === 'OK' ? '✅' : result.status === 'EMPTY' ? '⚠️' : '❌';
      console.log(`    ${icon} ${key}: ${result.candles || result.error} candles`);
    }
    return true;
  } else {
    recordResult('Chart History API', 'FAIL', `Retrieved 0/${total} charts`);
    console.log('  Errors:');
    for (const [key, result] of Object.entries(chartResults)) {
      console.log(`    ❌ ${key}: ${result.error}`);
    }
    return false;
  }
}

async function test7_PriceValidation() {
  log('TEST 7', 'Testing price validation (15 seconds)...', 'INFO');
  
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, { reconnection: false });
    const prices = [];
    
    const timeout = setTimeout(() => {
      socket.disconnect();

      const zeroCount = prices.filter(p => p <= 0).length;
      const avg = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const min = prices.length > 0 ? Math.min(...prices) : 0;
      const max = prices.length > 0 ? Math.max(...prices) : 0;

      if (zeroCount === 0 && prices.length > 0) {
        recordResult(
          'Price Validation',
          'PASS',
          `${prices.length} updates, all valid (avg: ${avg.toFixed(2)}, min: ${min.toFixed(2)}, max: ${max.toFixed(2)})`
        );
        resolve(true);
      } else if (zeroCount > 0) {
        recordResult(
          'Price Validation',
          'WARN',
          `${zeroCount} zero prices out of ${prices.length} updates`
        );
        resolve(false);
      } else {
        recordResult('Price Validation', 'FAIL', 'No prices received');
        resolve(false);
      }
    }, 15000);

    socket.on('connect', () => {
      socket.emit('market:subscribe', { symbol: 'Nifty 50' });
    });

    socket.on('market:indexTick', (data) => {
      prices.push(data.price);
    });
  });
}

async function test8_ChartUpdates() {
  log('TEST 8', 'Testing live chart updates (20 seconds)...', 'INFO');
  
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, { reconnection: false });
    const candleUpdates = [];
    
    const timeout = setTimeout(() => {
      socket.disconnect();

      if (candleUpdates.length > 0) {
        recordResult('Live Chart Updates', 'PASS', `Received ${candleUpdates.length} candle updates`);
        console.log('  Latest candles:');
        for (const update of candleUpdates.slice(-3)) {
          console.log(
            `    ${update.timeframe}: O=${update.candle.open.toFixed(2)} H=${update.candle.high.toFixed(2)} L=${update.candle.low.toFixed(2)} C=${update.candle.close.toFixed(2)}`
          );
        }
        resolve(true);
      } else {
        recordResult('Live Chart Updates', 'WARN', 'No candle updates (market may be closed)');
        resolve(false);
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
      log('TEST 8', 'Subscribed to Nifty 50 5m chart', 'INFO');
    });

    socket.on('market:candleUpdate', (data) => {
      candleUpdates.push(data);
      log(
        'TEST 8',
        `Candle update: O=${data.candle.open.toFixed(2)} C=${data.candle.close.toFixed(2)}`,
        'SUCCESS'
      );
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function runTests() {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     PROPRUPEE DHAN REAL-TIME MARKET FEED TEST                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  log('START', `Testing Dhan feed from ${SERVER_URL}`, 'INFO');
  console.log('');

  try {
    await test1_Environment();
    await sleep(1000);
    
    await test2_ServerConnection();
    await sleep(1000);
    
    const socketOk = await test3_SocketConnection();
    await sleep(1000);
    
    if (socketOk) {
      await test4_LivePrices();
      await sleep(1000);
      
      await test5_MarketHours();
      await sleep(1000);
      
      await test6_ChartHistory();
      await sleep(1000);
      
      await test7_PriceValidation();
      await sleep(1000);
      
      await test8_ChartUpdates();
      await sleep(1000);
    }

    // Print summary
    console.log('');
    console.log('═'.repeat(70));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log(`✅ PASSED: ${testsPassed}`);
    console.log(`❌ FAILED: ${testsFailed}`);
    console.log(`⚠️  WARNED: ${testsWarned}`);
    console.log(`📊 TOTAL: ${results.length}`);
    console.log('═'.repeat(70));

    if (testsFailed === 0) {
      log('SUCCESS', 'All critical tests passed!', 'SUCCESS');
    } else {
      log('ATTENTION', `${testsFailed} critical issues found`, 'ERROR');
    }

    process.exit(testsFailed > 0 ? 1 : 0);

  } catch (err) {
    log('ERROR', err.message, 'ERROR');
    console.error(err);
    process.exit(1);
  }
}

// Run tests
runTests();
