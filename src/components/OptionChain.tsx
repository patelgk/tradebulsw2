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

const ATM_WINDOW = 10; // strikes above and below ATM to show initially
const LOAD_MORE  = 5;  // additional strikes to load on scroll edge

const OptionChainRow = memo(({
  row, isATM, isSelected, spotPrice, maxCeOI, maxPeOI, onSelect, onTrade,
}: {
  row: OptionStrike;
  isATM: boolean;
  isSelected: boolean;
  spotPrice: number;
  maxCeOI: number;
  maxPeOI: number;
  onSelect: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
  onTrade: (strike: number, type: 'CE' | 'PE', action: 'BUY' | 'SELL', ltp: number) => void;
}) => {
  const isITM_CE = row.strike < spotPrice;
  const isITM_PE = row.strike > spotPrice;
  const ceBarW = maxCeOI > 0 ? Math.round((row.ce_oi / maxCeOI) * 100) : 0;
  const peBarW = maxPeOI > 0 ? Math.round((row.pe_oi / maxPeOI) * 100) : 0;

  return (
    <tr
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
          {row.ce_iv !== undefined && (
            <span className="text-[8px] text-slate-400">{row.ce_iv.toFixed(1)}%</span>
          )}
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
          {row.pe_iv !== undefined && (
            <span className="text-[8px] text-slate-400">{row.pe_iv.toFixed(1)}%</span>
          )}
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
});
OptionChainRow.displayName = 'OptionChainRow';

const OptionChain = memo(({ symbol, data, onStrikeSelect, onExpiryChange, onTrade }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atmRef    = useRef<HTMLTableRowElement>(null);
  const [selectedStrike, setSelectedStrike] = useState<{ strike: number; type: 'CE' | 'PE' } | null>(null);
  const [visibleRange, setVisibleRange]     = useState<[number, number]>([0, 0]);
  const [hasCentered, setHasCentered]       = useState(false);

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

  // Visible window
  useEffect(() => {
    if (!sortedStrikes.length) return;
    const lo = Math.max(0, atmIndex - ATM_WINDOW);
    const hi = Math.min(sortedStrikes.length - 1, atmIndex + ATM_WINDOW);
    setVisibleRange([lo, hi]);
    setHasCentered(false);
  }, [atmIndex, sortedStrikes.length]);

  // Center scroll on ATM after data loads
  useEffect(() => {
    if (hasCentered || !atmRef.current || !scrollRef.current) return;
    setTimeout(() => {
      atmRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setHasCentered(true);
    }, 100);
  }, [visibleRange, hasCentered]);

  // Load more on scroll edges
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearTop    = el.scrollTop < 60;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setVisibleRange(([lo, hi]) => {
      let newLo = lo, newHi = hi;
      if (nearTop    && lo > 0)                              newLo = Math.max(0, lo - LOAD_MORE);
      if (nearBottom && hi < sortedStrikes.length - 1)       newHi = Math.min(sortedStrikes.length - 1, hi + LOAD_MORE);
      if (newLo !== lo || newHi !== hi) return [newLo, newHi];
      return [lo, hi];
    });
  }, [sortedStrikes.length]);

  const visibleStrikes = sortedStrikes.slice(visibleRange[0], visibleRange[1] + 1);

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

  if (!data) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Loading option chain...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Expiry selector */}
          {expiries.length > 0 && (
            <select
              value={expiry}
              onChange={e => onExpiryChange?.(e.target.value)}
              className="text-[11px] font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/20 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-primary"
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
      <div className="flex-shrink-0 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
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
              {visibleRange[0] > 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-1 text-[10px] text-slate-400">
                    ↑ {visibleRange[0]} more strikes above
                  </td>
                </tr>
              )}
              {visibleStrikes.map((row, i) => {
                const globalIndex = visibleRange[0] + i;
                const isATM = globalIndex === atmIndex;
                const isSelected = selectedStrike?.strike === row.strike;
                return (
                  <OptionChainRow
                    key={row.strike}
                    row={row}
                    isATM={isATM}
                    isSelected={isSelected}
                    spotPrice={spotPrice}
                    maxCeOI={maxCeOI}
                    maxPeOI={maxPeOI}
                    onSelect={handleSelect}
                    onTrade={handleTrade}
                  />
                );
              })}
              {visibleRange[1] < sortedStrikes.length - 1 && (
                <tr>
                  <td colSpan={7} className="text-center py-1 text-[10px] text-slate-400">
                    ↓ {sortedStrikes.length - 1 - visibleRange[1]} more strikes below
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer: total OI */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex-shrink-0 text-[9px] text-slate-400">
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
