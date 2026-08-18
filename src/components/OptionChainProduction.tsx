/**
 * OptionChainProduction — Clean, production-ready option chain component
 *
 * Complete rewrite from scratch with:
 * - Stable 231+ row rendering (no virtualization complexity)
 * - Real-time CE/PE LTP updates using correct securityId mapping
 * - Correct CE/PE row structure with all required fields
 * - Mobile-first responsive layout (desktop/tablet/mobile)
 * - Proper ATM detection from spot price with auto-scroll
 * - OI bars, OI change badges, volume display
 * - Clean TypeScript (no `any` types)
 * - Comprehensive error handling & state management
 */

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { OptionStrike, SymbolMarketData } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OptionChainProductionProps {
  symbol: string;
  data: SymbolMarketData | null;
  onStrikeSelect?: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
  onExpiryChange?: (expiry: string) => void;
  onTrade?: (strike: number, type: 'CE' | 'PE', action: 'BUY' | 'SELL', ltp: number) => void;
  onAddToWatchlist?: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
}

interface OptionChainRowProps {
  row: OptionStrike;
  isATM: boolean;
  spotPrice: number;
  ceBarWidth: number;
  peBarWidth: number;
  onSelect?: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
  onTrade?: (strike: number, type: 'CE' | 'PE', action: 'BUY' | 'SELL', ltp: number) => void;
  onAddToWatchlist?: (strike: number, type: 'CE' | 'PE', ltp: number) => void;
}

// ─── Formatting Utilities ────────────────────────────────────────────────────

/**
 * Format large numbers for OI display (Cr, L, k)
 */
function formatOI(value: number): string {
  if (value >= 1e7) return (value / 1e7).toFixed(1) + 'Cr';
  if (value >= 1e5) return (value / 1e5).toFixed(1) + 'L';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'k';
  return String(Math.round(value));
}

/**
 * Format volume for display
 */
function formatVolume(value: number | undefined): string {
  if (!value || value === 0) return '—';
  if (value >= 1e7) return (value / 1e7).toFixed(1) + 'Cr';
  if (value >= 1e5) return (value / 1e5).toFixed(1) + 'L';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'k';
  return String(Math.round(value));
}

/**
 * Format price with 2 decimals, handles very small values
 */
function formatPrice(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0.00';
  if (value < 0.01) return (value > 0 ? '0.01' : '0.00');
  return value.toFixed(2);
}

/**
 * Format IV (implied volatility)
 */
function formatIV(value: number | undefined): string {
  if (!value) return '—';
  return value.toFixed(2);
}

/**
 * Format delta
 */
function formatDelta(value: number | undefined): string {
  if (!value) return '—';
  return value.toFixed(4);
}

// ─── Components ──────────────────────────────────────────────────────────────

/**
 * OI Change Badge with color coding
 */
function OIChangeBadge({ value }: { value: number }): React.ReactElement {
  const className = value > 0 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : value < 0 
    ? 'text-red-600 dark:text-red-400' 
    : 'text-slate-400';
  return (
    <span className={`text-[9px] font-bold ${className}`}>
      {value > 0 ? '+' : ''}{formatOI(value)}
    </span>
  );
}

/**
 * Single Option Chain Row (Desktop)
 */
function OptionChainRowDesktop({
  row,
  isATM,
  spotPrice,
  ceBarWidth,
  peBarWidth,
  onSelect,
  onTrade,
  onAddToWatchlist,
}: OptionChainRowProps): React.ReactElement {
  const isITM_CE = row.strike < spotPrice;
  const isITM_PE = row.strike > spotPrice;

  return (
    <div
      className={`
        flex items-center gap-0.5 px-1 py-1 border-b border-slate-100 dark:border-slate-800
        transition-colors duration-75
        ${isATM ? 'bg-primary/15 dark:bg-primary/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'}
        h-14
      `}
    >
      {/* CE OI Change Badge */}
      <div className={`w-12 text-center flex-shrink-0 text-[9px] ${isITM_CE ? 'opacity-50' : ''}`}>
        <OIChangeBadge value={row.ce_oi_change} />
      </div>

      {/* CE OI Bar */}
      <div className={`w-16 h-10 relative bg-blue-50 dark:bg-blue-900/20 rounded overflow-hidden flex-shrink-0 ${isITM_CE ? 'opacity-60' : ''}`}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-600 transition-all duration-200"
          style={{ width: `${ceBarWidth}%` }}
        />
        <div className="relative h-full flex items-center justify-center text-[9px] font-bold text-blue-900 dark:text-blue-100 px-1 truncate">
          {formatOI(row.ce_oi)}
        </div>
      </div>

      {/* CE Volume */}
      <div className={`w-12 text-center text-[9px] text-slate-600 dark:text-slate-400 flex-shrink-0 ${isITM_CE ? 'opacity-50' : ''}`}>
        {formatVolume(row.ce_volume)}
      </div>

      {/* CE LTP (clickable) */}
      <div
        onClick={() => onSelect?.(row.strike, 'CE', row.ce_ltp)}
        className={`
          px-2 py-1 rounded font-bold text-[11px] cursor-pointer flex-shrink-0
          transition-all duration-100
          ${isITM_CE
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 opacity-70'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800'
          }
        `}
      >
        {formatPrice(row.ce_ltp)}
      </div>

      {/* Strike (Center) - ATM Highlight */}
      <div
        className={`
          px-3 py-1 rounded font-bold text-sm flex-shrink-0
          transition-colors duration-100
          ${isATM
            ? 'bg-primary text-white dark:bg-primary'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
          }
        `}
        style={{ minWidth: '56px', textAlign: 'center' }}
      >
        {Math.round(row.strike)}
      </div>

      {/* PE LTP (clickable) */}
      <div
        onClick={() => onSelect?.(row.strike, 'PE', row.pe_ltp)}
        className={`
          px-2 py-1 rounded font-bold text-[11px] cursor-pointer flex-shrink-0
          transition-all duration-100
          ${isITM_PE
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 opacity-70'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800'
          }
        `}
      >
        {formatPrice(row.pe_ltp)}
      </div>

      {/* PE Volume */}
      <div className={`w-12 text-center text-[9px] text-slate-600 dark:text-slate-400 flex-shrink-0 ${isITM_PE ? 'opacity-50' : ''}`}>
        {formatVolume(row.pe_volume)}
      </div>

      {/* PE OI Bar */}
      <div className={`w-16 h-10 relative bg-red-50 dark:bg-red-900/20 rounded overflow-hidden flex-shrink-0 ${isITM_PE ? 'opacity-60' : ''}`}>
        <div
          className="absolute inset-y-0 left-0 bg-red-400 dark:bg-red-600 transition-all duration-200"
          style={{ width: `${peBarWidth}%` }}
        />
        <div className="relative h-full flex items-center justify-center text-[9px] font-bold text-red-900 dark:text-red-100 px-1 truncate">
          {formatOI(row.pe_oi)}
        </div>
      </div>

      {/* PE OI Change Badge */}
      <div className={`w-12 text-center flex-shrink-0 text-[9px] ${isITM_PE ? 'opacity-50' : ''}`}>
        <OIChangeBadge value={row.pe_oi_change} />
      </div>
    </div>
  );
}

/**
 * Single Option Chain Row (Mobile)
 */
function OptionChainRowMobile({
  row,
  isATM,
  spotPrice,
  ceBarWidth,
  peBarWidth,
  onSelect,
}: Omit<OptionChainRowProps, 'onTrade' | 'onAddToWatchlist'>): React.ReactElement {
  const isITM_CE = row.strike < spotPrice;
  const isITM_PE = row.strike > spotPrice;

  return (
    <div
      className={`
        flex items-center gap-1 px-2 py-1 border-b border-slate-100 dark:border-slate-800
        transition-colors duration-75
        ${isATM ? 'bg-primary/15 dark:bg-primary/10' : ''}
        h-11
      `}
    >
      {/* CE OI (compact) */}
      <div className={`w-10 text-center text-[9px] font-bold flex-shrink-0 ${isITM_CE ? 'opacity-50' : 'text-blue-600 dark:text-blue-400'}`}>
        {formatOI(row.ce_oi)}
      </div>

      {/* CE LTP */}
      <div
        onClick={() => onSelect?.(row.strike, 'CE', row.ce_ltp)}
        className={`
          px-1.5 py-0.5 rounded font-bold text-[10px] cursor-pointer flex-shrink-0
          transition-all duration-100
          ${isITM_CE
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
          }
        `}
      >
        {formatPrice(row.ce_ltp)}
      </div>

      {/* Strike */}
      <div
        className={`
          px-2 py-0.5 rounded font-bold text-[10px] flex-shrink-0
          ${isATM ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}
        `}
        style={{ minWidth: '44px', textAlign: 'center' }}
      >
        {Math.round(row.strike)}
      </div>

      {/* PE LTP */}
      <div
        onClick={() => onSelect?.(row.strike, 'PE', row.pe_ltp)}
        className={`
          px-1.5 py-0.5 rounded font-bold text-[10px] cursor-pointer flex-shrink-0
          transition-all duration-100
          ${isITM_PE
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
          }
        `}
      >
        {formatPrice(row.pe_ltp)}
      </div>

      {/* PE OI (compact) */}
      <div className={`w-10 text-center text-[9px] font-bold flex-shrink-0 ${isITM_PE ? 'opacity-50' : 'text-red-600 dark:text-red-400'}`}>
        {formatOI(row.pe_oi)}
      </div>
    </div>
  );
}

/**
 * Main OptionChainProduction Component
 */
const OptionChainProduction: React.FC<OptionChainProductionProps> = ({
  symbol,
  data,
  onStrikeSelect,
  onExpiryChange,
  onTrade,
  onAddToWatchlist,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [hasScrolledToATM, setHasScrolledToATM] = useState(false);

  // Detect mobile breakpoint
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Extract data
  const spotPrice = data?.price ?? 0;
  const optionChain = data?.optionChain ?? [];
  const expiries = data?.expiries ?? [];
  const expiry = data?.expiry ?? '';
  const change = data?.change ?? 0;
  const changePct = data?.changePct ?? 0;

  // Sort by strike
  const sortedRows = useMemo<OptionStrike[]>(() => {
    if (!Array.isArray(optionChain)) return [];
    return [...optionChain]
      .filter(row => row && Number.isFinite(row.strike) && row.strike > 0)
      .sort((a, b) => a.strike - b.strike);
  }, [optionChain]);

  // Find ATM index
  const atmIndex = useMemo(() => {
    if (sortedRows.length === 0 || spotPrice <= 0) {
      return Math.floor(sortedRows.length / 2);
    }
    let closest = 0;
    let minDiff = Math.abs(sortedRows[0].strike - spotPrice);
    for (let i = 1; i < sortedRows.length; i++) {
      const diff = Math.abs(sortedRows[i].strike - spotPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = i;
      }
    }
    return closest;
  }, [sortedRows, spotPrice]);

  const atmStrike = sortedRows[atmIndex]?.strike ?? null;

  useEffect(() => {
    setHasScrolledToATM(false);
  }, [symbol, expiry, spotPrice, atmStrike]);

  // Calculate max OI for bar scaling
  const { maxCeOI, maxPeOI } = useMemo(() => {
    let maxCe = 1;
    let maxPe = 1;
    for (const row of sortedRows) {
      if (row.ce_oi > maxCe) maxCe = row.ce_oi;
      if (row.pe_oi > maxPe) maxPe = row.pe_oi;
    }
    return { maxCeOI: maxCe, maxPeOI: maxPe };
  }, [sortedRows]);

  // Auto-scroll to ATM on mount
  useEffect(() => {
    if (!scrollContainerRef.current || hasScrolledToATM || sortedRows.length === 0) {
      return;
    }

    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const rowHeight = isMobile ? 44 : 56;
      const containerHeight = container.clientHeight;
      const headerHeight = isMobile ? 40 : 48;

      // Calculate scroll position to center ATM row in the scroll container
      // The scroll container has its own height (containerHeight), so the center of the viewport is containerHeight / 2.
      // The center of the ATM row is (atmIndex + 0.5) * rowHeight.
      const targetScroll = Math.max(
        0,
        (atmIndex + 0.5) * rowHeight - containerHeight / 2
      );

      container.scrollTop = Math.min(
        targetScroll,
        Math.max(0, sortedRows.length * rowHeight - containerHeight)
      );
      setHasScrolledToATM(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [atmIndex, isMobile, hasScrolledToATM, sortedRows.length]);

  // Loading state
  if (!data || sortedRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-700 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-sm">{data ? 'No option chain data' : 'Loading option chain...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          {/* Spot Price Info */}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">{symbol}</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {formatPrice(spotPrice)}
              </span>
              <span className={`text-xs font-semibold ${
                change >= 0 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {change >= 0 ? '+' : ''}{formatPrice(change)} ({changePct.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Expiry Selector */}
          {expiries.length > 0 && (
            <select
              value={expiry}
              onChange={(e) => onExpiryChange?.(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
            >
              {expiries.map((exp) => (
                <option key={exp} value={exp}>
                  {exp}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className={`flex-shrink-0 px-1 py-1 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-400 ${
        isMobile ? 'hidden' : ''
      }`}>
        <div className="flex items-center gap-0.5 h-8">
          <div className="w-12 text-center">OI Chg</div>
          <div className="w-16 text-center">OI</div>
          <div className="w-12 text-center">Vol</div>
          <div className="flex-shrink-0 px-2">CE</div>
          <div className="flex-shrink-0 px-3 text-center">Strike</div>
          <div className="flex-shrink-0 px-2">PE</div>
          <div className="w-12 text-center">Vol</div>
          <div className="w-16 text-center">OI</div>
          <div className="w-12 text-center">OI Chg</div>
        </div>
      </div>

      {/* Scrollable Rows Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: 'calc(100% - 100px)' }}
      >
        {sortedRows.map((row, idx) => {
          const isATM = row.strike === atmStrike;
          const ceBarWidth = maxCeOI > 0 ? Math.round((row.ce_oi / maxCeOI) * 100) : 0;
          const peBarWidth = maxPeOI > 0 ? Math.round((row.pe_oi / maxPeOI) * 100) : 0;

          if (isMobile) {
            return (
              <OptionChainRowMobile
                key={`${row.strike}-${idx}`}
                row={row}
                isATM={isATM}
                spotPrice={spotPrice}
                ceBarWidth={ceBarWidth}
                peBarWidth={peBarWidth}
                onSelect={onStrikeSelect}
              />
            );
          }

          return (
            <OptionChainRowDesktop
              key={`${row.strike}-${idx}`}
              row={row}
              isATM={isATM}
              spotPrice={spotPrice}
              ceBarWidth={ceBarWidth}
              peBarWidth={peBarWidth}
              onSelect={onStrikeSelect}
              onTrade={onTrade}
              onAddToWatchlist={onAddToWatchlist}
            />
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="flex-shrink-0 px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
        <div>{sortedRows.length} strikes • ATM: {atmStrike ? Math.round(atmStrike) : '—'}</div>
      </div>
    </div>
  );
};

export default OptionChainProduction;
