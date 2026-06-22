import Dexie, { Table } from 'dexie';
import { Trade, Watchlist, WatchlistItem } from './types';

export interface LocalMarketData {
  symbol: string;
  price: number;
  change: number;
  timestamp: string;
  optionChain?: any[];
}

export interface LocalCandle {
  symbol: string;
  interval: string;
  candles: any[];
  lastUpdated: number;
}

export interface LocalChartHistory {
  cacheKey: string;
  symbol: string;
  securityId: string;
  exchangeSegment: 'IDX_I' | 'NSE_FNO';
  instrument: 'INDEX' | 'OPTIDX';
  timeframe: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '1D';
  date: string;
  candles: any[];
  lastUpdated: number;
}

export class AppDatabase extends Dexie {
  trades!: Table<Trade>;
  marketData!: Table<LocalMarketData>;
  marketHistorical!: Table<LocalCandle>;
  chartHistory!: Table<LocalChartHistory>;
  watchlists!: Table<Watchlist>;
  watchlistItems!: Table<WatchlistItem>;

  constructor() {
    super('IndoTraderDB');
    this.version(3).stores({
      trades: 'id, userId, symbol, status',
      marketData: 'symbol',
      marketHistorical: '[symbol+interval]',
      chartHistory: 'cacheKey'
    });
    this.version(4).stores({
      trades: 'id, userId, symbol, status',
      marketData: 'symbol',
      marketHistorical: '[symbol+interval]',
      chartHistory: 'cacheKey',
      watchlists: 'id, userId, updatedAt',
      watchlistItems: 'id, userId, [userId+watchlistId], securityId, symbol, instrumentType'
    });
  }
}

export const db = new AppDatabase();
