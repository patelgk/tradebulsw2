/**
 * LWChart — Lightweight Charts v4 candlestick chart component
 * Replaces both the custom SVG CandleChart and dead TradingViewWidget.
 *
 * Features:
 * - Real-time candle updates from currentPrice prop
 * - Timeframes: 1m 3m 5m 15m 30m 1h 1D
 * - Fetches historical data from /api/market/history/:symbol
 * - Caches to Dexie IndexedDB for instant display
 * - Dark/light theme aware
 * - No external symbol dependencies (works with any symbol the backend supports)
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  ColorType,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import { db } from '../db.client';

interface Props {
  symbol: string;
  interval?: string;
  currentPrice?: number;
  darkMode?: boolean;
  height?: number;
}

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h', '1D'];

// Align timestamp to interval boundary
function alignToInterval(tsMs: number, intervalMs: number): number {
  return Math.floor(tsMs / intervalMs) * intervalMs;
}

function intervalToMs(tf: string): number {
  const unit = tf.slice(-1);
  const val  = parseInt(tf) || 1;
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'D') return 24 * 60 * 60 * 1000;
  return 5 * 60 * 1000;
}

// Convert ISO string to Unix seconds (LW Charts uses Unix time)
function toUnixSec(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

const LWChart = memo(({ symbol, interval = '5m', currentPrice, darkMode = true, height = 420 }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const seriesRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const candlesRef   = useRef<CandlestickData[]>([]);
  const [selectedTf, setSelectedTf] = useState(interval);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const bg     = darkMode ? '#0f0f0f' : '#ffffff';
  const text   = darkMode ? '#c9d1d9' : '#24292f';
  const grid   = darkMode ? '#1e1e1e' : '#f0f0f0';
  const border = darkMode ? '#2d2d2d' : '#e0e0e0';

  // ── Create / destroy chart ─────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height,
      layout: {
        background:  { type: ColorType.Solid, color: bg },
        textColor:   text,
        fontFamily:  'Inter, system-ui, sans-serif',
        fontSize:    11,
      },
      grid: {
        vertLines:   { color: grid, style: LineStyle.Dotted },
        horzLines:   { color: grid, style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#ec5b13', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#ec5b13' },
        horzLine: { color: '#ec5b13', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#ec5b13' },
      },
      rightPriceScale: {
        borderColor: border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor:       border,
        timeVisible:       true,
        secondsVisible:    false,
        fixLeftEdge:       true,
        fixRightEdge:      true,
      },
      watermark: { visible: false },
      handleScroll: true,
      handleScale:  true,
    });

    const series = chart.addCandlestickSeries({
      upColor:          '#26a69a',
      downColor:        '#ef5350',
      borderUpColor:    '#26a69a',
      borderDownColor:  '#ef5350',
      wickUpColor:      '#26a69a',
      wickDownColor:    '#ef5350',
    });

    chartRef.current  = chart;
    seriesRef.current = series;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      seriesRef.current = null;
    };
  }, [bg, text, grid, border, height]);

  // ── Update theme when darkMode changes ────────────────────────────────────
  useEffect(() => {
    chartRef.current?.applyOptions({
      layout: { background: { type: ColorType.Solid, color: bg }, textColor: text },
      grid:   { vertLines: { color: grid }, horzLines: { color: grid } },
    });
  }, [bg, text, grid]);

  // ── Fetch historical data ─────────────────────────────────────────────────
  const fetchData = useCallback(async (sym: string, tf: string) => {
    if (!seriesRef.current) return;
    setLoading(true);
    setError('');
    candlesRef.current = [];

    // 1. Load from Dexie cache first (instant display)
    try {
      const cached = await db.marketHistorical.get([sym, tf]);
      if (cached?.candles?.length) {
        const data: CandlestickData[] = cached.candles.map((c: any) => ({
          time:  toUnixSec(c.time) as Time,
          open:  c.open, high: c.high, low: c.low, close: c.close,
        }));
        data.sort((a, b) => (a.time as number) - (b.time as number));
        seriesRef.current?.setData(data);
        candlesRef.current = data as any;
        setLoading(false);
        chartRef.current?.timeScale().fitContent();
      }
    } catch { /* silent */ }

    // 2. Fetch fresh from API
    try {
      const r = await fetch(`/api/market/history/${encodeURIComponent(sym)}?interval=${tf}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw: any[] = await r.json();
      if (!Array.isArray(raw) || raw.length === 0) throw new Error('Empty response');

      const data: CandlestickData[] = raw
        .filter(c => c.open && c.high && c.low && c.close)
        .map(c => ({
          time:  toUnixSec(c.time) as Time,
          open:  +c.open, high: +c.high, low: +c.low, close: +c.close,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));

      seriesRef.current?.setData(data);
      candlesRef.current = data as any;
      chartRef.current?.timeScale().fitContent();

      // Save to cache
      await db.marketHistorical.put({ symbol: sym, interval: tf, candles: raw, lastUpdated: Date.now() });
    } catch (err: any) {
      if (!candlesRef.current.length) setError(err.message || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(symbol, selectedTf);
  }, [symbol, selectedTf, fetchData]);

  // ── Real-time price update ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentPrice || !seriesRef.current || candlesRef.current.length === 0) return;
    const tfMs  = intervalToMs(selectedTf);
    const nowMs = Date.now();
    const aligned = alignToInterval(nowMs, tfMs);
    const time    = Math.floor(aligned / 1000) as Time;

    const candles = candlesRef.current;
    const last    = candles[candles.length - 1];

    if ((last?.time as number) === (time as number)) {
      // Update existing candle
      const updated: CandlestickData = {
        time,
        open:  last.open,
        high:  Math.max(last.high, currentPrice),
        low:   Math.min(last.low,  currentPrice),
        close: currentPrice,
      };
      seriesRef.current.update(updated);
      candlesRef.current[candles.length - 1] = updated as any;
    } else if ((last?.time as number) < (time as number)) {
      // New candle
      const newCandle: CandlestickData = {
        time,
        open:  last?.close ?? currentPrice,
        high:  currentPrice,
        low:   currentPrice,
        close: currentPrice,
      };
      seriesRef.current.update(newCandle);
      candlesRef.current = [...candles.slice(-499), newCandle as any];
    }
  }, [currentPrice, selectedTf]);

  return (
    <div className="flex flex-col w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
      {/* Timeframe selector */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            onClick={() => setSelectedTf(tf)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              selectedTf === tf
                ? 'bg-primary text-white shadow'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {tf}
          </button>
        ))}
        <button
          onClick={() => fetchData(symbol, selectedTf)}
          className="ml-auto text-[10px] text-slate-400 hover:text-primary transition-colors px-2 py-1 rounded"
          title="Refresh chart"
        >
          ↺
        </button>
      </div>

      {/* Chart container */}
      <div className="relative" style={{ height }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-b-2xl">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
});

LWChart.displayName = 'LWChart';
export default LWChart;
