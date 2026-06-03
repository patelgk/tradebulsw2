/**
 * GlobalSearch — keyboard-navigable search for indices and option contracts
 *
 * Searchable:
 * - Index names: NIFTY, BANKNIFTY, FINNIFTY, MIDCAP, SENSEX, BANKEX
 * - Options: "NIFTY 25000 CE", "BANKNIFTY 57000 PE"
 *
 * Keyboard: Arrow keys to navigate, Enter to select, Escape to close
 */

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, X, TrendingUp } from 'lucide-react';
import { SYMBOLS, SymbolName, OptionStrike, SymbolMarketData } from '../types';

interface SearchResult {
  type: 'index' | 'option';
  symbol: SymbolName;
  label: string;
  subLabel?: string;
  strike?: number;
  optionType?: 'CE' | 'PE';
  ltp?: number;
}

interface Props {
  marketData: Record<string, SymbolMarketData>;
  onSelectIndex:  (symbol: SymbolName) => void;
  onSelectOption: (symbol: SymbolName, strike: number, type: 'CE' | 'PE', ltp: number) => void;
  onClose: () => void;
}

// Aliases for fuzzy matching
const SYMBOL_ALIASES: Record<string, SymbolName> = {
  'NIFTY':          'Nifty 50',
  'NIFTY50':        'Nifty 50',
  'NIFTY 50':       'Nifty 50',
  'BANKNIFTY':      'Bank Nifty',
  'BANK NIFTY':     'Bank Nifty',
  'FINNIFTY':       'Fin Nifty',
  'FIN NIFTY':      'Fin Nifty',
  'MIDCAP':         'Midcap Select',
  'MIDCAPNIFTY':    'Midcap Select',
  'MIDCAP SELECT':  'Midcap Select',
  'NIFTYNEXT50':    'Nifty Next 50',
  'NIFTY NEXT 50':  'Nifty Next 50',
  'SENSEX':         'SENSEX',
  'BANKEX':         'Bankex',
};

function resolveSymbol(query: string): SymbolName | null {
  const up = query.toUpperCase().trim();
  if (SYMBOL_ALIASES[up]) return SYMBOL_ALIASES[up];
  for (const sym of SYMBOLS) {
    if (sym.toUpperCase().includes(up) || up.includes(sym.toUpperCase().replace(' ', ''))) {
      return sym;
    }
  }
  return null;
}

// Parse "NIFTY 25000 CE" or "BANKNIFTY57000PE"
function parseOptionQuery(query: string): { symbol: SymbolName; strike: number; type: 'CE' | 'PE' } | null {
  const clean = query.toUpperCase().replace(/\s+/g, ' ').trim();
  const match = clean.match(/^([A-Z\s]+?)\s*(\d{4,6})\s*(CE|PE)$/);
  if (!match) return null;
  const [, symPart, strikePart, typePart] = match;
  const symbol = resolveSymbol(symPart.trim());
  if (!symbol) return null;
  return { symbol, strike: parseInt(strikePart), type: typePart as 'CE' | 'PE' };
}

const GlobalSearch = memo(({ marketData, onSelectIndex, onSelectOption, onClose }: Props) => {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<SearchResult[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) {
      // Show all indices when empty
      setResults(SYMBOLS.map(sym => ({
        type: 'index',
        symbol: sym,
        label: sym,
        subLabel: marketData[sym] ? `₹${marketData[sym].price.toFixed(2)}` : '--',
      })));
      setHighlighted(0);
      return;
    }

    const q = query.trim();
    const items: SearchResult[] = [];

    // Try parsing as option: "NIFTY 25000 CE"
    const optParsed = parseOptionQuery(q);
    if (optParsed) {
      const { symbol, strike, type } = optParsed;
      const chain = marketData[symbol]?.optionChain ?? [];
      const row = chain.find(r => r.strike === strike);
      const ltp = type === 'CE' ? (row?.ce_ltp ?? 0) : (row?.pe_ltp ?? 0);
      items.push({
        type: 'option', symbol, label: `${symbol} ${strike} ${type}`,
        subLabel: ltp ? `LTP: ₹${ltp.toFixed(2)}` : 'Strike',
        strike, optionType: type, ltp,
      });
    }

    // Match indices
    const up = q.toUpperCase();
    for (const sym of SYMBOLS) {
      const aliases = Object.entries(SYMBOL_ALIASES)
        .filter(([, v]) => v === sym)
        .map(([k]) => k);
      const matches = sym.toUpperCase().includes(up) ||
        aliases.some(a => a.includes(up));
      if (matches) {
        items.push({
          type: 'index', symbol: sym,
          label: sym,
          subLabel: marketData[sym] ? `₹${marketData[sym].price.toFixed(2)}` : '--',
        });
      }
    }

    // Search option chains for nearby strikes
    if (!optParsed) {
      const sym = resolveSymbol(q);
      if (sym && marketData[sym]?.optionChain.length) {
        const spot = marketData[sym]?.price ?? 0;
        const chain = [...(marketData[sym]?.optionChain ?? [])]
          .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))
          .slice(0, 6);
        for (const row of chain) {
          items.push({
            type: 'option', symbol: sym,
            label: `${sym} ${row.strike} CE`,
            subLabel: `LTP: ₹${row.ce_ltp.toFixed(2)}`,
            strike: row.strike, optionType: 'CE', ltp: row.ce_ltp,
          });
          items.push({
            type: 'option', symbol: sym,
            label: `${sym} ${row.strike} PE`,
            subLabel: `LTP: ₹${row.pe_ltp.toFixed(2)}`,
            strike: row.strike, optionType: 'PE', ltp: row.pe_ltp,
          });
        }
      }
    }

    setResults(items.slice(0, 12));
    setHighlighted(0);
  }, [query, marketData]);

  const select = useCallback((result: SearchResult) => {
    if (result.type === 'index') {
      onSelectIndex(result.symbol);
    } else if (result.strike && result.optionType) {
      onSelectOption(result.symbol, result.strike, result.optionType, result.ltp ?? 0);
    }
    onClose();
  }, [onSelectIndex, onSelectOption, onClose]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && results[highlighted]) select(results[highlighted]);
    if (e.key === 'Escape') onClose();
  }, [results, highlighted, select, onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-16 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-white/10">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search: NIFTY, BANKNIFTY 57000 CE..."
            className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No results found</div>
          ) : (
            results.map((r, i) => (
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
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  r.type === 'index'
                    ? 'bg-primary/10 text-primary'
                    : r.optionType === 'CE'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-500'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500'
                }`}>
                  {r.type === 'index'
                    ? <TrendingUp className="w-3.5 h-3.5" />
                    : <span className="text-[9px] font-black">{r.optionType}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{r.label}</p>
                  {r.subLabel && <p className="text-[10px] text-slate-400">{r.subLabel}</p>}
                </div>
                {i === highlighted && (
                  <span className="text-[9px] text-slate-400 flex-shrink-0">↵ Select</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5 flex items-center gap-4 text-[9px] text-slate-400">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
});

GlobalSearch.displayName = 'GlobalSearch';
export default GlobalSearch;
