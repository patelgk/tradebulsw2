/**
 * Virtual Trading Engine
 *
 * Accurate brokerage calculation matching real broker statements:
 * - NSE F&O brokerage: ₹20 flat per order (both sides)
 * - STT: 0.05% of premium × qty (on SELL side only for options)
 * - Transaction charges: NSE 0.053% of premium × qty
 * - SEBI charges: ₹10 per crore turnover
 * - Stamp duty: 0.003% of premium × qty (BUY only)
 * - GST: 18% on (brokerage + transaction + SEBI)
 *
 * P&L:
 * - Unrealized: (current LTP - entry price) × qty × sign (BUY=+1, SELL=-1)
 * - Realized:   (exit price - entry price) × qty × sign - total charges
 * - Day P&L:    all closed trades opened today
 */

import { Trade, TradeCharges, LOT_SIZES, SymbolName } from '../types';

// ─── Charge Calculator ────────────────────────────────────────────────────────

export function calculateCharges(
  price: number,
  qty: number,
  action: 'BUY' | 'SELL'
): TradeCharges {
  const turnover = price * qty;

  const brokerage    = 20;                           // ₹20 flat
  const stt          = action === 'SELL' ? turnover * 0.0005  : 0;  // 0.05% on sell
  const txnCharge    = turnover * 0.00053;           // NSE 0.053%
  const sebiCharge   = (turnover / 1e7) * 10;        // ₹10 per Cr
  const stampDuty    = action === 'BUY'  ? turnover * 0.00003 : 0;  // 0.003% on buy
  const gst          = (brokerage + txnCharge + sebiCharge) * 0.18;

  const total = brokerage + stt + txnCharge + sebiCharge + stampDuty + gst;

  return {
    brokerage:         +brokerage.toFixed(2),
    stt:               +stt.toFixed(2),
    transactionCharge: +txnCharge.toFixed(2),
    sebiCharge:        +sebiCharge.toFixed(2),
    stampDuty:         +stampDuty.toFixed(2),
    gst:               +gst.toFixed(2),
    total:             +total.toFixed(2),
  };
}

// ─── P&L Calculations ─────────────────────────────────────────────────────────

export function calcUnrealizedPnl(
  trade: Trade,
  currentLtp: number
): number {
  const sign = trade.type === 'BUY' ? 1 : -1;
  return +(sign * (currentLtp - trade.price) * trade.qty).toFixed(2);
}

export function calcRealizedPnl(
  trade: Trade
): number {
  if (!trade.exitPrice) return 0;
  const sign   = trade.type === 'BUY' ? 1 : -1;
  const gross  = sign * (trade.exitPrice - trade.price) * trade.qty;
  return +(gross - (trade.charges ?? 0)).toFixed(2);
}

// ─── Portfolio Analytics ──────────────────────────────────────────────────────

export interface PortfolioStats {
  winRate:      number;
  lossRate:     number;
  profitFactor: number;
  avgWin:       number;
  avgLoss:      number;
  expectancy:   number;
  totalTrades:  number;
  totalWins:    number;
  totalLosses:  number;
  maxDrawdown:  number;
}

export function calcStats(closedTrades: Trade[]): PortfolioStats {
  if (!closedTrades.length) {
    return { winRate: 0, lossRate: 0, profitFactor: 0, avgWin: 0, avgLoss: 0, expectancy: 0, totalTrades: 0, totalWins: 0, totalLosses: 0, maxDrawdown: 0 };
  }

  const pnls   = closedTrades.map(t => calcRealizedPnl(t));
  const wins   = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);

  const totalWins   = wins.length;
  const totalLosses = losses.length;
  const total       = pnls.length;
  const winRate     = +(totalWins / total * 100).toFixed(1);
  const lossRate    = +(totalLosses / total * 100).toFixed(1);
  const avgWin      = totalWins   ? +(wins.reduce((a, b) => a + b, 0)   / totalWins).toFixed(2)   : 0;
  const avgLoss     = totalLosses ? +(losses.reduce((a, b) => a + b, 0) / totalLosses).toFixed(2) : 0;
  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss   = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 999 : 0;
  const expectancy  = +(winRate / 100 * avgWin + lossRate / 100 * avgLoss).toFixed(2);

  // Max drawdown from equity curve
  let peak = 0, maxDD = 0, cumPnl = 0;
  for (const p of pnls) {
    cumPnl += p;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDD) maxDD = dd;
  }

  return { winRate, lossRate, profitFactor, avgWin, avgLoss, expectancy, totalTrades: total, totalWins, totalLosses, maxDrawdown: +maxDD.toFixed(2) };
}

export function buildEquityCurve(
  closedTrades: Trade[],
  initialBalance: number
): { time: string; value: number }[] {
  let cumPnl = initialBalance;
  return closedTrades
    .filter(t => t.status === 'Closed' && t.exitTime)
    .sort((a, b) => new Date(a.exitTime!).getTime() - new Date(b.exitTime!).getTime())
    .map(t => {
      cumPnl += calcRealizedPnl(t);
      return { time: t.exitTime!, value: +cumPnl.toFixed(2) };
    });
}

export function calcDayPnl(closedTrades: Trade[]): number {
  const today = new Date().toDateString();
  return +closedTrades
    .filter(t => t.status === 'Closed' && t.exitTime && new Date(t.exitTime).toDateString() === today)
    .reduce((sum, t) => sum + calcRealizedPnl(t), 0)
    .toFixed(2);
}

// ─── Trade Execution ──────────────────────────────────────────────────────────

export interface ExecuteTradeParams {
  userId:     string;
  symbol:     SymbolName;
  strike:     number;
  optionType: 'CE' | 'PE';
  type:       'BUY' | 'SELL';
  ltp:        number;
  balance:    number;
  lots?:      number;
}

export interface ExecuteTradeResult {
  ok:       boolean;
  error?:   string;
  trade?:   Partial<Trade>;
  charges?: TradeCharges;
  newBalance?: number;
}

export function buildTradeOrder(params: ExecuteTradeParams): ExecuteTradeResult {
  const { userId, symbol, strike, optionType, type, ltp, balance } = params;
  const lotSize = LOT_SIZES[symbol] ?? 50;
  const lots    = Math.max(1, Math.floor(Number(params.lots) || 1));
  const qty     = lots * lotSize;

  const entryCharges = calculateCharges(ltp, qty, type);
  const marginNeeded = type === 'SELL' ? Math.max(ltp * qty * 5, 25000) : ltp * qty + entryCharges.total;

  if (balance < marginNeeded + entryCharges.total) {
    return { ok: false, error: `Insufficient balance. Need ₹${(marginNeeded + entryCharges.total).toFixed(0)}, have ₹${balance.toFixed(0)}` };
  }

  const trade: Partial<Trade> = {
    userId,
    symbol,
    strike,
    optionType,
    type,
    price:   ltp,
    lots,
    qty,
    lotSize,
    status:  'Open',
    pnl:     0,
    charges: entryCharges.total,
    time:    new Date().toISOString(),
    margin:  type === 'SELL' ? marginNeeded : 0,
  };

  const newBalance = type === 'BUY'
    ? balance - (ltp * qty) - entryCharges.total
    : balance - entryCharges.total; // SELL: margin blocked separately

  return { ok: true, trade, charges: entryCharges, newBalance: +newBalance.toFixed(2) };
}

export function buildExitOrder(
  trade: Trade,
  exitLtp: number,
  currentBalance: number
): ExecuteTradeResult {
  const exitAction: 'BUY' | 'SELL' = trade.type === 'BUY' ? 'SELL' : 'BUY';
  const exitCharges = calculateCharges(exitLtp, trade.qty, exitAction);

  const sign    = trade.type === 'BUY' ? 1 : -1;
  const gross   = sign * (exitLtp - trade.price) * trade.qty;
  const netPnl  = +(gross - (trade.charges ?? 0) - exitCharges.total).toFixed(2);

  let newBalance = currentBalance;
  if (trade.type === 'BUY') {
    // Return sale proceeds minus exit charges
    newBalance += exitLtp * trade.qty - exitCharges.total;
  } else {
    // Return margin + profit (or deduct loss)
    newBalance += (trade.margin ?? 0) + netPnl;
  }

  return {
    ok:         true,
    newBalance: +newBalance.toFixed(2),
    charges:    exitCharges,
    trade: {
      ...trade,
      status:    'Closed',
      exitPrice: exitLtp,
      exitTime:  new Date().toISOString(),
      pnl:       netPnl,
      charges:   +(( trade.charges ?? 0) + exitCharges.total).toFixed(2),
    },
  };
}
