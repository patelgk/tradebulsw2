import { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  id: string;
}

export interface Trade {
  _id?: string;
  id: string;
  userId?: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  optionType: 'CE' | 'PE';
  strike: number;
  price: number;
  qty: number;
  lotSize: number;
  time: string;
  exitTime?: string;
  exitPrice?: number;
  status: 'Open' | 'Closed';
  pnl: number;
  charges: number;
  margin?: number;
}

export interface Plan {
  _id?: string;
  id: string;
  name: string;
  price: number;
  capital: number;
  profit_target: number;
  max_dd: number;
  daily_dd: number;
  tag?: string;
  recommended?: boolean;
}

export interface Rule {
  _id?: string;
  id: string;
  name: string;
  value: string;
  description: string;
}

export interface OptionStrike {
  strike:       number;
  ce_ltp:       number;
  ce_oi:        number;
  ce_oi_change: number;
  ce_security_id?: string;
  ce_volume?:   number;
  ce_bid?:      number;
  ce_ask?:      number;
  ce_change?:   number;
  ce_change_pct?: number;
  ce_iv?:       number;
  ce_delta?:    number;
  pe_ltp:       number;
  pe_oi:        number;
  pe_oi_change: number;
  pe_security_id?: string;
  pe_volume?:   number;
  pe_bid?:      number;
  pe_ask?:      number;
  pe_change?:   number;
  pe_change_pct?: number;
  pe_iv?:       number;
  pe_delta?:    number;
}

export interface ChartSelection {
  kind: 'index' | 'option';
  symbol: string;
  strike?: number;
  optionType?: 'CE' | 'PE';
  securityId?: string;
  exchangeSegment?: 'IDX_I' | 'NSE_FNO';
  instrument?: 'INDEX' | 'OPTIDX';
  timeframe?: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '1D';
  chartKey: string;
}

export interface ChartSubscription {
  chartKey: string;
  symbol: string;
  securityId: string;
  exchangeSegment: 'IDX_I' | 'NSE_FNO';
  instrument: 'INDEX' | 'OPTIDX';
  strike?: number;
  optionType?: 'CE' | 'PE';
}

export interface ChartTick {
  chartKey: string;
  symbol: string;
  securityId: string;
  exchangeSegment: 'IDX_I' | 'NSE_FNO';
  instrument: 'INDEX' | 'OPTIDX';
  strike?: number;
  optionType?: 'CE' | 'PE';
  price: number;
  lastTradedQty?: number;
  volume?: number;
  timestamp: string;
  ltt?: number;
  responseCode?: number;
  dayOpen?: number;
  dayHigh?: number;
  dayLow?: number;
  dayClose?: number;
}

export interface ChartCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type WatchlistInstrumentType = 'INDEX' | 'OPTION' | 'STOCK';

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  watchlistId: string;
  securityId: string;
  symbol: string;
  displaySymbol: string;
  underlying?: string;
  instrumentType: WatchlistInstrumentType;
  strikePrice?: number;
  optionType?: 'CE' | 'PE';
  expiry?: string;
  lotSize: number;
  exchangeSegment: 'IDX_I' | 'NSE_FNO' | 'NSE_EQ' | 'BSE_EQ';
  instrument?: 'INDEX' | 'OPTIDX' | 'EQUITY';
  createdAt: string;
}

export interface OrderTicketInstrument {
  securityId: string;
  symbol: string;
  displaySymbol: string;
  underlying?: string;
  strikePrice: number;
  optionType: 'CE' | 'PE';
  expiry?: string;
  lotSize: number;
  ltp: number;
  exchangeSegment: 'NSE_FNO';
  instrument: 'OPTIDX';
}

export interface SymbolMarketData {
  price:        number;
  change:       number;
  changePct:    number;
  dayOpen:      number;
  dayHigh:      number;
  dayLow:       number;
  prevClose:    number;
  volume:       number;
  timestamp:    string;
  expiry:       string;
  expiries:     string[];
  optionChain:  OptionStrike[];
  isMarketOpen: boolean;
  dataSource:   'Dhan' | 'Stale';
}

export interface Portfolio {
  equity:       number;
  balance:      number;
  unrealizedPnl:number;
  realizedPnl:  number;
  dayPnl:       number;
  totalCharges: number;
  drawdown:     number;
  positions:    Trade[];
  stats: {
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
  };
  equityCurve: { time: string; value: number }[];
}

export interface Account {
  _id?: string;
  id: string;
  balance: number;
  initialBalance: number;
  equity: number;
}

export interface Client {
  _id?: string;
  uid: string;
  id: string;
  name: string;
  email: string;
  balance: number;
  initial_balance: number;
  equity: number;
  unrealizedPnl: number;
  openPositions: number;
}

export interface TradeCharges {
  brokerage:       number;
  stt:             number;
  transactionCharge: number;
  gst:             number;
  sebiCharge:      number;
  stampDuty:       number;
  total:           number;
}

// All supported index symbols
export const SYMBOLS = [
  "Nifty 50",
  "Bank Nifty",
  "Fin Nifty",
  "Midcap Select",
  "Nifty Next 50",
  "SENSEX",
  "Bankex",
] as const;

export type SymbolName = typeof SYMBOLS[number];

export const INDEX_SECURITY_IDS: Record<SymbolName, string> = {
  "Nifty 50":      "13",
  "Bank Nifty":    "25",
  "Fin Nifty":     "27",
  "Midcap Select": "442",
  "Nifty Next 50": "28",
  "SENSEX":        "51",
  "Bankex":        "10",
};

export const LOT_SIZES: Record<SymbolName, number> = {
  "Nifty 50":      50,
  "Bank Nifty":    15,
  "Fin Nifty":     40,
  "Midcap Select": 75,
  "Nifty Next 50": 25,
  "SENSEX":        20,
  "Bankex":        15,
};

export const STRIKE_STEPS: Record<SymbolName, number> = {
  "Nifty 50":      50,
  "Bank Nifty":    100,
  "Fin Nifty":     50,
  "Midcap Select": 25,
  "Nifty Next 50": 50,
  "SENSEX":        100,
  "Bankex":        100,
};
