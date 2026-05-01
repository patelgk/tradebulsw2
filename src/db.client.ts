import Dexie, { Table } from 'dexie';
import { Trade } from './types';

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

export class AppDatabase extends Dexie {
  trades!: Table<Trade>;
  marketData!: Table<LocalMarketData>;
  marketHistorical!: Table<LocalCandle>;

  constructor() {
    super('IndoTraderDB');
    this.version(2).stores({
      trades: 'id, userId, symbol, status',
      marketData: 'symbol',
      marketHistorical: '[symbol+interval]'
    });
  }
}

export const db = new AppDatabase();
