import {
  LOT_SIZES,
  MarketFeedManager,
  OptionStrike,
  SymbolName,
  SimulatedFeedUpdate,
} from "./marketFeedManager.js";

type SimSymbol = SymbolName;

type SimIndex = {
  symbol: SimSymbol;
  securityId: string;
  price: number;
  dayOpen: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  step: number;
};

type SimOption = {
  symbol: SimSymbol;
  securityId: string;
  strike: number;
  optionType: "CE" | "PE";
  price: number;
  volume: number;
  oi: number;
};

const SIM_SYMBOLS: SimIndex[] = [
  { symbol: "Nifty 50", securityId: "13", price: 23350, dayOpen: 23350, dayHigh: 23350, dayLow: 23350, volume: 100000, step: 50 },
  { symbol: "Bank Nifty", securityId: "25", price: 51500, dayOpen: 51500, dayHigh: 51500, dayLow: 51500, volume: 80000, step: 100 },
  { symbol: "Fin Nifty", securityId: "27", price: 24000, dayOpen: 24000, dayHigh: 24000, dayLow: 24000, volume: 65000, step: 50 },
  { symbol: "Midcap Select", securityId: "442", price: 12350, dayOpen: 12350, dayHigh: 12350, dayLow: 12350, volume: 52000, step: 25 },
  { symbol: "Nifty Next 50", securityId: "28", price: 68200, dayOpen: 68200, dayHigh: 68200, dayLow: 68200, volume: 46000, step: 100 },
  { symbol: "SENSEX", securityId: "51", price: 82000, dayOpen: 82000, dayHigh: 82000, dayLow: 82000, volume: 70000, step: 100 },
  { symbol: "Bankex", securityId: "10", price: 62000, dayOpen: 62000, dayHigh: 62000, dayLow: 62000, volume: 42000, step: 100 },
];

function isSimulatorAllowed() {
  return process.env.NODE_ENV !== "production" && (
    process.env.TEST_MODE === "true" ||
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_MARKET_SIMULATOR === "true"
  );
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function nextExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function optionToken(symbol: SimSymbol, strike: number, optionType: "CE" | "PE") {
  const prefix = symbol.replace(/\s+/g, "_").toUpperCase();
  return `SIM_${prefix}_${strike}_${optionType}`;
}

function theoreticalOptionPrice(indexPrice: number, strike: number, optionType: "CE" | "PE") {
  const intrinsic = optionType === "CE" ? Math.max(0, indexPrice - strike) : Math.max(0, strike - indexPrice);
  const distance = Math.abs(indexPrice - strike);
  const timeValue = Math.max(6, 160 * Math.exp(-distance / 450));
  return round2(Math.max(0.5, intrinsic + timeValue + randomBetween(-1.5, 1.5)));
}

export class DevelopmentMarketSimulator {
  private timer: NodeJS.Timeout | null = null;
  private readonly indices = new Map<SimSymbol, SimIndex>();
  private readonly options = new Map<string, SimOption>();
  private lastDiagnosticAt = 0;

  constructor(private readonly marketFeed: MarketFeedManager) {
    for (const item of SIM_SYMBOLS) {
      this.indices.set(item.symbol, { ...item });
    }
  }

  isRunning() {
    return this.timer !== null;
  }

  start() {
    if (!isSimulatorAllowed()) {
      console.warn("[MarketSimulator] blocked start: simulator is not allowed in production.");
      return false;
    }
    if (this.timer) return true;

    this.marketFeed.setSimulatorActive(true);
    this.seedOptionChains();
    console.log("[MarketSimulator] started development market simulator.");
    this.scheduleNextTick();
    return true;
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.marketFeed.setSimulatorActive(false);
    console.log("[MarketSimulator] stopped development market simulator.");
  }

  status() {
    return {
      allowed: isSimulatorAllowed(),
      running: this.isRunning(),
      symbols: [...this.indices.keys()],
      optionContracts: this.options.size,
    };
  }

  private seedOptionChains() {
    const expiry = nextExpiry();
    for (const index of this.indices.values()) {
      const chain = this.buildOptionChain(index);
      this.marketFeed.seedSimulatedOptionChain(index.symbol as SymbolName, chain, expiry);
    }
  }

  private buildOptionChain(index: SimIndex): OptionStrike[] {
    const atm = Math.round(index.price / index.step) * index.step;
    const strikes = Array.from({ length: 13 }, (_, i) => atm + (i - 6) * index.step);
    return strikes.map((strike) => {
      const ceToken = optionToken(index.symbol, strike, "CE");
      const peToken = optionToken(index.symbol, strike, "PE");
      const cePrice = theoreticalOptionPrice(index.price, strike, "CE");
      const pePrice = theoreticalOptionPrice(index.price, strike, "PE");
      const ceOi = Math.round(randomBetween(5000, 250000));
      const peOi = Math.round(randomBetween(5000, 250000));

      this.options.set(ceToken, {
        symbol: index.symbol,
        securityId: ceToken,
        strike,
        optionType: "CE",
        price: cePrice,
        volume: Math.round(randomBetween(1000, 120000)),
        oi: ceOi,
      });
      this.options.set(peToken, {
        symbol: index.symbol,
        securityId: peToken,
        strike,
        optionType: "PE",
        price: pePrice,
        volume: Math.round(randomBetween(1000, 120000)),
        oi: peOi,
      });

      return {
        strike,
        ce_ltp: cePrice,
        ce_oi: ceOi,
        ce_oi_change: 0,
        ce_security_id: ceToken,
        ce_volume: Math.round(randomBetween(1000, 120000)),
        ce_change: 0,
        ce_change_pct: 0,
        ce_iv: round2(randomBetween(10, 24)),
        pe_ltp: pePrice,
        pe_oi: peOi,
        pe_oi_change: 0,
        pe_security_id: peToken,
        pe_volume: Math.round(randomBetween(1000, 120000)),
        pe_change: 0,
        pe_change_pct: 0,
        pe_iv: round2(randomBetween(10, 24)),
      };
    });
  }

  private scheduleNextTick() {
    const delay = Math.round(randomBetween(500, 1000));
    this.timer = setTimeout(() => {
      this.generateTickBatch();
      this.scheduleNextTick();
    }, delay);
  }

  private generateTickBatch() {
    for (const index of this.indices.values()) {
      const drift = randomBetween(-0.45, 0.45);
      const impulse = randomBetween(-index.step * 0.035, index.step * 0.035);
      index.price = round2(Math.max(1, index.price + drift + impulse));
      index.dayHigh = Math.max(index.dayHigh, index.price);
      index.dayLow = Math.min(index.dayLow, index.price);
      index.volume += Math.round(randomBetween(250, 2500));

      const indexUpdate: SimulatedFeedUpdate = {
        securityId: index.securityId,
        exchangeSegment: 0,
        responseCode: 4,
        ltp: index.price,
        lastTradedQty: Math.round(randomBetween(1, 50)),
        ltt: nowSeconds(),
        atp: index.price,
        volume: index.volume,
        totalSellQty: Math.round(randomBetween(1000, 5000)),
        totalBuyQty: Math.round(randomBetween(1000, 5000)),
        dayOpen: index.dayOpen,
        dayClose: index.dayOpen,
        dayHigh: index.dayHigh,
        dayLow: index.dayLow,
      };
      this.marketFeed.injectSimulatedTick(indexUpdate);

      const nearOptions = [...this.options.values()]
        .filter((option) => option.symbol === index.symbol)
        .sort((a, b) => Math.abs(a.strike - index.price) - Math.abs(b.strike - index.price))
        .slice(0, 10);

      for (const option of nearOptions) {
        const target = theoreticalOptionPrice(index.price, option.strike, option.optionType);
        option.price = round2(clamp(option.price + (target - option.price) * 0.35 + randomBetween(-0.35, 0.35), 0.5, 10000));
        option.volume += Math.round(randomBetween(10, 900));
        option.oi = Math.max(0, option.oi + Math.round(randomBetween(-80, 120)));

        this.marketFeed.injectSimulatedTick({
          securityId: option.securityId,
          exchangeSegment: 0,
          responseCode: 4,
          ltp: option.price,
          lastTradedQty: Math.round(randomBetween(1, LOT_SIZES[option.symbol] || 50)),
          ltt: nowSeconds(),
          atp: option.price,
          volume: option.volume,
          totalSellQty: Math.round(randomBetween(100, 1000)),
          totalBuyQty: Math.round(randomBetween(100, 1000)),
          dayOpen: option.price,
          dayClose: option.price,
          dayHigh: option.price + randomBetween(0, 4),
          dayLow: Math.max(0.5, option.price - randomBetween(0, 4)),
        });

        this.marketFeed.injectSimulatedTick({
          securityId: option.securityId,
          exchangeSegment: 0,
          responseCode: 5,
          ltp: 0,
          ltt: nowSeconds(),
          oi: option.oi,
        });
      }
    }

    this.logDiagnostic();
  }

  private logDiagnostic() {
    const now = Date.now();
    if (now - this.lastDiagnosticAt < 3000) return;
    this.lastDiagnosticAt = now;
    const nifty = this.indices.get("Nifty 50");
    console.log(`[MarketSimulator] simulator tick generated nifty=${nifty?.price.toFixed(2)} options=${this.options.size}`);
    console.log("[MarketSimulator] socket emitted through MarketFeedManager live pipeline");
  }
}
