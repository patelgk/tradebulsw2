/**
 * OptionChain — ATM-centered, independently scrolling option chain
 *
 * Features:
 * - Shows ATM ± 10 strikes by default, dynamically loads more on scroll
 * - Own scroll container (never scrolls the page)
 * - Sticky header + sticky ATM row
 * - CE / PE click → fires onStrikeSelect callback for premium chart
 * - OI color bars for visual depth
 * - PCR display
 * - Greeks (IV, Delta) shown when available
 */

import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { OptionStrike, SymbolMarketData } from '../types';

interface Props {
  symbol: string;
  data: SymbolMarketData | null;
  onStrikeSelect?: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
  onExpiryChange?: (expiry: string) => void;
  onTrade?: (strike: number, type: 'CE' | 'PE', action: 'BUY' | 'SELL', ltp: number) => void;
  onAddToWatchlist?: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
}

function fmtOI(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

function fmtOIChange(n: number): React.ReactNode {
  const cls = n > 0 ? 'text-emerald-500' : n < 0 ? 'text-red-500' : 'text-slate-400';
  return <span className={`text-[9px] font-bold ${cls}`}>{n > 0 ? '+' : ''}{fmtOI(n)}</span>;
}

function fmtVol(n?: number): string {
  if (!n) return '--';
  if (n >= 1e7) return (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

const ROW_HEIGHT = 74;
const VIRTUAL_OVERSCAN = 6;

const OptionChainRow = memo(({
  row, isATM, isSelected, spotPrice, maxCeOI, maxPeOI, onSelect, onTrade, onAddToWatchlist,
}: {
  row: OptionStrike;
  isATM: boolean;
  isSelected: boolean;
  spotPrice: number;
  maxCeOI: number;
  maxPeOI: number;
  onSelect: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
  onTrade: (strike: number, type: 'CE' | 'PE', action: 'BUY' | 'SELL', ltp: number) => void;
  onAddToWatchlist: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
}) => {
  const isITM_CE = row.strike < spotPrice;
  const isITM_PE = row.strike > spotPrice;
  const ceBarW = maxCeOI > 0 ? Math.round((row.ce_oi / maxCeOI) * 100) : 0;
  const peBarW = maxPeOI > 0 ? Math.round((row.pe_oi / maxPeOI) * 100) : 0;

  return (
    <tr
      style={{ height: ROW_HEIGHT }}
      className={`
        border-b border-slate-100 dark:border-white/5 transition-colors
        ${isATM ? 'bg-primary/10 dark:bg-primary/10 sticky-atm' : ''}
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
        ${!isATM && !isSelected ? 'hover:bg-slate-50 dark:hover:bg-white/5' : ''}
      `}
    >
      {/* CE OI Change */}
      <td className={`px-2 py-1.5 text-center text-[10px] ${isITM_CE ? 'opacity-50' : ''}`}>
        {fmtOIChange(row.ce_oi_change)}
      </td>

      {/* CE OI with bar */}
      <td className={`px-2 py-1.5 text-right relative ${isITM_CE ? 'opacity-50' : ''}`}>
        <div className="absolute inset-y-0 right-0 bg-red-200/30 dark:bg-red-500/10 transition-all"
          style={{ width: `${ceBarW}%` }} />
        <span className="relative text-[10px] font-mono">{fmtOI(row.ce_oi)}</span>
      </td>

      {/* CE LTP */}
      <td
        className={`px-2 py-1.5 text-right cursor-pointer group ${isITM_CE ? 'opacity-60' : ''}`}
        onClick={() => onSelect(row.strike, 'CE', row.ce_ltp)}
      >
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 group-hover:text-primary transition-colors">
            {row.ce_ltp.toFixed(2)}
          </span>
          <span className="text-[8px] text-slate-400">Vol {fmtVol(row.ce_volume)}</span>
          {row.ce_iv !== undefined && (
            <span className="text-[8px] text-slate-400">{row.ce_iv.toFixed(1)}%</span>
          )}
          <div className="mt-1 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAddToWatchlist(row.strike, 'CE', row.ce_ltp);
              }}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] font-black text-slate-500 shadow-sm hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
            >
              +WL
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTrade(row.strike, 'CE', 'BUY', row.ce_ltp);
              }}
              className="rounded-md bg-red-500 px-1.5 py-0.5 text-[8px] font-black text-white shadow-sm shadow-red-500/20 hover:bg-red-600"
            >
              Buy
            </button>
          </div>
        </div>
      </td>

      {/* Strike */}
      <td className={`px-3 py-1.5 text-center font-bold text-[11px] ${isATM ? 'text-primary' : 'text-slate-600 dark:text-slate-300'}`}>
        <div className="flex flex-col items-center">
          <span>{row.strike}</span>
          {isATM && <span className="text-[8px] text-primary font-black uppercase tracking-wider">ATM</span>}
        </div>
      </td>

      {/* PE LTP */}
      <td
        className={`px-2 py-1.5 text-left cursor-pointer group ${isITM_PE ? 'opacity-60' : ''}`}
        onClick={() => onSelect(row.strike, 'PE', row.pe_ltp)}
      >
        <div className="flex flex-col items-start">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:text-primary transition-colors">
            {row.pe_ltp.toFixed(2)}
          </span>
          <span className="text-[8px] text-slate-400">Vol {fmtVol(row.pe_volume)}</span>
          {row.pe_iv !== undefined && (
            <span className="text-[8px] text-slate-400">{row.pe_iv.toFixed(1)}%</span>
          )}
          <div className="mt-1 flex justify-start gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAddToWatchlist(row.strike, 'PE', row.pe_ltp);
              }}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[8px] font-black text-slate-500 shadow-sm hover:border-primary hover:text-primary dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
            >
              +WL
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onTrade(row.strike, 'PE', 'BUY', row.pe_ltp);
              }}
              className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-600"
            >
              Buy
            </button>
          </div>
        </div>
      </td>

      {/* PE OI with bar */}
      <td className={`px-2 py-1.5 text-left relative ${isITM_PE ? 'opacity-50' : ''}`}>
        <div className="absolute inset-y-0 left-0 bg-emerald-200/30 dark:bg-emerald-500/10 transition-all"
          style={{ width: `${peBarW}%` }} />
        <span className="relative text-[10px] font-mono">{fmtOI(row.pe_oi)}</span>
      </td>

      {/* PE OI Change */}
      <td className={`px-2 py-1.5 text-center text-[10px] ${isITM_PE ? 'opacity-50' : ''}`}>
        {fmtOIChange(row.pe_oi_change)}
      </td>
    </tr>
  );
}, (prev, next) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  
  // Quick checks for selection/ATM changes
  if (prev.isATM !== next.isATM || prev.isSelected !== next.isSelected) return false;
  if (prev.spotPrice !== next.spotPrice) return false;
  if (prev.maxCeOI !== next.maxCeOI || prev.maxPeOI !== next.maxPeOI) return false;
  
  // Check if row data changed (LTP, OI, volume, change, etc.)
  const rowDataChanged = 
    prev.row.strike !== next.row.strike ||
    prev.row.ce_ltp !== next.row.ce_ltp ||
    prev.row.ce_oi !== next.row.ce_oi ||
    prev.row.ce_oi_change !== next.row.ce_oi_change ||
    prev.row.ce_volume !== next.row.ce_volume ||
    prev.row.ce_change !== next.row.ce_change ||
    prev.row.ce_change_pct !== next.row.ce_change_pct ||
    prev.row.ce_iv !== next.row.ce_iv ||
    prev.row.pe_ltp !== next.row.pe_ltp ||
    prev.row.pe_oi !== next.row.pe_oi ||
    prev.row.pe_oi_change !== next.row.pe_oi_change ||
    prev.row.pe_volume !== next.row.pe_volume ||
    prev.row.pe_change !== next.row.pe_change ||
    prev.row.pe_change_pct !== next.row.pe_change_pct ||
    prev.row.pe_iv !== next.row.pe_iv;
  
  return !rowDataChanged; // Return true if NO changes (skip re-render)
});
OptionChainRow.displayName = 'OptionChainRow';

const OptionChain = memo(({ symbol, data, onStrikeSelect, onExpiryChange, onTrade, onAddToWatchlist }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedStrike, setSelectedStrike] = useState<{ strike: number; type: 'CE' | 'PE' } | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(420);
  const [hasCentered, setHasCentered]       = useState(false);
  const scrollFrameRef = useRef<number | null>(null);

  const spotPrice    = data?.price    ?? 0;
  const optionChain  = data?.optionChain ?? [];
  const expiries     = data?.expiries   ?? [];
  const expiry       = data?.expiry     ?? '';

  // Sort strikes ascending
  const sortedStrikes = useMemo(() =>
    [...optionChain].sort((a, b) => a.strike - b.strike),
    [optionChain]
  );

  // Find ATM index
  const atmIndex = useMemo(() => {
    if (!sortedStrikes.length || !spotPrice) return Math.floor(sortedStrikes.length / 2);
    let closest = 0;
    let minDiff = Infinity;
    sortedStrikes.forEach((row, i) => {
      const d = Math.abs(row.strike - spotPrice);
      if (d < minDiff) { minDiff = d; closest = i; }
    });
    return closest;
  }, [sortedStrikes, spotPrice]);

  useEffect(() => {
    if (!sortedStrikes.length) return;
    setHasCentered(false);
  }, [atmIndex, sortedStrikes.length]);

  // Center scroll on ATM after data loads
  useEffect(() => {
    if (hasCentered || !scrollRef.current || !sortedStrikes.length) return;
    const timer = window.setTimeout(() => {
      if (!scrollRef.current) return;
      const nextTop = Math.max(0, atmIndex * ROW_HEIGHT - scrollRef.current.clientHeight / 2 + ROW_HEIGHT / 2);
      scrollRef.current.scrollTo({ top: nextTop, behavior: 'smooth' });
      setScrollTop(nextTop);
      setHasCentered(true);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [atmIndex, hasCentered, sortedStrikes.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      if (!scrollRef.current) return;
      setScrollTop(scrollRef.current.scrollTop);
      setViewportHeight(scrollRef.current.clientHeight || 420);
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) setViewportHeight(el.clientHeight || 420);
    return () => {
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  const virtualRange = useMemo(() => {
    if (!sortedStrikes.length) return { start: 0, end: -1, top: 0, bottom: 0 };
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VIRTUAL_OVERSCAN);
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;
    const end = Math.min(sortedStrikes.length - 1, start + visibleCount - 1);
    return {
      start,
      end,
      top: start * ROW_HEIGHT,
      bottom: Math.max(0, (sortedStrikes.length - end - 1) * ROW_HEIGHT),
    };
  }, [scrollTop, sortedStrikes.length, viewportHeight]);

  const visibleStrikes = useMemo(
    () => sortedStrikes.slice(virtualRange.start, virtualRange.end + 1),
    [sortedStrikes, virtualRange.end, virtualRange.start]
  );

  // PCR
  const { totalCeOI, totalPeOI, pcr } = useMemo(() => {
    const tce = visibleStrikes.reduce((s, r) => s + r.ce_oi, 0);
    const tpe = visibleStrikes.reduce((s, r) => s + r.pe_oi, 0);
    return { totalCeOI: tce, totalPeOI: tpe, pcr: tce > 0 ? +(tpe / tce).toFixed(2) : 0 };
  }, [visibleStrikes]);

  const maxCeOI = useMemo(() => Math.max(...visibleStrikes.map(r => r.ce_oi), 1), [visibleStrikes]);
  const maxPeOI = useMemo(() => Math.max(...visibleStrikes.map(r => r.pe_oi), 1), [visibleStrikes]);

  const sentiment = pcr > 1.2 ? 'Bullish' : pcr < 0.8 ? 'Bearish' : 'Neutral';
  const sentimentColor = sentiment === 'Bullish' ? 'text-emerald-500' : sentiment === 'Bearish' ? 'text-red-500' : 'text-amber-500';

  const handleSelect = useCallback((strike: number, type: 'CE' | 'PE', ltp: number) => {
    setSelectedStrike({ strike, type });
    onStrikeSelect?.(strike, type, ltp);
  }, [onStrikeSelect]);

  const handleTrade = useCallback((strike: number, type: 'CE' | 'PE', action: 'BUY' | 'SELL', ltp: number) => {
    onTrade?.(strike, type, action, ltp);
  }, [onTrade]);

  const handleAddToWatchlist = useCallback((strike: number, type: 'CE' | 'PE', ltp: number) => {
    onAddToWatchlist?.(strike, type, ltp);
  }, [onAddToWatchlist]);

  if (!data) {
    return (
      <div className="premium-card premium-gradient-line flex h-80 flex-col gap-3 p-4">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200/80 dark:bg-white/10" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }).map((_, index) => (
            <div key={index} className="h-8 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="premium-card premium-gradient-line flex h-full flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.045]">
        <div className="flex items-center gap-3">
          {/* Expiry selector */}
          {expiries.length > 0 && (
            <select
              value={expiry}
              onChange={e => onExpiryChange?.(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none transition-colors focus:border-primary dark:border-white/20 dark:bg-white/10 dark:text-slate-200"
            >
              {expiries.map(exp => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          )}
          <span className="text-[10px] text-slate-400 font-mono">
            Spot: <strong className="text-slate-700 dark:text-slate-200">{spotPrice.toFixed(2)}</strong>
          </span>
        </div>

        {/* PCR */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">PCR:</span>
          <span className={`text-[11px] font-black ${sentimentColor}`}>{pcr}</span>
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
            sentiment === 'Bullish' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
            sentiment === 'Bearish' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
            'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
          }`}>{sentiment}</span>
        </div>
      </div>

      {/* Table header — sticky */}
      <div className="flex-shrink-0 border-b border-slate-200/80 bg-slate-100/80 dark:border-white/10 dark:bg-white/[0.045]">
        <table className="w-full text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-center w-[10%]">Chg</th>
              <th className="px-2 py-1.5 text-right w-[14%] text-red-500">CE OI</th>
              <th className="px-2 py-1.5 text-right w-[14%] text-red-500">CE LTP</th>
              <th className="px-2 py-1.5 text-center w-[12%]">Strike</th>
              <th className="px-2 py-1.5 text-left w-[14%] text-emerald-500">PE LTP</th>
              <th className="px-2 py-1.5 text-left w-[14%] text-emerald-500">PE OI</th>
              <th className="px-2 py-1.5 text-center w-[10%]">Chg</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable body — independent scroll */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 200 }}
      >
        {sortedStrikes.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-xs">
            {data?.dataSource === 'Stale'
              ? 'Waiting for market data...'
              : 'Option chain loading...'}
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {virtualRange.start > 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-1 text-[10px] text-slate-400">
                    ↑ {virtualRange.start} more strikes above
                  </td>
                </tr>
              )}
              {virtualRange.top > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={7} style={{ height: virtualRange.top, padding: 0 }} />
                </tr>
              )}
              {visibleStrikes.map((row, i) => {
                const globalIndex = virtualRange.start + i;
                const isATM = globalIndex === atmIndex;
                const isSelected = selectedStrike?.strike === row.strike;
                return (
                  <OptionChainRow
                    key={`${expiry}:${row.strike}:CE:${row.ce_security_id || 'na'}:PE:${row.pe_security_id || 'na'}`}
                    row={row}
                    isATM={isATM}
                    isSelected={isSelected}
                    spotPrice={spotPrice}
                    maxCeOI={maxCeOI}
                    maxPeOI={maxPeOI}
                    onSelect={handleSelect}
                    onTrade={handleTrade}
                    onAddToWatchlist={handleAddToWatchlist}
                  />
                );
              })}
              {virtualRange.bottom > 0 && (
                <tr aria-hidden="true">
                  <td colSpan={7} style={{ height: virtualRange.bottom, padding: 0 }} />
                </tr>
              )}
              {virtualRange.end < sortedStrikes.length - 1 && (
                <tr>
                  <td colSpan={7} className="text-center py-1 text-[10px] text-slate-400">
                    ↓ {sortedStrikes.length - 1 - virtualRange.end} more strikes below
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer: total OI */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-3 py-2 text-[9px] text-slate-400 dark:border-white/10 dark:bg-white/[0.045]">
        <span>Total CE OI: <strong className="text-red-500">{fmtOI(totalCeOI)}</strong></span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          {data.dataSource === 'Dhan' ? '🟢 Live' : '🔴 Stale'}
        </span>
        <span>Total PE OI: <strong className="text-emerald-500">{fmtOI(totalPeOI)}</strong></span>
      </div>
    </div>
  );
});

OptionChain.displayName = 'OptionChain';
export default OptionChain;
