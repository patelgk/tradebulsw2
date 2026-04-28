import Dexie, { Table } from 'dexie';
import { Trade } from './types';

export interface LocalMarketData {
  symbol: string;
  price: number;
  change: number;
  timestamp: string;
  optionChain?: any[];
}

export class AppDatabase extends Dexie {
  trades!: Table<Trade>;
  marketData!: Table<LocalMarketData>;

  constructor() {
    super('IndoTraderDB');
    this.version(1).stores({
      trades: 'id, userId, symbol, status',
      marketData: 'symbol'
    });
  }
}

export const db = new AppDatabase();
