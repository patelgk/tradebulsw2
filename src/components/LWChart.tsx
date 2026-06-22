import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { api } from '../api';
import { db } from '../db.client';
import type { ChartCandle, ChartSelection, ChartTick } from '../types';

type ChartInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '1D';
const IS_DEV = import.meta.env.DEV;

interface Props {
  selection: ChartSelection;
  interval?: ChartInterval;
  onIntervalChange?: (interval: ChartInterval) => void;
  liveTick?: ChartTick | null;
  darkMode?: boolean;
  height?: number;
}

type StoredCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const TIMEFRAMES: ChartInterval[] = ['1m', '3m', '5m', '15m', '30m', '1h', '1D'];

function intervalToMs(interval: ChartInterval) {
  switch (interval) {
    case '1m': return 60 * 1000;
    case '3m': return 3 * 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '1D': return 24 * 60 * 60 * 1000;
    default: return 5 * 60 * 1000;
  }
}

function alignTimestamp(tsMs: number, interval: ChartInterval) {
  if (interval === '1D') {
    const istMs = tsMs + (5.5 * 60 * 60 * 1000);
    const midnightIst = Math.floor(istMs / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
    return midnightIst - (5.5 * 60 * 60 * 1000);
  }
  const bucket = intervalToMs(interval);
  return Math.floor(tsMs / bucket) * bucket;
}

function toUtcTimestamp(value: string | number): UTCTimestamp {
  const ms = typeof value === 'number' ? value : new Date(value).getTime();
  return Math.floor(ms / 1000) as UTCTimestamp;
}

function clampNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toStoredCandle(row: ChartCandle): StoredCandle {
  return {
    time: row.time,
    open: clampNumber(row.open),
    high: clampNumber(row.high),
    low: clampNumber(row.low),
    close: clampNumber(row.close),
    volume: clampNumber(row.volume),
  };
}

function toSeriesCandle(row: StoredCandle): CandlestickData {
  return {
    time: toUtcTimestamp(row.time) as Time,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
  };
}

function toVolumePoint(row: StoredCandle, themeUp: string, themeDown: string): HistogramData {
  return {
    time: toUtcTimestamp(row.time) as Time,
    value: row.volume,
    color: row.close >= row.open ? themeUp : themeDown,
  };
}

function buildTradingDateKey(ts = Date.now()) {
  const d = new Date(ts + 5.5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function buildCacheKey(selection: ChartSelection, interval: ChartInterval, dateKey = buildTradingDateKey()) {
  return [
    selection.kind,
    selection.symbol,
    selection.securityId || 'na',
    selection.exchangeSegment || (selection.kind === 'index' ? 'IDX_I' : 'NSE_FNO'),
    selection.instrument || (selection.kind === 'index' ? 'INDEX' : 'OPTIDX'),
    selection.strike ?? '0',
    selection.optionType ?? 'NA',
    interval,
    dateKey,
  ].join(':');
}

const LWChart = memo(({ selection, interval = '5m', onIntervalChange, liveTick, darkMode = true, height = 420 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const candlesRef = useRef<StoredCandle[]>([]);
  const historyCacheRef = useRef(new Map<string, StoredCandle[]>());
  const pendingTicksRef = useRef<ChartTick[]>([]);
  const loadSeqRef = useRef(0);
  const activeCacheKeyRef = useRef('');
  const persistTimerRef = useRef<number | null>(null);
  const liveTickFrameRef = useRef<number | null>(null);
  const pendingLiveTickRef = useRef<ChartTick | null>(null);
  const lastChartDiagnosticRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Waiting for live data...');

  const theme = useMemo(() => ({
    bg: darkMode ? '#0f1218' : '#ffffff',
    text: darkMode ? '#d8dde7' : '#1f2937',
    grid: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)',
    border: darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)',
    up: '#22c55e',
    down: '#ef4444',
    volumeUp: 'rgba(34,197,94,0.45)',
    volumeDown: 'rgba(239,68,68,0.45)',
  }), [darkMode]);

  const title = useMemo(() => {
    if (selection.kind === 'index') return selection.symbol;
    const side = selection.optionType || 'CE';
    const strike = selection.strike ? ` ${selection.strike}` : '';
    return `${selection.symbol}${strike} ${side}`.trim();
  }, [selection]);

  const persistHistory = (cacheKey: string, candles: StoredCandle[]) => {
    if (!cacheKey || candles.length === 0) return;
    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(async () => {
      try {
        const parts = cacheKey.split(':');
        const [, symbol, securityId, exchangeSegment, instrument, , , timeframe, date] = parts;
        await db.chartHistory.bulkPut([{
          cacheKey,
          symbol,
          securityId,
          exchangeSegment: exchangeSegment as 'IDX_I' | 'NSE_FNO',
          instrument: instrument as 'INDEX' | 'OPTIDX',
          timeframe: timeframe as ChartInterval,
          date,
          candles,
          lastUpdated: Date.now(),
        }]);
      } catch {
        // Silent cache persistence failures should not block live charting.
      }
    }, 1500);
  };

  const logChartUpdated = (candle: StoredCandle, tick: ChartTick) => {
    if (!IS_DEV) return;
    const now = Date.now();
    if (now - lastChartDiagnosticRef.current < 2000) return;
    lastChartDiagnosticRef.current = now;
    console.log('[Market] chart updated', {
      chartKey: tick.chartKey,
      token: tick.securityId,
      close: candle.close,
      candleTime: candle.time,
      candles: candlesRef.current.length,
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: Math.max(containerRef.current.clientWidth, 320),
      height,
      layout: {
        background: { type: ColorType.Solid, color: theme.bg },
        textColor: theme.text,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: theme.grid, style: LineStyle.Dotted },
        horzLines: { color: theme.grid, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#f59e0b', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#f59e0b' },
        horzLine: { color: '#f59e0b', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#f59e0b' },
      },
      rightPriceScale: {
        borderColor: theme.border,
        scaleMargins: { top: 0.08, bottom: 0.2 },
      },
      timeScale: {
        borderColor: theme.border,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: theme.up,
      downColor: theme.down,
      borderUpColor: theme.up,
      borderDownColor: theme.down,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });

    const volumeSeries = chart.addHistogramSeries({
      color: theme.volumeUp,
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
      borderColor: theme.border,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: Math.max(containerRef.current.clientWidth, 320), height });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height, theme]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { background: { type: ColorType.Solid, color: theme.bg }, textColor: theme.text },
      grid: { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
      rightPriceScale: { borderColor: theme.border },
    });
  }, [theme]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    if (!chart || !candleSeries || !volumeSeries) return;

    const requestId = ++loadSeqRef.current;
    const dateKey = buildTradingDateKey();
    const cacheKey = buildCacheKey(selection, interval, dateKey);
    activeCacheKeyRef.current = cacheKey;
    setLoading(true);
    setMessage('Loading saved candles...');

    const applySnapshot = (candles: StoredCandle[]) => {
      candlesRef.current = candles;
      candleSeries.setData(candles.map(toSeriesCandle));
      volumeSeries.setData(candles.map((row) => toVolumePoint(row, theme.volumeUp, theme.volumeDown)));
      if (candles.length > 0) {
        chart.timeScale().fitContent();
      }
    };

    const flushBufferedTicks = () => {
      const bufferedTicks = [...pendingTicksRef.current];
      pendingTicksRef.current = [];
      bufferedTicks.forEach((tick) => applyTick(tick));
    };

    const applyTick = (tick: ChartTick) => {
      if (selection.chartKey !== tick.chartKey) return;
      if (requestId !== loadSeqRef.current) return;

      const price = clampNumber(tick.price);
      if (price <= 0) return;

      const tickTimeMs = tick.ltt ? tick.ltt * 1000 : new Date(tick.timestamp).getTime();
      const bucketStartMs = alignTimestamp(tickTimeMs, interval);
      const bucketStart = Math.floor(bucketStartMs / 1000) as UTCTimestamp;
      const tickVolume = clampNumber(tick.lastTradedQty ?? tick.volume ?? 0);
      const currentCandles = candlesRef.current;
      const last = currentCandles[currentCandles.length - 1];

      if (!last) {
        const first: StoredCandle = {
          time: new Date(bucketStartMs).toISOString(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: tickVolume,
        };
        candlesRef.current = [first];
        candleSeries.update(toSeriesCandle(first));
        volumeSeries.update(toVolumePoint(first, theme.volumeUp, theme.volumeDown));
        logChartUpdated(first, tick);
        chart.timeScale().fitContent();
        setLoading(false);
        setMessage('Waiting for live data...');
        persistHistory(cacheKey, candlesRef.current);
        return;
      }

      const lastBucket = Math.floor(new Date(last.time).getTime() / 1000);

      if (lastBucket === bucketStart) {
        const updated: StoredCandle = {
          ...last,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
          close: price,
          volume: last.volume + tickVolume,
        };
        candlesRef.current[currentCandles.length - 1] = updated;
        candleSeries.update(toSeriesCandle(updated));
        volumeSeries.update(toVolumePoint(updated, theme.volumeUp, theme.volumeDown));
        logChartUpdated(updated, tick);
        setLoading(false);
        persistHistory(cacheKey, candlesRef.current);
        return;
      }

      if (lastBucket < bucketStart) {
        const nextCandle: StoredCandle = {
          time: new Date(bucketStartMs).toISOString(),
          open: last.close,
          high: price,
          low: price,
          close: price,
          volume: tickVolume,
        };
        candlesRef.current = [...currentCandles.slice(-999), nextCandle];
        candleSeries.update(toSeriesCandle(nextCandle));
        volumeSeries.update(toVolumePoint(nextCandle, theme.volumeUp, theme.volumeDown));
        logChartUpdated(nextCandle, tick);
        chart.timeScale().fitContent();
        setLoading(false);
        persistHistory(cacheKey, candlesRef.current);
      }
    };

    const loadHistory = async () => {
      try {
        if (selection.kind === 'option' && !selection.securityId) {
          candlesRef.current = [];
          candleSeries.setData([]);
          volumeSeries.setData([]);
          setMessage('Waiting for live data...');
          setLoading(false);
          return;
        }

        const memoryHistory = historyCacheRef.current.get(cacheKey);
        if (memoryHistory && memoryHistory.length > 0) {
          applySnapshot(memoryHistory);
          setMessage('Loading backend history...');
        } else {
          const localHistory = await db.chartHistory.get(cacheKey);
          if (requestId !== loadSeqRef.current) return;
          if (localHistory?.candles?.length) {
            const normalized = localHistory.candles.map((row) => toStoredCandle(row as ChartCandle));
            historyCacheRef.current.set(cacheKey, normalized);
            applySnapshot(normalized);
            setMessage('Loading backend history...');
          }
        }

        const history = await api.getChartHistory(
          selection.kind === 'index'
            ? {
                symbol: selection.symbol,
                timeframe: interval,
                exchangeSegment: 'IDX_I',
                instrument: 'INDEX',
                date: dateKey,
              }
            : {
                securityId: selection.securityId,
                timeframe: interval,
                exchangeSegment: selection.exchangeSegment || 'NSE_FNO',
                instrument: selection.instrument || 'OPTIDX',
                date: dateKey,
              }
        );

        if (requestId !== loadSeqRef.current) return;

        const rows = Array.isArray(history) ? history : [];
        const candleData = rows
          .filter((row: ChartCandle) => row && row.time && row.open !== undefined)
          .map((row: ChartCandle) => toStoredCandle(row))
          .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        if (candleData.length > 0) {
          historyCacheRef.current.set(cacheKey, candleData);
          applySnapshot(candleData);
          await db.chartHistory.bulkPut([{
            cacheKey,
            symbol: selection.symbol,
            securityId: selection.securityId || '',
            exchangeSegment: selection.exchangeSegment || (selection.kind === 'index' ? 'IDX_I' : 'NSE_FNO'),
            instrument: selection.instrument || (selection.kind === 'index' ? 'INDEX' : 'OPTIDX'),
            timeframe: interval,
            date: dateKey,
            candles: candleData,
            lastUpdated: Date.now(),
          }]);
          setMessage('Waiting for live data...');
        } else if (!historyCacheRef.current.get(cacheKey)?.length) {
          candlesRef.current = [];
          candleSeries.setData([]);
          volumeSeries.setData([]);
          setMessage('Waiting for live data...');
        }

        flushBufferedTicks();
        setLoading(false);
      } catch {
        if (requestId !== loadSeqRef.current) return;
        const cached = historyCacheRef.current.get(cacheKey);
        if (cached && cached.length > 0) {
          applySnapshot(cached);
        }
        setMessage('Waiting for live data...');
        flushBufferedTicks();
        setLoading(false);
      }
    };

    void loadHistory();

    return () => {
      pendingTicksRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, selection.chartKey, selection.exchangeSegment, selection.instrument, selection.kind, selection.securityId, selection.symbol, theme.volumeDown, theme.volumeUp]);

  useEffect(() => {
    if (!liveTick) return;
    if (liveTick.chartKey !== selection.chartKey) return;

    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volumeSeries || !chart) return;

    const apply = (tickToApply: ChartTick) => {
      const price = clampNumber(tickToApply.price);
      if (price <= 0) return;

      const tickTimeMs = tickToApply.ltt ? tickToApply.ltt * 1000 : new Date(tickToApply.timestamp).getTime();
      const bucketStartMs = alignTimestamp(tickTimeMs, interval);
      const bucketStart = Math.floor(bucketStartMs / 1000) as UTCTimestamp;
      const tickVolume = clampNumber(tickToApply.lastTradedQty ?? tickToApply.volume ?? 0);
      const currentCandles = candlesRef.current;
      const last = currentCandles[currentCandles.length - 1];

      if (!last) {
        const first: StoredCandle = {
          time: new Date(bucketStartMs).toISOString(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: tickVolume,
        };
        candlesRef.current = [first];
        candleSeries.update(toSeriesCandle(first));
        volumeSeries.update(toVolumePoint(first, theme.volumeUp, theme.volumeDown));
        logChartUpdated(first, tickToApply);
        chart.timeScale().fitContent();
        setLoading(false);
        setMessage('Waiting for live data...');
        persistHistory(activeCacheKeyRef.current, candlesRef.current);
        return;
      }

      const lastBucket = Math.floor(new Date(last.time).getTime() / 1000);

      if (lastBucket === bucketStart) {
        const updated: StoredCandle = {
          ...last,
          high: Math.max(last.high, price),
          low: Math.min(last.low, price),
          close: price,
          volume: last.volume + tickVolume,
        };
        candlesRef.current[currentCandles.length - 1] = updated;
        candleSeries.update(toSeriesCandle(updated));
        volumeSeries.update(toVolumePoint(updated, theme.volumeUp, theme.volumeDown));
        logChartUpdated(updated, tickToApply);
        persistHistory(activeCacheKeyRef.current, candlesRef.current);
        return;
      }

      if (lastBucket < bucketStart) {
        const nextCandle: StoredCandle = {
          time: new Date(bucketStartMs).toISOString(),
          open: last.close,
          high: price,
          low: price,
          close: price,
          volume: tickVolume,
        };
        candlesRef.current = [...currentCandles.slice(-999), nextCandle];
        candleSeries.update(toSeriesCandle(nextCandle));
        volumeSeries.update(toVolumePoint(nextCandle, theme.volumeUp, theme.volumeDown));
        logChartUpdated(nextCandle, tickToApply);
        chart.timeScale().fitContent();
        persistHistory(activeCacheKeyRef.current, candlesRef.current);
      }
    };

    if (loading) {
      pendingTicksRef.current.push(liveTick);
      return;
    }

    pendingLiveTickRef.current = liveTick;
    if (liveTickFrameRef.current === null) {
      liveTickFrameRef.current = window.requestAnimationFrame(() => {
        liveTickFrameRef.current = null;
        const nextTick = pendingLiveTickRef.current;
        pendingLiveTickRef.current = null;
        if (!nextTick) return;
        if (nextTick.chartKey !== selection.chartKey) return;
        apply(nextTick);
      });
    }
  }, [interval, liveTick, loading, selection.chartKey, theme.volumeDown, theme.volumeUp]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
      }
      if (liveTickFrameRef.current !== null) {
        window.cancelAnimationFrame(liveTickFrameRef.current);
      }
    };
  }, []);

  const isEmpty = !loading && candlesRef.current.length === 0;

  return (
    <div className="premium-card premium-gradient-line flex w-full flex-col overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.045]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="premium-label tracking-[0.32em]">Lightweight Charts</p>
            <h3 className="truncate text-base font-black tracking-[-0.03em] text-slate-900 dark:text-white">{title}</h3>
          </div>
          <span className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-white/10 dark:bg-white/[0.06]">{selection.kind === 'index' ? 'Index' : 'Option Premium'}</span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => onIntervalChange?.(tf)}
              className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                tf === interval ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/[0.055] dark:text-slate-400 dark:hover:bg-white/10'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative" style={{ height }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {(loading || isEmpty) && (
          <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none">
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-center shadow-lg backdrop-blur-sm dark:border-white/10 dark:bg-[#0c1118]/80">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

LWChart.displayName = 'LWChart';
export default LWChart;
