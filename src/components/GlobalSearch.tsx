/**
 * GlobalSearch — Search only Dhan-subscribed indices and their option contracts
 *
 * Scope: ONLY the 7 indices that Dhan WebSocket provides live data for.
 * No global stocks, no NSE equities, no external symbols.
 *
 * Search examples:
 *   "nifty"           → Nifty 50
 *   "bank"            → Bank Nifty
 *   "nifty 25000 ce"  → Nifty 50 25000 CE option
 *   "banknifty 57000" → Bank Nifty 57000 CE + PE options
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, X, TrendingUp, Activity } from 'lucide-react';
import { SYMBOLS, SymbolName } from '../types';

// ─── Dhan-only index definitions ─────────────────────────────────────────────

interface DhanIndex {
  name:      SymbolName;
  shortName: string;
  aliases:   string[];
  securityId:string;
  color:     string;
}

const DHAN_INDICES: DhanIndex[] = [
  { name: 'Nifty 50',      shortName: 'NIFTY',      aliases: ['nifty50', 'nifty 50', 'nifty'],     securityId: '13',  color: 'text-blue-500' },
  { name: 'Bank Nifty',    shortName: 'BANKNIFTY',  aliases: ['banknifty', 'bank nifty', 'bank'],   securityId: '25',  color: 'text-purple-500' },
  { name: 'Fin Nifty',     shortName: 'FINNIFTY',   aliases: ['finnifty', 'fin nifty', 'fin'],      securityId: '27',  color: 'text-cyan-500' },
  { name: 'Midcap Select', shortName: 'MIDCAP',     aliases: ['midcap', 'midcapnifty', 'midcap select'], securityId: '442', color: 'text-orange-500' },
  { name: 'Nifty Next 50', shortName: 'NIFTYNXT50', aliases: ['niftynext50', 'nifty next 50', 'next50'], securityId: '28', color: 'text-green-500' },
  { name: 'SENSEX',        shortName: 'SENSEX',     aliases: ['sensex', 'bse sensex'],              securityId: '51',  color: 'text-red-500' },
  { name: 'Bankex',        shortName: 'BANKEX',     aliases: ['bankex', 'bse bankex'],              securityId: '10',  color: 'text-yellow-500' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult {
  type:        'index' | 'option';
  index:       DhanIndex;
  label:       string;
  subLabel:    string;
  strike?:     number;
  optionType?: 'CE' | 'PE';
  ltp?:        number;
}

interface Props {
  marketData:     Record<string, any>;
  onSelectIndex:  (symbol: SymbolName) => void;
  onSelectOption: (symbol: SymbolName, strike: number, type: 'CE' | 'PE', ltp: number) => void;
  onClose:        () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchIndex(query: string): DhanIndex | null {
  const q = query.toLowerCase().replace(/\s+/g, '');
  return DHAN_INDICES.find(idx =>
    idx.aliases.some(a => a.replace(/\s+/g, '').includes(q) || q.includes(a.replace(/\s+/g, '')))
  ) ?? null;
}

// Parse "NIFTY 25000 CE" or "BANKNIFTY57000PE" or "NIFTY 25000"
function parseOptionQuery(query: string): { index: DhanIndex; strike: number; type?: 'CE' | 'PE' } | null {
  const clean = query.trim().toUpperCase();
  // With option type
  const m1 = clean.match(/^([A-Z\s]+?)\s*(\d{3,6})\s*(CE|PE)$/);
  if (m1) {
    const idx = matchIndex(m1[1].trim());
    if (idx) return { index: idx, strike: parseInt(m1[2]), type: m1[3] as 'CE' | 'PE' };
  }
  // Without option type (show both CE and PE)
  const m2 = clean.match(/^([A-Z\s]+?)\s*(\d{3,6})$/);
  if (m2) {
    const idx = matchIndex(m2[1].trim());
    if (idx) return { index: idx, strike: parseInt(m2[2]) };
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

const GlobalSearch = memo(({ marketData, onSelectIndex, onSelectOption, onClose }: Props) => {
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<SearchResult[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Build results ──────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim();

    if (!q) {
      // Empty query → show all 7 Dhan indices
      setResults(DHAN_INDICES.map(idx => {
        const md = marketData[idx.name];
        const price = md?.price ?? 0;
        const change = md?.change ?? 0;
        const pct = md?.changePct ?? (price > 0 && md?.dayOpen > 0 ? ((price - md.dayOpen) / md.dayOpen * 100) : 0);
        return {
          type:     'index',
          index:    idx,
          label:    idx.name,
          subLabel: price > 0
            ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}  ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${pct.toFixed(2)}%)`
            : 'Waiting for data...',
        };
      }));
      setHighlighted(0);
      return;
    }

    const items: SearchResult[] = [];

    // Try option query first: "NIFTY 25000 CE"
    const optParsed = parseOptionQuery(q);
    if (optParsed) {
      const { index, strike, type } = optParsed;
      const chain = marketData[index.name]?.optionChain ?? [];
      // Find nearest strike in chain
      const nearest = chain.reduce((best: any, row: any) =>
        Math.abs(row.strike - strike) < Math.abs((best?.strike ?? Infinity) - strike) ? row : best
      , null);

      if (type) {
        const ltp = type === 'CE' ? (nearest?.ce_ltp ?? 0) : (nearest?.pe_ltp ?? 0);
        items.push({
          type: 'option', index,
          label:    `${index.shortName} ${strike} ${type}`,
          subLabel: ltp > 0 ? `LTP ₹${ltp.toFixed(2)} · ${index.name}` : `${index.name} option`,
          strike, optionType: type, ltp,
        });
      } else {
        // Show both CE and PE
        const ce = nearest?.ce_ltp ?? 0;
        const pe = nearest?.pe_ltp ?? 0;
        items.push(
          { type: 'option', index, label: `${index.shortName} ${strike} CE`, subLabel: ce > 0 ? `LTP ₹${ce.toFixed(2)} · ${index.name}` : index.name, strike, optionType: 'CE', ltp: ce },
          { type: 'option', index, label: `${index.shortName} ${strike} PE`, subLabel: pe > 0 ? `LTP ₹${pe.toFixed(2)} · ${index.name}` : index.name, strike, optionType: 'PE', ltp: pe },
        );
      }
    }

    // Match index names
    const ql = q.toLowerCase().replace(/\s+/g, '');
    for (const idx of DHAN_INDICES) {
      const matches = idx.aliases.some(a =>
        a.replace(/\s+/g, '').includes(ql) || ql.includes(a.replace(/\s+/g, ''))
      );
      if (matches && !optParsed) {
        const md = marketData[idx.name];
        const price = md?.price ?? 0;
        items.push({
          type:     'index',
          index:    idx,
          label:    idx.name,
          subLabel: price > 0 ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}  ${(md?.change ?? 0) >= 0 ? '+' : ''}${(md?.change ?? 0).toFixed(2)}` : 'Dhan Live Index',
        });

        // Also show nearest ATM strikes
        if (!optParsed) {
          const spot  = md?.price ?? 0;
          const chain: any[] = md?.optionChain ?? [];
          if (spot > 0 && chain.length > 0) {
            const sorted = [...chain].sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
            for (const row of sorted.slice(0, 3)) {
              items.push(
                { type: 'option', index: idx, label: `${idx.shortName} ${row.strike} CE`, subLabel: `LTP ₹${row.ce_ltp.toFixed(2)} · ATM ${row.strike > spot ? '+' : ''}${(row.strike - spot).toFixed(0)}`, strike: row.strike, optionType: 'CE', ltp: row.ce_ltp },
                { type: 'option', index: idx, label: `${idx.shortName} ${row.strike} PE`, subLabel: `LTP ₹${row.pe_ltp.toFixed(2)} · ATM ${row.strike > spot ? '+' : ''}${(row.strike - spot).toFixed(0)}`, strike: row.strike, optionType: 'PE', ltp: row.pe_ltp },
              );
            }
          }
        }
      }
    }

    setResults(items.slice(0, 14));
    setHighlighted(0);
  }, [query, marketData]);

  // ── Select ──────────────────────────────────────────────────────────────────
  const select = useCallback((r: SearchResult) => {
    if (r.type === 'index') {
      onSelectIndex(r.index.name);
    } else if (r.strike && r.optionType !== undefined) {
      onSelectOption(r.index.name, r.strike, r.optionType, r.ltp ?? 0);
    }
    onClose();
  }, [onSelectIndex, onSelectOption, onClose]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter'  && results[highlighted]) select(results[highlighted]);
    if (e.key === 'Escape') onClose();
  }, [results, highlighted, select, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-14 px-4 bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-white/10">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="NIFTY · BANKNIFTY · SENSEX · NIFTY 25000 CE"
            className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1">
            <span className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded">ESC</span>
          </button>
        </div>

        {/* Label */}
        <div className="px-4 py-1.5 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Dhan Live Indices · {DHAN_INDICES.length} subscribed
          </p>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.label}-${i}`}
              onClick={() => select(r)}
              onMouseEnter={() => setHighlighted(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === highlighted
                  ? 'bg-primary/10 dark:bg-primary/20'
                  : 'hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                r.type === 'index'
                  ? 'bg-slate-100 dark:bg-white/10'
                  : r.optionType === 'CE'
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-emerald-50 dark:bg-emerald-900/20'
              }`}>
                {r.type === 'index'
                  ? <TrendingUp className={`w-4 h-4 ${r.index.color}`} />
                  : <span className={`text-[10px] font-black ${r.optionType === 'CE' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {r.optionType}
                    </span>
                }
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.label}</p>
                <p className="text-[10px] text-slate-400 truncate">{r.subLabel}</p>
              </div>

              {/* Source badge */}
              <div className="flex-shrink-0 flex items-center gap-1">
                <Activity className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                <span className="text-[8px] text-slate-300 dark:text-slate-600 font-bold">DHAN</span>
                {i === highlighted && (
                  <span className="text-[9px] text-slate-400 ml-1">↵</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-4 text-[9px] text-slate-400">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
          <span className="ml-auto">Source: Dhan WebSocket</span>
        </div>
      </div>
    </div>
  );
});

GlobalSearch.displayName = 'GlobalSearch';
export default GlobalSearch;
