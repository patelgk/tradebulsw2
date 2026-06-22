import React, { useState, useEffect, useMemo, useCallback, Component, useRef, memo } from 'react';

// Global error handler to catch and ignore generic "Script error."
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (message === 'Script error.') {
      // console.warn('Ignored generic Script error from third-party widget');
      return true; // Prevent the error from showing in console/UI
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
    return false;
  };
}

import { LandingPage } from './components/LandingPage';
import LWChart from './components/LWChart';
import OptionChain from './components/OptionChain';
import GlobalSearch from './components/GlobalSearch';
import { 
  CandlestickChart, 
  Briefcase, 
  ReceiptText, 
  User, 
  Home, 
  Trophy, 
  Search, 
  Bell, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  LayoutDashboard,
  Wallet,
  Menu,
  ShieldCheck,
  Users,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  ArrowRightLeft,
  Settings,
  Phone,
  Save,
  Trash2,
  Maximize2,
  ChevronLeft,
  Sun,
  Moon,
  Mail,
  AlertTriangle,
  CircleOff,
  Info,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io } from 'socket.io-client';
import { api } from './api';
import { NavItem, Trade, Plan, OptionStrike, Portfolio, Account, Client, Rule, SymbolMarketData, SYMBOLS, LOT_SIZES, INDEX_SECURITY_IDS, ChartSelection, ChartTick, SymbolName, Watchlist, WatchlistItem, OrderTicketInstrument } from './types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.client';

type ChartSelectionInput = Omit<ChartSelection, 'chartKey'> & { timeframe?: ChartSelection['timeframe'] };
const IS_DEV = import.meta.env.DEV;
const UI_BATCH_MS = 160;

function buildChartKey(selection: ChartSelectionInput, timeframe: ChartSelection['timeframe'] = selection.timeframe || '5m') {
  const keyParts = [
    selection.kind,
    selection.symbol,
    timeframe || '5m',
  ];
  if (selection.kind === 'option') {
    keyParts.push(String(selection.strike || 0), selection.optionType || 'CE', selection.securityId || 'pending');
  }
  return keyParts.join(':');
}

interface User {
  uid: string;
  email: string;
  name?: string;
  role?: string;
}

interface OptionData {
  strike: number;
  ce_oi: number;
  ce_oi_change: number;
  ce_ltp: number;
  pe_ltp: number;
  pe_oi_change: number;
  pe_oi: number;
}

// --- Components ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const displayMessage = this.state.error?.message || "An unexpected error occurred.";

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 dark:bg-[#160d08] text-center">
          <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20 max-w-md">
            <ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Application Error</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              {displayMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:opacity-90 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
const OPTION_CHAIN_DATA: OptionData[] = [
  { strike: 22300, ce_oi: 45000, ce_oi_change: 1200, ce_ltp: 285.40, pe_ltp: 42.15, pe_oi_change: -450, pe_oi: 12000 },
  { strike: 22350, ce_oi: 32000, ce_oi_change: 800, ce_ltp: 242.10, pe_ltp: 58.30, pe_oi_change: -200, pe_oi: 15000 },
  { strike: 22400, ce_oi: 85000, ce_oi_change: 5400, ce_ltp: 198.50, pe_ltp: 76.45, pe_oi_change: 1200, pe_oi: 45000 },
  { strike: 22450, ce_oi: 125000, ce_oi_change: 12000, ce_ltp: 145.20, pe_ltp: 112.45, pe_oi_change: 4500, pe_oi: 85000 },
  { strike: 22500, ce_oi: 245000, ce_oi_change: 45000, ce_ltp: 98.30, pe_ltp: 165.20, pe_oi_change: 12000, pe_oi: 145000 },
  { strike: 22550, ce_oi: 185000, ce_oi_change: 22000, ce_ltp: 62.45, pe_ltp: 212.10, pe_oi_change: 8500, pe_oi: 98000 },
  { strike: 22600, ce_oi: 145000, ce_oi_change: 15000, ce_ltp: 38.20, pe_ltp: 265.40, pe_oi_change: 5400, pe_oi: 72000 },
];
const RECENT_TRADES: Trade[] = [
  {
    id: '1',
    symbol: 'RELIANCE',
    type: 'BUY',
    optionType: 'CE',
    strike: 22400,
    price: 145.20,
    qty: 50,
    lotSize: 50,
    time: '24 Oct, 10:30 AM',
    status: 'Closed',
    pnl: 4500,
    charges: 0
  },
  {
    id: '2',
    symbol: 'HDFCBANK',
    type: 'SELL',
    optionType: 'PE',
    strike: 22500,
    price: 112.45,
    qty: 100,
    lotSize: 100,
    time: '23 Oct, 02:15 PM',
    status: 'Closed',
    pnl: -1200,
    charges: 0
  }
];

// --- Components ---

const ConnectionBadge = ({ status, provider, nextRetryIn, error, onReconnect }: { 
  status: string, 
  provider: string, 
  nextRetryIn?: number, 
  error?: string,
  onReconnect?: () => void
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-emerald-500';
      case 'connecting': return 'bg-amber-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      case 'disconnected': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  const getStatusText = () => {
    if (status === 'failed' && nextRetryIn) {
      return `Failed (Retry in ${Math.round(nextRetryIn / 1000)}s)`;
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex flex-col gap-1 items-start">
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 group relative">
        <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {provider}: {getStatusText()}
        </span>
        {status === 'failed' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onReconnect?.(); }}
            className="ml-1 text-[8px] bg-primary/20 text-primary px-1 rounded hover:bg-primary/30 transition-colors"
          >
            Retry Now
          </button>
        )}
        {error && (
          <div className="absolute top-full left-0 mt-1 hidden group-hover:block z-[100] bg-red-600 text-white text-[10px] p-2 rounded shadow-lg max-w-[200px]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

const Header = ({ 
  activeTab, 
  onBack, 
  isSubView, 
  onLogout, 
  darkMode, 
  onToggleDarkMode, 
  onOpenOptionChain,
  providerStatus,
  onSearch
}: { 
  activeTab: string, 
  onBack?: () => void, 
  isSubView?: boolean, 
  onLogout?: () => void,
  darkMode: boolean,
  onToggleDarkMode: () => void,
  onOpenOptionChain?: () => void,
  providerStatus?: Record<string, { status: string, nextRetryIn?: number, error?: string }>,
  onSearch?: () => void
}) => {
  const handleReconnect = async (provider: string) => {
    try {
      // Only Dhan is supported in this application.
    } catch (err) {
      console.error('Manual reconnect failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/80 bg-white/[0.85] px-4 py-3 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#090c14]/[0.86]">
      <div className="flex items-center gap-2">
        {isSubView ? (
          <button onClick={onBack} className="-ml-1 rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.08]">
            <ArrowDown className="w-6 h-6 rotate-90" />
          </button>
        ) : activeTab === 'trade' ? (
          <button 
            onClick={onOpenOptionChain} 
            className="-ml-1 rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.08]"
            title="View Option Chain"
          >
            <Menu className="h-6 w-6 text-primary" />
          </button>
        ) : (
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.12] p-2 shadow-lg shadow-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl font-black leading-none tracking-[-0.04em]">
            {isSubView ? 'Option Chain' : 'Indo Trader'}
          </h1>
        </div>
        {!isSubView && activeTab === 'trade' && (
          <span className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/80 px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onSearch}
          className="rounded-full border border-slate-200/80 bg-slate-100/80 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/10"
          title="Search (Ctrl+K)"
        >
          <Search className="w-5 h-5" />
        </button>
        <button 
          onClick={onToggleDarkMode}
          className="rounded-full border border-slate-200/80 bg-slate-100/80 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/10"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {onLogout && (
          <button onClick={onLogout} className="rounded-full border border-slate-200/80 bg-slate-100/80 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/10">
            <User className="w-5 h-5" />
          </button>
        )}
        <button className="relative rounded-full border border-slate-200/80 bg-slate-100/80 p-2 text-slate-600 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 dark:hover:bg-white/10">
          <Bell className="w-5 h-5" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white dark:border-[#160d08]" />
        </button>
      </div>
    </header>
  );
};

const AuthView = ({ onAuthSuccess, showToast }: { onAuthSuccess: (user: any) => void, showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('mobile'); // Default to mobile as requested
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let userData;
      if (isForgot) {
        const res = await api.forgotPassword(loginMethod === 'email' ? { email } : { mobile });
        showToast(res.message, 'success');
        if (res.password) {
          alert(`Your password is: ${res.password}`); // Development convenience
        }
        setIsForgot(false);
        setIsLogin(true);
      } else if (isLogin) {
        userData = await api.login(loginMethod === 'email' ? { email, password } : { mobile, password });
        // Save locally
        localStorage.setItem('trader_user', JSON.stringify(userData));
        onAuthSuccess(userData);
      } else {
        userData = await api.signup({ email, password, phoneNumber: mobile, name: name || email.split('@')[0] });
        // Save locally
        localStorage.setItem('trader_user', JSON.stringify(userData));
        onAuthSuccess(userData);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    showToast('Google login is disabled. Please use email/password.', 'error');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 pb-32">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex p-4 rounded-3xl bg-primary/10 mb-4">
            <TrendingUp className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">
            {isForgot ? 'Recover Key' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest">
            {isForgot ? 'Get your password back' : isLogin ? 'Sign in to your trading account' : 'Join the elite trading community'}
          </p>
        </div>

        {!isForgot && (
          <div className="flex bg-slate-100/50 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
            <button 
              type="button"
              onClick={() => setLoginMethod('mobile')}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 ${loginMethod === 'mobile' ? 'bg-primary text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              Mobile Access
            </button>
            <button 
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-300 ${loginMethod === 'email' ? 'bg-primary text-white shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              Email Access
            </button>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold">
              <span className="bg-white dark:bg-[#160d08] px-4 text-slate-400">Or use details</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold">
                <p>{error}</p>
              </div>
            )}
            
            {!isLogin && !isForgot && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Full Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary transition-all font-bold"
                    required
                  />
                </div>
              </div>
            )}

            {(loginMethod === 'email' || !isLogin) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary transition-all font-bold font-mono"
                    required={loginMethod === 'email' || !isLogin}
                  />
                </div>
              </div>
            )}

            {(loginMethod === 'mobile' || !isLogin) && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Mobile Number</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter 10 digit number"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary transition-all font-bold font-mono"
                    required={loginMethod === 'mobile' || !isLogin}
                  />
                </div>
              </div>
            )}

            {!isForgot && (
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-4 mr-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => setIsForgot(true)}
                      className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary transition-all font-bold"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-xs"
            >
              {loading ? 'Processing...' : isForgot ? 'Request Reset' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="text-center space-y-3">
            <button
              onClick={() => {
                if (isForgot) {
                  setIsForgot(false);
                  setIsLogin(true);
                } else {
                  setIsLogin(!isLogin);
                }
              }}
              className="text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
            >
              {isForgot ? "Back to Login" : isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CandleChart = ({ symbol, interval = '5m', currentPrice }: { symbol: string, interval?: string, currentPrice?: number }) => {
  const [candles, setCandles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<any | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 400 });
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);
  const [showSMA, setShowSMA] = useState(true);
  
  // Adjustable view state
  const [visibleCount, setVisibleCount] = useState(50);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [chartHeight, setChartHeight] = useState(400);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const getIntervalMs = (tf: string) => {
    const unit = tf.slice(-1).toLowerCase();
    const value = parseInt(tf.slice(0, -1)) || 1;
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  };

  useEffect(() => {
    if (candles.length === 0 || !currentPrice) return;
    
    const intervalMs = getIntervalMs(interval);
    const now = Date.now();
    
    // Use a function update to get the latest candles state
    setCandles(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      
      // Align to interval boundaries (e.g., 5m candles start at :00, :05, :10)
      const currentCandleStartTime = Math.floor(now / intervalMs) * intervalMs;
      const lastCandleStartTime = Math.floor(new Date(last.time).getTime() / intervalMs) * intervalMs;

      if (currentCandleStartTime > lastCandleStartTime) {
        // Start a new candle
        const newCandle = {
          time: new Date(currentCandleStartTime).toISOString(),
          open: last.close,
          high: Math.max(last.close, currentPrice),
          low: Math.min(last.close, currentPrice),
          close: currentPrice,
          volume: Math.floor(Math.random() * 1000) // Volume for new candle
        };
        // Limit total candles to prevent memory issues
        const newCandles = [...prev, newCandle];
        return newCandles.length > 500 ? newCandles.slice(-500) : newCandles;
      } else {
        // Update existing candle
        const updatedLast = {
          ...last,
          close: currentPrice,
          high: Math.max(last.high, currentPrice),
          low: Math.min(last.low, currentPrice),
          volume: (last.volume || 0) + Math.floor(Math.random() * 10) // Increment volume
        };
        return [...prev.slice(0, -1), updatedLast];
      }
    });
  }, [currentPrice, interval]);

  const smaPeriod = 20;

  const smaData = useMemo(() => {
    if (candles.length < smaPeriod) return [];
    const sma = [];
    for (let i = smaPeriod - 1; i < candles.length; i++) {
      const slice = candles.slice(i - smaPeriod + 1, i + 1);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      sma.push({ index: i, value: sum / smaPeriod });
    }
    return sma;
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setContainerSize(prev => ({
          ...prev,
          width: entry.contentRect.width
        }));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      
      // 1. Try to load from Dexie first for instant UI
      try {
        const localData = await db.marketHistorical.get([symbol, interval]);
        if (localData && localData.candles.length > 0) {
          setCandles(localData.candles);
          setVisibleCount(Math.min(localData.candles.length, 50));
          setScrollOffset(0);
          setLoading(false); // Show cached data immediately
        }
      } catch (err) {
        console.error('Dexie load error:', err);
      }

      // 2. Fetch fresh data from API
      try {
        const response = await fetch(`/api/market/history/${encodeURIComponent(symbol)}?interval=${interval}`);
        if (response.ok) {
          const data = await response.json();
          setCandles(data);
          // Reset view on symbol change
          setVisibleCount(Math.min(data.length, 50));
          setScrollOffset(0);

          // 3. Save to Dexie
          await db.marketHistorical.put({
            symbol,
            interval,
            candles: data,
            lastUpdated: Date.now()
          });
        }
      } catch (err) {
        // Only log warning if it fails, to avoid console flood
        // We still log first few errors as warnings for visibility
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [symbol, interval]);

  // Periodic save for real-time updates to Dexie
  useEffect(() => {
    if (candles.length === 0) return;
    const saveTimer = setTimeout(async () => {
      try {
        await db.marketHistorical.put({
          symbol,
          interval,
          candles: candles,
          lastUpdated: Date.now()
        });
      } catch (err) {
        // Silent fail for periodic save
      }
    }, 10000); // Save every 10 seconds if candles change
    return () => clearTimeout(saveTimer);
  }, [candles, symbol, interval]);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (candles.length === 0) return { start: 0, end: 0, data: [] };
    const end = Math.max(0, candles.length - scrollOffset);
    const start = Math.max(0, end - visibleCount);
    return {
      start,
      end,
      data: candles.slice(start, end)
    };
  }, [candles, visibleCount, scrollOffset]);

  const chartData = useMemo(() => {
    if (visibleRange.data.length === 0) return null;
    const prices = visibleRange.data.map(c => [c.high, c.low]).flat();
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const volumes = visibleRange.data.map(c => c.volume || 0);
    const maxVolume = Math.max(...volumes, 1);
    return { min, max, range, maxVolume };
  }, [visibleRange.data]);

  if (loading) return (
    <div style={{ height: chartHeight }} className="w-full flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Chart...</span>
      </div>
    </div>
  );

  if (!chartData || candles.length === 0) return (
    <div style={{ height: chartHeight }} className="w-full flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No chart data available</span>
    </div>
  );

  const paddingRight = 60;
  const paddingBottom = 30;
  const paddingTop = 20;
  const paddingLeft = 10;
  
  const width = containerSize.width || 400;
  const height = chartHeight;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeightInner = height - paddingTop - paddingBottom;
  
  const candleWidth = chartWidth / visibleRange.data.length;

  const getPriceY = (price: number) => {
    return paddingTop + chartHeightInner - ((price - chartData.min) / chartData.range) * chartHeightInner;
  };

  // Grid lines
  const gridLines = Array.from({ length: 5 }).map((_, i) => {
    const price = chartData.min + (chartData.range / 4) * i;
    return { price, y: getPriceY(price) };
  });

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      // Zoom
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      setVisibleCount(prev => {
        const next = Math.round(prev * zoomFactor);
        return Math.max(10, Math.min(next, candles.length));
      });
    } else {
      // Horizontal scroll
      const scrollDelta = Math.round(e.deltaX / candleWidth);
      setScrollOffset(prev => {
        const next = prev + scrollDelta;
        return Math.max(0, Math.min(next, candles.length - visibleCount));
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, offset: scrollOffset });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const scrollDelta = Math.round(dx / candleWidth);
      setScrollOffset(prev => {
        const next = dragStart.offset + scrollDelta;
        return Math.max(0, Math.min(next, candles.length - visibleCount));
      });
    }

    if (isResizing) {
      const dy = e.clientY - rect.top;
      setChartHeight(Math.max(200, Math.min(dy, 800)));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  return (
    <div 
      ref={containerRef}
      style={{ height }}
      className={`relative w-full bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden group ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'} select-none`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        setMousePos(null);
        setHoveredCandle(null);
      }}
    >
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid Lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line 
              x1={paddingLeft} 
              y1={line.y} 
              x2={paddingLeft + chartWidth} 
              y2={line.y} 
              stroke="currentColor" 
              className="text-slate-200 dark:text-white/5" 
              strokeWidth="1" 
              strokeDasharray="4 4"
            />
            <text 
              x={paddingLeft + chartWidth + 5} 
              y={line.y + 4} 
              className="text-[9px] font-bold fill-slate-400"
            >
              {line.price.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Candles and Volume */}
        {visibleRange.data.map((c, i) => {
          const x = paddingLeft + i * candleWidth;
          const yOpen = getPriceY(c.open);
          const yClose = getPriceY(c.close);
          const yHigh = getPriceY(c.high);
          const yLow = getPriceY(c.low);
          
          const isUp = c.close >= c.open;
          const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));
          const bodyY = Math.min(yOpen, yClose);

          // Professional Trading Colors
          const greenColor = '#26a69a';
          const redColor = '#ef5350';
          const candleColor = isUp ? greenColor : redColor;

          // Volume Bar
          const volHeight = (c.volume / chartData.maxVolume) * (chartHeightInner * 0.15);
          const volY = paddingTop + chartHeightInner - volHeight;

          const isLast = (visibleRange.start + i) === candles.length - 1;

          return (
            <g 
              key={visibleRange.start + i} 
              onMouseEnter={() => setHoveredCandle(c)}
              className="transition-opacity duration-200"
            >
              {/* Volume */}
              <rect 
                x={x + 1} 
                y={volY} 
                width={candleWidth - 2} 
                height={volHeight} 
                fill={candleColor} 
                className="opacity-10"
              />
              {/* Wick */}
              <line 
                x1={x + candleWidth/2} 
                y1={yHigh} 
                x2={x + candleWidth/2} 
                y2={yLow} 
                stroke={candleColor} 
                strokeWidth="1.2" 
                strokeLinecap="round"
              />
              {/* Body */}
              {isLast ? (
                <g>
                  <motion.rect 
                    initial={false}
                    animate={{
                      y: bodyY,
                      height: bodyHeight,
                      fill: candleColor,
                      filter: isUp ? 'drop-shadow(0 0 4px rgba(38, 166, 154, 0.4))' : 'drop-shadow(0 0 4px rgba(239, 83, 80, 0.4))'
                    }}
                    transition={{ duration: 0.1, ease: "linear" }}
                    x={x + 1} 
                    width={candleWidth - 2} 
                    rx={1.5}
                  />
                </g>
              ) : (
                <rect 
                  x={x + 1} 
                  y={bodyY} 
                  width={candleWidth - 2} 
                  height={bodyHeight} 
                  fill={candleColor} 
                  rx={1.5}
                  className="opacity-90"
                />
              )}
            </g>
          );
        })}

        {/* SMA Line */}
        {showSMA && smaData.length > 0 && (
          <path 
            d={smaData
              .filter(d => d.index >= visibleRange.start && d.index < visibleRange.end)
              .map((d, i) => {
                const x = paddingLeft + (d.index - visibleRange.start) * candleWidth + candleWidth / 2;
                const y = getPriceY(d.value);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            className="opacity-80"
          />
        )}

        {/* Current Price Line */}
        {candles.length > 0 && (
          <g>
            <motion.line 
              initial={false}
              animate={{
                y1: getPriceY(candles[candles.length - 1].close),
                y2: getPriceY(candles[candles.length - 1].close)
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              x1={paddingLeft} 
              x2={paddingLeft + chartWidth} 
              stroke="#3b82f6" 
              strokeWidth="1" 
              strokeDasharray="2 2"
            />
            <motion.rect 
              initial={false}
              animate={{
                y: getPriceY(candles[candles.length - 1].close) - 8
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              x={paddingLeft + chartWidth} 
              width={paddingRight} 
              height={16} 
              fill="#3b82f6" 
              rx="2"
            />
            <motion.text 
              initial={false}
              animate={{
                y: getPriceY(candles[candles.length - 1].close) + 4
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              x={paddingLeft + chartWidth + 5} 
              className="text-[9px] font-bold fill-white"
            >
              {candles[candles.length - 1].close.toFixed(2)}
            </motion.text>
          </g>
        )}

        {/* Crosshair */}
        {mousePos && mousePos.x >= paddingLeft && mousePos.x <= paddingLeft + chartWidth && (
          <g>
            <line x1={mousePos.x} y1={paddingTop} x2={mousePos.x} y2={paddingTop + chartHeightInner} stroke="currentColor" className="text-slate-400 opacity-50" strokeWidth="1" strokeDasharray="2 2" />
            <line x1={paddingLeft} y1={mousePos.y} x2={paddingLeft + chartWidth} y2={mousePos.y} stroke="currentColor" className="text-slate-400 opacity-50" strokeWidth="1" strokeDasharray="2 2" />
            
            <rect x={paddingLeft + chartWidth} y={mousePos.y - 8} width={paddingRight} height={16} fill="currentColor" className="text-slate-800 dark:text-slate-200" rx="2" />
            <text x={paddingLeft + chartWidth + 5} y={mousePos.y + 4} className="text-[9px] font-bold fill-white dark:fill-slate-900">
              {chartData.min + ((chartHeightInner - (mousePos.y - paddingTop)) / chartHeightInner) * chartData.range > 0 ? 
                (chartData.min + ((chartHeightInner - (mousePos.y - paddingTop)) / chartHeightInner) * chartData.range).toFixed(2) : '0.00'}
            </text>
          </g>
        )}

        {/* Time Labels (X-axis) */}
        {visibleRange.data.filter((_, i) => i % Math.floor(visibleRange.data.length / 5) === 0).map((c, i) => {
          const x = paddingLeft + (visibleRange.data.indexOf(c)) * candleWidth;
          return (
            <text 
              key={i} 
              x={x} 
              y={paddingTop + chartHeightInner + 15} 
              className="text-[9px] font-bold fill-slate-400"
              textAnchor="middle"
            >
              {new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
          );
        })}
      </svg>

      {/* Hover Info */}
      {hoveredCandle && (
        <div 
          className="absolute top-4 left-4 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200 dark:border-white/10 shadow-2xl pointer-events-none z-30 min-w-[140px]"
          style={{
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="flex items-center justify-between mb-2 pb-1 border-bottom border-slate-100 dark:border-white/5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">OHLC Data</span>
            <span className={`text-[10px] font-bold ${hoveredCandle.close >= hoveredCandle.open ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
              {((hoveredCandle.close - hoveredCandle.open) / hoveredCandle.open * 100).toFixed(2)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Open</span>
              <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">{hoveredCandle.open.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">High</span>
              <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">{hoveredCandle.high.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Low</span>
              <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">{hoveredCandle.low.toFixed(2)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Close</span>
              <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white">{hoveredCandle.close.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-2 pt-1 border-t border-slate-100 dark:border-white/5 flex justify-between items-center">
             <span className="text-[8px] text-slate-400 uppercase font-bold">Vol</span>
             <span className="text-[9px] font-mono font-bold text-slate-600 dark:text-slate-400">{(hoveredCandle.volume || 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-primary/30 transition-colors flex items-center justify-center"
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsResizing(true);
        }}
      >
        <div className="w-8 h-1 bg-slate-300 dark:bg-white/20 rounded-full" />
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => setShowSMA(!showSMA)}
          className={`p-1.5 rounded-lg border transition-all ${showSMA ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-white/10'}`}
          title="Toggle SMA"
        >
          <Activity className="w-3 h-3" />
        </button>
        <button 
          onClick={() => {
            setVisibleCount(50);
            setScrollOffset(0);
          }}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-white/10 hover:text-primary transition-all"
          title="Reset View"
        >
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

const PerformanceChart = ({ trades, height = 160 }: { trades: Trade[], height?: number }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const data = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'Closed');
    if (closedTrades.length === 0) {
      return [
        { date: 'Start', value: 100, pnl: 0 },
        { date: 'Now', value: 100, pnl: 0 }
      ];
    }
    
    const sorted = [...closedTrades].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    let cumulativePnl = 0;
    const points = sorted.map(t => {
      cumulativePnl += t.pnl || 0;
      return {
        date: new Date(t.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        pnl: cumulativePnl,
        value: 0
      };
    });

    // Add a starting point
    const allPoints = [{ date: 'Initial', pnl: 0, value: 0 }, ...points];

    const pnls = allPoints.map(p => p.pnl);
    const minPnl = Math.min(0, ...pnls);
    const maxPnl = Math.max(1, ...pnls);
    const range = maxPnl - minPnl;

    return allPoints.map(p => ({
      ...p,
      value: 100 - ((p.pnl - minPnl) / (range || 1)) * 100
    }));
  }, [trades]);

  const pointsStr = data.map((d, i) => `${(i / (data.length - 1)) * 100},${d.value}`).join(' ');
  const areaPoints = `0,100 ${pointsStr} 100,100`;

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (data.length - 1));
    setHoveredIndex(index);
    setMousePos({ x, y: e.clientY - rect.top });
  };

  return (
    <div className="relative w-full group" style={{ height }}>
      <svg 
        className="w-full h-full" 
        preserveAspectRatio="none" 
        viewBox="0 0 100 100"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id="performanceGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <polyline
          points={pointsStr}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          points={areaPoints}
          fill="url(#performanceGrad)"
          opacity="0.1"
        />
        
        {hoveredIndex !== null && (
          <line
            x1={(hoveredIndex / (data.length - 1)) * 100}
            y1="0"
            x2={(hoveredIndex / (data.length - 1)) * 100}
            y2="100"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <AnimatePresence>
        {hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-50 pointer-events-none bg-slate-900/90 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-xl text-[10px] min-w-[80px]"
            style={{ 
              left: Math.min(mousePos.x + 10, 300), 
              top: Math.max(mousePos.y - 40, 0)
            }}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 font-bold uppercase">{data[hoveredIndex].date}</span>
              <span className={`font-bold ${data[hoveredIndex].pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data[hoveredIndex].pnl >= 0 ? '+' : ''}₹{data[hoveredIndex].pnl.toLocaleString('en-IN')}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ViewToggle = ({ activeView, onToggle }: { activeView: 'chart' | 'chain', onToggle: (view: 'chart' | 'chain') => void }) => (
  <div className="mb-2 flex rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner dark:border-white/10 dark:bg-white/[0.045]">
    <button 
      onClick={() => onToggle('chart')}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${activeView === 'chart' ? 'bg-white text-primary shadow-lg dark:bg-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
    >
      <CandlestickChart className="w-4 h-4" />
      Chart
    </button>
    <button 
      onClick={() => onToggle('chain')}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${activeView === 'chain' ? 'bg-white text-primary shadow-lg dark:bg-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
    >
      <ReceiptText className="w-4 h-4" />
      Option Chain
    </button>
  </div>
);

const makeClientId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const findOptionRow = (marketData: Record<string, any>, symbol: string, strike?: number, optionType?: 'CE' | 'PE', securityId?: string) => {
  const chain = marketData[symbol]?.optionChain || [];
  return chain.find((row: OptionStrike) => {
    const sideToken = optionType === 'CE' ? row.ce_security_id : row.pe_security_id;
    return securityId ? String(sideToken) === String(securityId) : Number(row.strike) === Number(strike);
  });
};

const getWatchlistQuote = (item: WatchlistItem, marketData: Record<string, any>) => {
  if (item.instrumentType === 'INDEX') {
    const data = marketData[item.symbol] || {};
    return {
      ltp: Number(data.price || 0),
      change: Number(data.change || 0),
      changePct: Number(data.changePct || ((data.change || 0) / (data.price || 1)) * 100 || 0),
      volume: Number(data.volume || 0),
      oi: undefined as number | undefined,
    };
  }

  const row = findOptionRow(marketData, item.symbol, item.strikePrice, item.optionType, item.securityId);
  const isCE = item.optionType === 'CE';
  return {
    ltp: Number(isCE ? row?.ce_ltp || 0 : row?.pe_ltp || 0),
    change: Number(isCE ? row?.ce_change || 0 : row?.pe_change || 0),
    changePct: Number(isCE ? row?.ce_change_pct || 0 : row?.pe_change_pct || 0),
    volume: Number(isCE ? row?.ce_volume || 0 : row?.pe_volume || 0),
    oi: Number(isCE ? row?.ce_oi || 0 : row?.pe_oi || 0),
  };
};

const buildOrderInstrument = (symbol: string, row: OptionStrike, optionType: 'CE' | 'PE', expiry: string): OrderTicketInstrument => {
  const securityId = optionType === 'CE' ? row.ce_security_id : row.pe_security_id;
  const ltp = optionType === 'CE' ? row.ce_ltp : row.pe_ltp;
  return {
    securityId: securityId || '',
    symbol,
    displaySymbol: `${symbol} ${row.strike} ${optionType}`,
    underlying: symbol,
    strikePrice: row.strike,
    optionType,
    expiry,
    lotSize: LOT_SIZES[symbol as SymbolName] || 50,
    ltp: ltp || 0,
    exchangeSegment: 'NSE_FNO',
    instrument: 'OPTIDX',
  };
};

const OrderTicketModal = memo(({
  instrument,
  marketData,
  userProfile,
  onClose,
  onPlaceOrder,
}: {
  instrument: OrderTicketInstrument;
  marketData: Record<string, any>;
  userProfile: any;
  onClose: () => void;
  onPlaceOrder: (instrument: OrderTicketInstrument, side: 'BUY' | 'SELL', price: number, quantity: number, orderType: 'MARKET' | 'LIMIT') => Promise<boolean>;
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState(instrument.lotSize);
  const [limitPrice, setLimitPrice] = useState(instrument.ltp);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const liveRow = findOptionRow(marketData, instrument.symbol, instrument.strikePrice, instrument.optionType, instrument.securityId);
  const liveLtp = Number(instrument.optionType === 'CE' ? liveRow?.ce_ltp || instrument.ltp : liveRow?.pe_ltp || instrument.ltp);
  const price = orderType === 'MARKET' ? liveLtp : Number(limitPrice || 0);
  const premiumValue = Math.max(0, quantity) * Math.max(0, price);
  const estimatedCharges = 20 + premiumValue * 0.0007;
  const requiredMargin = side === 'SELL' ? Math.ceil(quantity / instrument.lotSize) * 100000 : premiumValue + estimatedCharges;
  const isValidQuantity = quantity > 0 && quantity % instrument.lotSize === 0;
  const canSubmit = Boolean(instrument.securityId) && isValidQuantity && price > 0 && !isSubmitting;

  useEffect(() => {
    if (orderType === 'MARKET') setLimitPrice(liveLtp);
  }, [liveLtp, orderType]);

  const submit = async () => {
    if (!canSubmit) return;
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const placed = await onPlaceOrder(instrument, side, price, quantity, orderType);
      if (placed) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xl">
      <div className="premium-card premium-gradient-line w-full max-w-md overflow-hidden">
        <div className="border-b border-slate-200/70 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Order Ticket</p>
              <h3 className="mt-1 text-xl font-black tracking-tight">{instrument.displaySymbol}</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">{instrument.expiry || 'Current expiry'} - Lot {instrument.lotSize}</p>
            </div>
            <button onClick={onClose} className="rounded-2xl bg-slate-100 p-2 text-slate-500 hover:text-primary dark:bg-white/10">
              <Plus className="h-5 w-5 rotate-45" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setSide('BUY')} className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${side === 'BUY' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>BUY</button>
            <button onClick={() => setSide('SELL')} className={`rounded-2xl px-4 py-3 text-sm font-black transition-all ${side === 'SELL' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>SELL</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="premium-panel p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Live LTP</p>
              <p className="mt-1 text-2xl font-black text-primary">Rs {liveLtp.toFixed(2)}</p>
            </div>
            <div className="premium-panel p-4">
              <p className="text-[10px] font-black uppercase text-slate-400">Available Margin</p>
              <p className="mt-1 text-lg font-black">Rs {Number(userProfile?.balance || 0).toLocaleString('en-IN')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setOrderType('MARKET')} className={`rounded-2xl px-4 py-3 text-xs font-black ${orderType === 'MARKET' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>Market</button>
            <button onClick={() => setOrderType('LIMIT')} className={`rounded-2xl px-4 py-3 text-xs font-black ${orderType === 'LIMIT' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>Limit</button>
          </div>

          {orderType === 'LIMIT' && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-400">Limit Price</span>
              <input
                type="number"
                value={limitPrice}
                min="0"
                step="0.05"
                onChange={(event) => setLimitPrice(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary dark:border-white/10 dark:bg-white/10"
              />
            </label>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Quantity</span>
              <span className={`text-[10px] font-bold ${isValidQuantity ? 'text-emerald-500' : 'text-red-500'}`}>Lot multiple: {instrument.lotSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(Math.max(instrument.lotSize, quantity - instrument.lotSize))} className="rounded-2xl bg-slate-100 p-3 dark:bg-white/10"><Minus className="h-4 w-4" /></button>
              <input
                type="number"
                value={quantity}
                min={instrument.lotSize}
                step={instrument.lotSize}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black outline-none focus:border-primary dark:border-white/10 dark:bg-white/10"
              />
              <button onClick={() => setQuantity(quantity + instrument.lotSize)} className="rounded-2xl bg-slate-100 p-3 dark:bg-white/10"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary/10 p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-slate-400">Premium Value</p><p className="font-black">Rs {premiumValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>
              <div><p className="text-slate-400">Required Margin</p><p className="font-black">Rs {requiredMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div>
              <div><p className="text-slate-400">Estimated Risk</p><p className="font-black">{side === 'BUY' ? 'Premium paid' : 'Margin exposure'}</p></div>
              <div><p className="text-slate-400">Order Type</p><p className="font-black">{orderType}</p></div>
            </div>
          </div>

          {isConfirming && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-600">
              Confirm {side} {instrument.displaySymbol}, Qty {quantity}, at Rs {price.toFixed(2)}.
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`w-full rounded-2xl py-4 text-sm font-black text-white transition-all disabled:cursor-not-allowed disabled:bg-slate-400 ${side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
          >
            {isSubmitting ? 'Placing...' : isConfirming ? 'Confirm Order' : `${side} ${instrument.optionType}`}
          </button>
        </div>
      </div>
    </div>
  );
});
OrderTicketModal.displayName = 'OrderTicketModal';

const WatchlistRow = memo(({
  item,
  quote,
  onOpenChart,
  onBuy,
  onRemove,
}: {
  item: WatchlistItem;
  quote: ReturnType<typeof getWatchlistQuote>;
  onOpenChart: (item: WatchlistItem) => void;
  onBuy: (item: WatchlistItem) => void;
  onRemove: (item: WatchlistItem) => void;
}) => {
  const isUp = quote.change >= 0;
  return (
    <div className="premium-card premium-card-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => onOpenChart(item)} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-black text-slate-900 dark:text-white">{item.displaySymbol}</p>
            {item.optionType && (
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black text-white ${item.optionType === 'CE' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                {item.optionType}
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {item.instrumentType === 'INDEX' ? 'Index' : `${item.expiry || 'Expiry'} - Lot ${item.lotSize}`}
          </p>
        </button>
        <div className="text-right">
          <p className="text-lg font-black text-slate-900 dark:text-white">{quote.ltp ? quote.ltp.toFixed(2) : '--'}</p>
          <p className={`text-[10px] font-black ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {quote.ltp ? `${isUp ? '+' : ''}${quote.change.toFixed(2)} (${quote.changePct.toFixed(2)}%)` : 'Waiting'}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded-2xl bg-slate-100/80 p-2 dark:bg-white/[0.06]">
          <p className="text-slate-400">Volume</p>
          <p className="font-black">{quote.volume ? quote.volume.toLocaleString('en-IN') : '--'}</p>
        </div>
        <div className="rounded-2xl bg-slate-100/80 p-2 dark:bg-white/[0.06]">
          <p className="text-slate-400">OI</p>
          <p className="font-black">{quote.oi ? quote.oi.toLocaleString('en-IN') : '--'}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onOpenChart(item)} className="flex-1 rounded-2xl bg-primary/10 px-2 text-primary"><CandlestickChart className="mx-auto h-4 w-4" /></button>
          {item.instrumentType === 'OPTION' && <button onClick={() => onBuy(item)} className="flex-1 rounded-2xl bg-emerald-500 px-2 text-white"><ReceiptText className="mx-auto h-4 w-4" /></button>}
          <button onClick={() => onRemove(item)} className="flex-1 rounded-2xl bg-red-500/10 px-2 text-red-500"><Trash2 className="mx-auto h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
});
WatchlistRow.displayName = 'WatchlistRow';

const WatchlistView = ({
  watchlists,
  items,
  selectedWatchlistId,
  marketData,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
  onSelectWatchlist,
  onAddIndex,
  onRemoveItem,
  onOpenChart,
  onBuy,
}: {
  watchlists: Watchlist[];
  items: WatchlistItem[];
  selectedWatchlistId: string;
  marketData: Record<string, any>;
  onCreateWatchlist: (name: string) => void;
  onRenameWatchlist: (id: string, name: string) => void;
  onDeleteWatchlist: (id: string) => void;
  onSelectWatchlist: (id: string) => void;
  onAddIndex: (symbol: SymbolName) => void;
  onRemoveItem: (item: WatchlistItem) => void;
  onOpenChart: (item: WatchlistItem) => void;
  onBuy: (item: WatchlistItem) => void;
}) => {
  const selectedWatchlist = watchlists.find((list) => list.id === selectedWatchlistId) || watchlists[0];
  const [newName, setNewName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [indexToAdd, setIndexToAdd] = useState<SymbolName>('Nifty 50');

  useEffect(() => {
    setRenameValue(selectedWatchlist?.name || '');
  }, [selectedWatchlist?.id, selectedWatchlist?.name]);

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateWatchlist(name);
    setNewName('');
  };

  const rename = () => {
    const name = renameValue.trim();
    if (!selectedWatchlist || !name) return;
    onRenameWatchlist(selectedWatchlist.id, name);
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-28">
      <div className="premium-card premium-gradient-line p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">TradingView-style Watchlists</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">Live Watchlist</h2>
        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Add indexes or CE/PE strikes, open premium charts, and place orders from one terminal panel.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {watchlists.map((list) => (
          <button
            key={list.id}
            onClick={() => onSelectWatchlist(list.id)}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-xs font-black transition-all ${selectedWatchlistId === list.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}
          >
            {list.name}
          </button>
        ))}
      </div>

      <div className="premium-card p-4">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Create watchlist"
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary dark:border-white/10 dark:bg-white/10"
          />
          <button onClick={create} className="rounded-2xl bg-primary px-4 text-white"><Plus className="h-5 w-5" /></button>
        </div>

        {selectedWatchlist && (
          <div className="mt-3 flex gap-2">
            <input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary dark:border-white/10 dark:bg-white/10"
            />
            <button onClick={rename} className="rounded-2xl bg-slate-900 px-4 text-white dark:bg-white/10"><Save className="h-5 w-5" /></button>
            <button onClick={() => onDeleteWatchlist(selectedWatchlist.id)} className="rounded-2xl bg-red-500/10 px-4 text-red-500"><Trash2 className="h-5 w-5" /></button>
          </div>
        )}
      </div>

      <div className="premium-card p-4">
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Add index</p>
        <div className="flex gap-2">
          <select
            value={indexToAdd}
            onChange={(event) => setIndexToAdd(event.target.value as SymbolName)}
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary dark:border-white/10 dark:bg-white/10"
          >
            {SYMBOLS.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
          </select>
          <button onClick={() => onAddIndex(indexToAdd)} className="rounded-2xl bg-primary px-4 text-sm font-black text-white">Add</button>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="premium-card p-8 text-center">
            <p className="text-sm font-black">No instruments yet</p>
            <p className="mt-1 text-xs text-slate-400">Add an index here, or use +WL from the option chain.</p>
          </div>
        ) : (
          items.map((item) => (
            <WatchlistRow
              key={item.id}
              item={item}
              quote={getWatchlistQuote(item, marketData)}
              onOpenChart={onOpenChart}
              onBuy={onBuy}
              onRemove={onRemoveItem}
            />
          ))
        )}
      </div>
    </div>
  );
};

const TradeView = memo(({ 
  onViewOptionChain, 
  price, 
  change, 
  timestamp,
  optionChain,
  selectedSymbol,
  onSymbolChange,
  selectedStrike,
  onStrikeChange,
  onTrade,
  chartSelection,
  liveChartTick,
  onChartSelectionChange,
  openPositions = [],
  isLive = false,
  connectionStatus = 'disconnected',
  expiry = '',
  isMarketOpen = false,
  dataSource = 'Live',
  darkMode = false
}: { 
  onViewOptionChain: () => void, 
  price: number, 
  change: number,
  timestamp: string,
  optionChain: any[],
  selectedSymbol: string,
  onSymbolChange: (symbol: string) => void,
  selectedStrike: number,
  onStrikeChange: (strike: number) => void,
  onTrade: (type: 'BUY' | 'SELL', strike: number, price: number, optionType: 'CE' | 'PE') => void,
  chartSelection: ChartSelection,
  liveChartTick?: ChartTick | null,
  onChartSelectionChange: (selection: ChartSelection) => void,
  openPositions?: Trade[],
  isLive?: boolean,
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting' | 'polling',
  expiry?: string,
  isMarketOpen?: boolean,
  dataSource?: string,
  darkMode?: boolean
}) => {
  const [timeframe, setTimeframe] = useState<'1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '1D'>('5m');

  const [tradeAction, setTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [confirmOrder, setConfirmOrder] = useState<{ type: 'CE' | 'PE', price: number } | null>(null);
  const timeframeOptions = ['1m', '3m', '5m', '15m', '30m', '1h', '1D'] as const;

  useEffect(() => {
    if (chartSelection.timeframe === timeframe) return;
    onChartSelectionChange({
      ...chartSelection,
      timeframe,
      chartKey: buildChartKey(chartSelection, timeframe),
    });
  }, [
    chartSelection.chartKey,
    chartSelection.exchangeSegment,
    chartSelection.instrument,
    chartSelection.kind,
    chartSelection.optionType,
    chartSelection.securityId,
    chartSelection.strike,
    chartSelection.symbol,
    chartSelection.timeframe,
    onChartSelectionChange,
    timeframe,
  ]);

  useEffect(() => {
    if (optionChain.length > 0 && selectedStrike === 0) {
      const atm = optionChain.reduce((prev, curr) => 
        Math.abs(curr.strike - price) < Math.abs(prev.strike - price) ? curr : prev
      );
      onStrikeChange(atm.strike);
    }
  }, [optionChain, price, selectedStrike, onStrikeChange]);

  const selectedStrikeData = useMemo(
    () => optionChain.find(s => s.strike === selectedStrike),
    [optionChain, selectedStrike]
  );

  const pcrStats = useMemo(() => {
    const totalCE = optionChain.reduce((s, d) => s + d.ce_oi, 0);
    const totalPE = optionChain.reduce((s, d) => s + d.pe_oi, 0);
    const pcrValue = totalCE > 0 ? totalPE / totalCE : 0;
    return {
      label: totalCE > 0 ? pcrValue.toFixed(2) : '0.00',
      tone: pcrValue > 1.1 ? 'text-emerald-500' : pcrValue < 0.9 ? 'text-rose-500' : 'text-slate-400',
      sentiment: pcrValue > 1.1 ? 'Bullish' : pcrValue < 0.9 ? 'Bearish' : 'Neutral',
    };
  }, [optionChain]);

  const handleIntervalChange = useCallback((next: typeof timeframe) => setTimeframe(next), []);

  const lotSize = selectedSymbol.includes('Bank') ? 15 : 
                  selectedSymbol.includes('Midcap') ? 75 : 
                  selectedSymbol.includes('Fin') ? 40 : 50;

  const handleConfirm = () => {
    if (confirmOrder) {
      onTrade(tradeAction, selectedStrike, confirmOrder.price, confirmOrder.type);
      setConfirmOrder(null);
    }
  };

  return (
    <div className="relative flex flex-col gap-4 p-4 pb-52 sm:gap-5">
      {/* Order Confirmation Overlay */}
      {confirmOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="premium-card premium-gradient-line w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl ${tradeAction === 'BUY' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                <ReceiptText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Confirm Order</h4>
                <p className="text-xl font-black tracking-tighter">{tradeAction} {selectedSymbol} {selectedStrike} {confirmOrder.type}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="premium-panel p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</p>
                <p className="text-lg font-bold">{lotSize} <span className="text-[10px] text-slate-500 font-medium">(1 Lot)</span></p>
              </div>
              <div className="premium-panel p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Premium</p>
                <p className="text-lg font-bold">₹{confirmOrder.price.toFixed(2)}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-primary/25 bg-primary/10 p-4 shadow-inner shadow-primary/5">
                <p className="text-[10px] font-bold text-primary uppercase mb-1">Estimated {tradeAction === 'BUY' ? 'Cost' : 'Credit'}</p>
                <p className="text-2xl font-black text-primary tracking-tighter">₹{(confirmOrder.price * lotSize).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                {tradeAction === 'SELL' && <p className="text-[8px] text-primary/60 font-medium mt-1">Requires ₹1,00,000 Margin</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmOrder(null)}
                className="premium-action flex-1 bg-slate-100 py-4 text-xs uppercase hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                className={`premium-action flex-[2] py-4 text-xs uppercase text-white shadow-xl ${
                  tradeAction === 'BUY' ? 'bg-trading-up shadow-emerald-500/20' : 'bg-trading-down shadow-red-500/20'
                }`}
              >
                Confirm {tradeAction}
              </button>
            </div>
          </div>
        </div>
      )}

      <ViewToggle activeView="chart" onToggle={(v) => v === 'chain' && onViewOptionChain()} />
      
      <div className="flex gap-2 overflow-x-auto hide-scrollbar rounded-[1.35rem] border border-slate-200/70 bg-white/50 p-1.5 dark:border-white/10 dark:bg-white/[0.035]">
        {SYMBOLS.map((idx) => (
          <button 
            key={idx}
            onClick={() => {
              onSymbolChange(idx);
              onChartSelectionChange({
                kind: 'index',
                symbol: idx,
                securityId: INDEX_SECURITY_IDS[idx],
                timeframe,
                chartKey: buildChartKey({
                  kind: 'index',
                  symbol: idx,
                  securityId: INDEX_SECURITY_IDS[idx],
                  exchangeSegment: 'IDX_I',
                  instrument: 'INDEX',
                }, timeframe),
                exchangeSegment: 'IDX_I',
                instrument: 'INDEX',
              });
            }}
            className={`whitespace-nowrap px-4 py-2.5 text-sm ${
              selectedSymbol === idx ? 'premium-chip premium-chip-active' : 'premium-chip hover:text-primary'
            }`}
          >
            {idx}
          </button>
        ))}
      </div>

      <div className="flex rounded-[1.35rem] border border-slate-200/70 bg-white/50 p-1 dark:border-white/10 dark:bg-white/[0.035]">
        {timeframeOptions.map((tf) => (
          <button 
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 rounded-2xl py-2.5 text-xs font-black transition-all ${
              timeframe === tf ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-white/70 hover:text-slate-600 dark:hover:bg-white/[0.08] dark:hover:text-slate-200'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="premium-card premium-gradient-line p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
              connectionStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20' : 
              connectionStatus === 'polling' ? 'bg-blue-500/10 border-blue-500/20' :
              connectionStatus === 'reconnecting' ? 'bg-amber-500/10 border-amber-500/20' :
              'bg-rose-500/10 border-rose-500/20'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                connectionStatus === 'polling' ? 'bg-blue-500 animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-amber-500 animate-bounce' :
                'bg-rose-500'
              }`} />
              <span className={`text-[8px] font-black uppercase tracking-wider ${
                connectionStatus === 'connected' ? 'text-emerald-500' : 
                connectionStatus === 'polling' ? 'text-blue-500' :
                connectionStatus === 'reconnecting' ? 'text-amber-500' :
                'text-rose-500'
              }`}>
                {connectionStatus === 'connected' ? 'Live' : 
                 connectionStatus === 'polling' ? 'Polling' :
                 connectionStatus === 'reconnecting' ? 'Reconnecting...' : 
                 'Disconnected'}
              </span>
            </div>
            
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
              isMarketOpen ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'
            }`}>
              <span className={`text-[8px] font-black uppercase tracking-wider ${
                isMarketOpen ? 'text-emerald-500' : 'text-slate-500'
              }`}>
                {isMarketOpen ? 'Market Open' : 'Market Closed'}
              </span>
            </div>

            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
              dataSource === 'Stale' ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20'
            }`}>
              <span className={`text-[8px] font-black uppercase tracking-wider ${
                dataSource === 'Stale' ? 'text-red-500' : 'text-primary'
              }`}>
                {dataSource === 'Stale' ? 'OFFLINE' : dataSource || 'Live'}
              </span>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">As of {timestamp || '--:--:--'} IST</p>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="premium-value text-4xl">{(price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <span className={`flex items-center rounded-full px-2 py-1 text-sm font-black ${(change || 0) >= 0 ? 'bg-emerald-500/10 text-trading-up' : 'bg-red-500/10 text-trading-down'}`}>
            {(change || 0) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(change || 0).toFixed(2)} ({((change || 0) / (price || 1) * 100).toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Lightweight Chart — replaces TradingView */}
      <LWChart
        selection={chartSelection}
        interval={timeframe}
        onIntervalChange={handleIntervalChange}
        liveTick={liveChartTick}
        darkMode={darkMode}
        height={380}
      />

      <button 
        onClick={onViewOptionChain}
        className="premium-card premium-card-hover flex w-full items-center justify-between p-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary p-2.5 text-white shadow-lg shadow-primary/25 transition-transform group-hover:scale-110">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="font-bold text-slate-900 dark:text-white">Option Chain</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Analyze Strikes & OI</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-primary">{expiry || '-- --- ----'}</span>
            <span className="text-[8px] text-slate-400 font-bold uppercase">Weekly Expiry</span>
          </div>
          <ChevronRight className="w-5 h-5 text-primary" />
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="premium-card p-4">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">PCR Ratio</p>
          <p className="text-lg font-bold">{pcrStats.label}</p>
          <p className={`text-[10px] font-bold ${pcrStats.tone}`}>
            {pcrStats.sentiment}
          </p>
        </div>
        <div className="premium-card p-4">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">India VIX</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-bold">14.22</p>
            <span className="text-[10px] text-trading-up font-bold">+2.4%</span>
          </div>
          <div className="w-full h-1 bg-slate-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-primary w-[40%] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-[76px] left-0 right-0 z-40 mx-auto max-w-md space-y-4 border-t border-slate-200/80 bg-white/92 p-4 shadow-[0_-22px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#090c14]/94 dark:shadow-[0_-24px_80px_rgba(0,0,0,0.46)]">
        {/* BUY/SELL Selector */}
        <div className="flex gap-2 rounded-2xl border border-slate-200/70 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/[0.045]">
          <button 
            onClick={() => setTradeAction('BUY')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              tradeAction === 'BUY' ? 'bg-white text-trading-up shadow-lg dark:bg-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            BUY Side
          </button>
          <button 
            onClick={() => setTradeAction('SELL')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              tradeAction === 'SELL' ? 'bg-white text-trading-down shadow-lg dark:bg-white/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            SELL Side
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
            <span>Select Strike Price</span>
            <span className="text-primary">{selectedStrike.toLocaleString()}</span>
          </div>
          <div className="relative flex h-12 w-full items-center overflow-x-auto rounded-full border border-slate-200/70 bg-slate-100/80 px-1 hide-scrollbar dark:border-white/10 dark:bg-white/[0.045]">
            {optionChain.map((s) => (
              <button
                key={s.strike}
                onClick={() => onStrikeChange(s.strike)}
                className={`flex-1 min-w-[60px] h-10 rounded-full text-[10px] font-bold transition-all ${
                  selectedStrike === s.strike ? 'z-10 scale-105 bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {s.strike}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-4">
            <button 
              onClick={() => setConfirmOrder({ type: 'CE', price: selectedStrikeData?.ce_ltp || 0 })}
              disabled={!selectedStrikeData}
              className={`premium-action flex flex-1 flex-col items-center justify-center py-4 font-black text-white shadow-lg ${
                tradeAction === 'BUY' ? 'bg-trading-up hover:bg-emerald-600 shadow-emerald-900/25' : 'bg-trading-down hover:bg-red-600 shadow-red-900/25'
              }`}
            >
              <span className="text-lg leading-none mb-1">{tradeAction} CE</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] opacity-90">LTP: ₹{selectedStrikeData?.ce_ltp?.toFixed(2) || '0.00'}</span>
                <span className="text-[7px] font-black uppercase opacity-60 leading-none">Est. Charges: ₹25</span>
              </div>
            </button>
            <button 
              onClick={() => setConfirmOrder({ type: 'PE', price: selectedStrikeData?.pe_ltp || 0 })}
              disabled={!selectedStrikeData}
              className={`premium-action flex flex-1 flex-col items-center justify-center py-4 font-black text-white shadow-lg ${
                tradeAction === 'BUY' ? 'bg-trading-down hover:bg-red-600 shadow-red-900/25' : 'bg-trading-up hover:bg-emerald-600 shadow-emerald-900/25'
              }`}
            >
              <span className="text-lg leading-none mb-1">{tradeAction} PE</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] opacity-90">LTP: ₹{selectedStrikeData?.pe_ltp?.toFixed(2) || '0.00'}</span>
                <span className="text-[7px] font-black uppercase opacity-60 leading-none">Est. Charges: ₹25</span>
              </div>
            </button>
          </div>
          
          {tradeAction === 'BUY' && (
            <button 
              onClick={() => {
                setConfirmOrder({ type: 'CE', price: selectedStrikeData?.ce_ltp || 0 });
                // Note: Straddle usually implies both CE and PE, 
                // for simplicity we'll let user handle one by one or expand this later
              }}
              disabled={!selectedStrikeData}
              className="premium-action flex w-full flex-col items-center justify-center border border-white/10 bg-slate-900 py-4 font-black text-white shadow-lg hover:bg-slate-950 dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
            >
              <span className="text-lg leading-none mb-1">BUY STRADDLE (CE + PE)</span>
              <span className="text-[10px] opacity-70 italic">Combined Premium: ₹{((selectedStrikeData?.ce_ltp || 0) + (selectedStrikeData?.pe_ltp || 0)).toFixed(2)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
TradeView.displayName = 'TradeView';

const OptionChainView = ({ 
  symbol, 
  optionChain, 
  spotPrice, 
  onSelectStrike, 
  expiry, 
  expiries = [],
  isLoading,
  onSymbolChange,
  onExpiryChange,
  dataSource,
  onShowChart
}: { 
  symbol: string, 
  optionChain: any[], 
  spotPrice: number, 
  onSelectStrike: (strike: number) => void, 
  expiry: string, 
  expiries?: string[],
  isLoading?: boolean,
  onSymbolChange?: (s: string) => void,
  onExpiryChange?: (e: string) => void,
  dataSource?: string,
  onShowChart?: () => void
}) => {
  const [selectedExpiry, setSelectedExpiry] = useState(expiry);
  
  useEffect(() => {
    setSelectedExpiry(expiry);
  }, [expiry]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 pb-24 animate-pulse">
        <ViewToggle activeView="chain" onToggle={(v) => v === 'chart' && onShowChart?.()} />
        <div className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 h-16">
          <div className="w-24 h-4 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="w-24 h-4 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="w-16 h-4 bg-slate-200 dark:bg-white/10 rounded" />
        </div>
        <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 h-48 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fetching Option Chain...</span>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 h-64" />
      </div>
    );
  }


  const totalCE_OI = optionChain.reduce((sum, d) => sum + d.ce_oi, 0);
  const totalPE_OI = optionChain.reduce((sum, d) => sum + d.pe_oi, 0);
  const pcr = totalCE_OI > 0 ? (totalPE_OI / totalCE_OI).toFixed(2) : '0.00';
  const pcrSentiment = Number(pcr) > 1.1 ? 'Bullish' : Number(pcr) < 0.9 ? 'Bearish' : 'Neutral';

  const atmStrike = optionChain.length > 0 
    ? optionChain.reduce((prev, curr) => 
        Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? curr : prev
      ).strike 
    : 0;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <ViewToggle activeView="chain" onToggle={(v) => v === 'chart' && onShowChart?.()} />
      
      {/* Symbol Switcher */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {SYMBOLS.map((idx) => (
              <button 
                key={idx}
                onClick={() => onSymbolChange?.(idx)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
                  symbol === idx ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                }`}
              >
                {idx}
              </button>
            ))}
          </div>
          {dataSource && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
              <div className={`w-1.5 h-1.5 rounded-full ${dataSource === 'Simulated' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="text-[8px] font-black uppercase text-slate-500">{dataSource}</span>
            </div>
          )}
        </div>
        
        {dataSource === 'Simulated' && (
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Viewing Simulated Data. Connect a Live API in Settings for Real-time feeds.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">{symbol} Spot</span>
          <span className="text-lg font-bold">{(spotPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Expiry</span>
          <select 
            value={selectedExpiry}
            onChange={(e) => {
              setSelectedExpiry(e.target.value);
              onExpiryChange?.(e.target.value);
            }}
            className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
          >
            {expiries && expiries.length > 0 ? (
              expiries.map((exp) => (
                <option key={exp} value={exp} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {exp}
                </option>
              ))
            ) : (
              <>
                <option value={expiry}>{expiry}</option>
                <option value="Next Expiry">Next Expiry</option>
              </>
            )}
          </select>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase">PCR</span>
          <div className="flex flex-col items-end">
            <span className="text-lg font-bold">{pcr}</span>
            <span className={`text-[8px] font-black uppercase ${
              pcrSentiment === 'Bullish' ? 'text-emerald-500' : 
              pcrSentiment === 'Bearish' ? 'text-rose-500' : 'text-slate-400'
            }`}>{pcrSentiment}</span>
          </div>
        </div>
      </div>



      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-[10px] border-collapse min-w-[400px]">
          <thead>
            <tr className="bg-slate-100 dark:bg-white/5 text-slate-400 uppercase font-bold">
              <th className="p-2 text-left border-b border-slate-200 dark:border-white/10">OI Chg</th>
              <th className="p-2 text-left border-b border-slate-200 dark:border-white/10">OI</th>
              <th className="p-2 text-left border-b border-slate-200 dark:border-white/10">LTP</th>
              <th className="p-2 text-center border-b border-slate-200 dark:border-white/10 bg-slate-200/50 dark:bg-white/10">Strike</th>
              <th className="p-2 text-right border-b border-slate-200 dark:border-white/10">LTP</th>
              <th className="p-2 text-right border-b border-slate-200 dark:border-white/10">OI</th>
              <th className="p-2 text-right border-b border-slate-200 dark:border-white/10">OI Chg</th>
            </tr>
          </thead>
          <tbody>
            {optionChain.map(data => (
              <tr 
                key={data.strike} 
                onClick={() => onSelectStrike(data.strike)}
                className={`border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                  data.strike === atmStrike ? 'bg-primary/5' : ''
                }`}
              >
                <td className={`p-2 font-bold ${data.ce_oi_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {data.ce_oi_change >= 0 ? '+' : ''}{(data.ce_oi_change / 1000).toFixed(1)}k
                </td>
                <td className="p-2 text-slate-500">{(data.ce_oi / 1000).toFixed(1)}k</td>
                <td className="p-2 font-bold text-emerald-500">{data.ce_ltp.toFixed(2)}</td>
                <td className="p-2 text-center font-black bg-slate-50 dark:bg-white/5 text-primary">{data.strike}</td>
                <td className="p-2 text-right font-bold text-red-500">{data.pe_ltp.toFixed(2)}</td>
                <td className="p-2 text-right text-slate-500">{(data.pe_oi / 1000).toFixed(1)}k</td>
                <td className={`p-2 text-right font-bold ${data.pe_oi_change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {data.pe_oi_change >= 0 ? '+' : ''}{(data.pe_oi_change / 1000).toFixed(1)}k
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PortfolioView = ({ portfolio, onClosePosition, userId, allTrades }: { portfolio: Portfolio | null, onClosePosition: (id: string) => void, userId: string, allTrades: Trade[] }) => {
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentTrades = async () => {
      try {
        const trades = await api.getTrades(userId);
        // Filter and limit on client side for now, or I could update the API
        const filtered = trades
          .filter((t: any) => t.status === 'Closed')
          .slice(0, 5);
        setRecentTrades(filtered);
      } catch (err) {
        // Silently fail for recent trades fetch
      } finally {
        setLoading(false);
      }
    };
    fetchRecentTrades();
  }, [userId]);

  if (!portfolio) return <div className="p-8 text-center text-slate-400 font-bold">Loading Portfolio...</div>;

  return (
    <div className="flex flex-col gap-6 p-4 pb-28">
      <div className="premium-card premium-gradient-line p-6">
        <p className="premium-label mb-2">Current Equity</p>
        <div className="flex items-baseline gap-3 mb-6">
          <p className="text-4xl font-bold">₹{portfolio.equity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className={`rounded-full px-2 py-1 text-sm font-black ${portfolio.unrealizedPnl >= 0 ? 'bg-emerald-500/10 text-trading-up' : 'bg-red-500/10 text-trading-down'}`}>
            {portfolio.unrealizedPnl >= 0 ? '+' : ''}{((portfolio.unrealizedPnl / portfolio.balance) * 100).toFixed(2)}%
          </p>
        </div>
        <div className="flex gap-4 border-t border-slate-200/80 pt-6 dark:border-white/10">
          <div className="flex-1">
            <p className="premium-label">Available Balance</p>
            <p className="text-sm font-bold mt-1">₹{portfolio.balance.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-white/10" />
          <div className="flex-1">
            <p className="premium-label">Unrealized P&L</p>
            <p className={`mt-1 text-base font-black ${portfolio.unrealizedPnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
              {portfolio.unrealizedPnl >= 0 ? '+' : ''}₹{portfolio.unrealizedPnl.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black tracking-[-0.03em]">Open Positions ({portfolio.positions.length})</h3>
        <div className="flex flex-col gap-3">
          {portfolio.positions.length === 0 ? (
            <div className="premium-panel border-dashed p-8 text-center font-bold text-slate-400">
              No open positions
            </div>
          ) : (
            portfolio.positions.map(trade => (
              <div key={trade._id || trade.id} className="premium-card premium-card-hover flex flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl px-2.5 py-1 text-[10px] font-black ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {trade.type}
                    </div>
                    <span className="text-sm font-black">{trade.symbol} {trade.strike} {trade.optionType}</span>
                  </div>
                  <button 
                    onClick={() => onClosePosition(trade._id || trade.id)}
                    className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase text-primary transition-colors hover:bg-primary hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    Avg: ₹{trade.price.toFixed(2)} • Qty: {trade.qty}
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-base font-black ${trade.pnl >= 0 ? 'bg-emerald-500/10 text-trading-up' : 'bg-red-500/10 text-trading-down'}`}>
                    {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="premium-card p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-base font-black">Performance</p>
          <div className="flex gap-3 text-[10px] font-bold uppercase">
            {['1D', '1W', '1M', '3M', '1Y'].map((tf, i) => (
              <span key={tf} className={i === 2 ? 'text-primary' : 'text-slate-400'}>{tf}</span>
            ))}
          </div>
        </div>
        <PerformanceChart trades={allTrades} />
        <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase">
          <span>10 Oct</span>
          <span>20 Oct</span>
          <span>30 Oct</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black tracking-[-0.03em]">Statistics</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Win Rate', value: `${(portfolio.stats?.winRate || 0).toFixed(1)}%` },
            { label: 'Profit Factor', value: (portfolio.stats?.profitFactor || 0).toFixed(2) },
            { label: 'Drawdown', value: `${(portfolio.drawdown || 0).toFixed(2)}%`, color: 'text-trading-down' },
            { label: 'Net Total P&L', value: `₹${(portfolio.realizedPnl).toLocaleString('en-IN')}`, color: portfolio.realizedPnl >= 0 ? 'text-trading-up' : 'text-trading-down' },
            { label: 'Avg. Win', value: `+₹${(portfolio.stats?.avgWin || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-trading-up' },
            { label: 'Avg. Loss', value: `-₹${(portfolio.stats?.avgLoss || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-trading-down' },
            { label: 'Total Charges', value: `₹${(portfolio.totalCharges || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: 'text-orange-500' },
          ].map(stat => (
            <div key={stat.label} className="premium-card p-4">
              <p className="premium-label">{stat.label}</p>
              <p className={`mt-1 text-lg font-black ${stat.color || ''}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black tracking-[-0.03em]">Recent Trades</h3>
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-xs font-bold">Loading history...</div>
          ) : recentTrades.length === 0 ? (
            <div className="premium-panel border-dashed p-8 text-center font-bold text-slate-400">
              No recent trades
            </div>
          ) : (
            recentTrades.map(trade => (
              <div key={trade._id || trade.id} className="premium-card premium-card-hover flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    trade.pnl >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'
                  }`}>
                    {trade.symbol[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{trade.symbol}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{trade.time} • Qty: {trade.qty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${trade.pnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
                    {trade.pnl >= 0 ? '+' : ''}₹{Math.abs(trade.pnl).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{trade.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const ChallengesView = ({ onSelectPlan, plans, rules }: { onSelectPlan: (plan: Plan) => void, plans: Plan[], rules: Rule[] }) => {
  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="space-y-6">
        {(plans || []).map(plan => (
          <div 
            key={plan._id || plan.id} 
            className={`premium-card premium-card-hover premium-gradient-line relative p-6 ${
              plan.recommended 
                ? 'border-primary/50 bg-primary/6 shadow-xl shadow-primary/10' 
                : ''
            }`}
          >
            {plan.tag && (
              <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/25">
                {plan.tag}
              </div>
            )}
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black tracking-[-0.03em]">{plan.name}</h3>
                <p className="text-3xl font-black text-primary">₹{plan.price.toLocaleString('en-IN')}</p>
              </div>
              {plan.recommended && (
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Recommended
                </span>
              )}
            </div>
            <div className="mb-8 space-y-4">
              <div className="premium-panel flex items-center justify-between px-4 py-3 text-xs font-bold">
                <span className="premium-label">Funding Amount</span>
                <span>₹{plan.capital.toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.035]">
                <div className="text-center">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Profit</p>
                  <p className="font-bold text-accent-neon">{plan.profit_target}%</p>
                </div>
                <div className="text-center border-x border-slate-200 dark:border-white/10">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Max DD</p>
                  <p className="font-bold text-trading-down">{plan.max_dd}%</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Daily DD</p>
                  <p className="font-bold text-red-400">{plan.daily_dd}%</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onSelectPlan(plan)}
              className={`premium-action flex w-full items-center justify-center gap-2 py-4 ${
                plan.recommended 
                  ? 'bg-gradient-to-r from-primary to-orange-400 text-white shadow-lg shadow-primary/25' 
                  : 'bg-primary/[0.12] text-primary hover:bg-primary hover:text-white'
              }`}
            >
              Select {plan.name.split(' ')[0]} {plan.recommended ? <Trophy className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-primary" />
          Rules FAQ
        </h2>
        <div className="space-y-2">
          {(rules || []).map((rule, i) => (
            <details key={rule._id || rule.id || i} className="premium-card group overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-sm list-none">
                <span className="group-open:text-primary transition-colors">{rule.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5 pt-3">
                <p className="font-black text-primary mb-1">{rule.value}</p>
                {rule.description}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminView = ({ showToast }: { showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'rules' | 'api' | 'challenges'>('clients');
  const [clients, setClients] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // No external provider auth callbacks are used in Dhan-only mode.
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [clientsData, rulesData, challengesData, marketData, notifData] = await Promise.all([
          api.getClients(),
          api.getRules(),
          api.getChallenges(),
          api.getSettings('market'),
          api.getSettings('notifications')
        ]);

        setClients(clientsData);
        setRules(rulesData);
        setChallenges(challengesData);
        setApiSettings(marketData);
        setNotificationSettings(notifData);

      } catch (err: any) {
        // Log sparingly
        if (loading) console.warn('Retrying admin data fetch...');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const handleUpdateBalance = async (clientId: string, newBalance: number) => {
    try {
      const client = clients.find(c => (c._id || c.id) === clientId);
      if (client) {
        await api.upsertUser({ uid: client.uid, balance: newBalance });
        setClients(prev => prev.map(c => (c._id || c.id) === clientId ? { ...c, balance: newBalance } : c));
        showToast('Balance updated successfully');
      }
    } catch (err) {
      showToast('Failed to update balance', 'error');
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: any) => {
    try {
      await api.upsertRule({ _id: ruleId, ...updates });
      setRules(prev => prev.map(r => (r._id || r.id) === ruleId ? { ...r, ...updates } : r));
      showToast('Rule updated successfully');
    } catch (err) {
      showToast('Failed to update rule', 'error');
    }
  };

  const handleUpdateApi = async (updates: any) => {
    try {
      await api.updateSettings('market', updates);
      setApiSettings(updates);
      showToast('API settings updated');
    } catch (err) {
      showToast('Failed to update API settings', 'error');
    }
  };

  const handleUpdateNotifications = async (updates: any) => {
    try {
      await api.updateSettings('notifications', updates);
      setNotificationSettings(updates);
      showToast('Notification settings updated');
    } catch (err) {
      showToast('Failed to update notification settings', 'error');
    }
  };

  const handleUpdateChallenge = async (challengeId: string, updates: any) => {
    try {
      await api.upsertChallenge({ _id: challengeId, ...updates });
      setChallenges(prev => prev.map(c => (c._id || c.id) === challengeId ? { ...c, ...updates } : c));
      showToast('Challenge updated');
    } catch (err) {
      showToast('Failed to update challenge', 'error');
    }
  };

  const handleCreateChallenge = async () => {
    const newChallenge = {
      name: 'New Challenge',
      price: 5000,
      capital: 50000,
      profit_target: 10,
      max_dd: 10,
      daily_dd: 5,
      tag: 'Standard',
      recommended: false
    };
    try {
      const created = await api.upsertChallenge(newChallenge);
      setChallenges(prev => [...prev, created]);
      showToast('New challenge created');
    } catch (err) {
      showToast('Failed to create challenge', 'error');
    }
  };

  const handleDeleteChallenge = async (challengeId: string) => {
    // For simplicity in this demo, we'll just delete without confirm, 
    // or you could implement a custom modal.
    try {
      await api.deleteChallenge(challengeId);
      setChallenges(prev => prev.filter(c => (c._id || c.id) !== challengeId));
      showToast('Challenge deleted');
    } catch (err) {
      showToast('Failed to delete challenge', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Admin Panel...</div>;

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
          <p className="text-red-500 font-bold">Access Denied or Connection Error</p>
          <p className="text-[10px] text-red-500/60 mt-2 break-all font-mono">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-white font-bold rounded-xl text-sm"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {[
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'challenges', label: 'Challenges', icon: Trophy },
          { id: 'rules', label: 'Rules', icon: ShieldCheck },
          { id: 'api', label: 'General Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === tab.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'clients' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Manage Clients</h3>
          {clients.map(client => (
            <div key={client._id || client.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{client.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">{client.email}</p>
                  {client.phoneNumber && (
                    <p className="text-[10px] text-accent-neon font-bold mt-1 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {client.phoneNumber}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${client.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                  {client.role?.toUpperCase() || 'USER'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Current Balance</p>
                  <p className="text-lg font-bold">₹{(client.balance || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Update Wallet</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount"
                      id={`balance-input-${client._id || client.id}`}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold"
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById(`balance-input-${client._id || client.id}`) as HTMLInputElement;
                        const val = Number(input.value);
                        if (val) handleUpdateBalance(client._id || client.id, (client.balance || 0) + val);
                        input.value = '';
                      }}
                      className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                    <button 
                      onClick={() => {
                        const input = document.getElementById(`balance-input-${client._id || client.id}`) as HTMLInputElement;
                        const val = Number(input.value);
                        if (val !== undefined) handleUpdateBalance(client._id || client.id, val);
                        input.value = '';
                      }}
                      className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'challenges' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Challenge Plans</h3>
            <button 
              onClick={handleCreateChallenge}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold"
            >
              <Plus className="w-3 h-3" />
              Add Plan
            </button>
          </div>
          {challenges.map(plan => (
            <div key={plan._id || plan.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Plan Name</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.name}
                        onBlur={(e) => handleUpdateChallenge(plan._id || plan.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tag/Badge</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.tag}
                        onBlur={(e) => handleUpdateChallenge(plan._id || plan.id, { tag: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Price (₹)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.price}
                        onBlur={(e) => handleUpdateChallenge(plan._id || plan.id, { price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Capital (₹)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.capital}
                        onBlur={(e) => handleUpdateChallenge(plan._id || plan.id, { capital: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Target (%)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.profit_target}
                        onBlur={(e) => handleUpdateChallenge(plan._id || plan.id, { profit_target: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Max DD (%)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.max_dd}
                        onBlur={(e) => handleUpdateChallenge(plan._id || plan.id, { max_dd: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Daily DD (%)</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold"
                        defaultValue={plan.daily_dd}
                        onBlur={(e) => handleUpdateChallenge(plan._id || plan.id, { daily_dd: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`rec-${plan._id || plan.id}`}
                      defaultChecked={plan.recommended}
                      onChange={(e) => handleUpdateChallenge(plan._id || plan.id, { recommended: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor={`rec-${plan._id || plan.id}`} className="text-[10px] font-bold text-slate-400 uppercase cursor-pointer">Recommended Plan</label>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteChallenge(plan._id || plan.id)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Trading Rules</h3>
            <button 
              onClick={async () => {
                const newRule = { name: 'New Rule', value: 'Rule Value', description: 'Rule Description' };
                try {
                  const created = await api.upsertRule(newRule);
                  setRules(prev => [...prev, created]);
                  showToast('New rule added');
                } catch (err) {
                  showToast('Failed to add rule', 'error');
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold"
            >
              <Plus className="w-3 h-3" />
              Add Rule
            </button>
          </div>
          {rules.map(rule => (
            <div key={rule._id || rule.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3 relative group">
              <button 
                onClick={async () => {
                  try {
                    await api.deleteRule(rule._id || rule.id);
                    setRules(prev => prev.filter(r => (r._id || r.id) !== (rule._id || rule.id)));
                    showToast('Rule deleted');
                  } catch (err) {
                    showToast('Failed to delete rule', 'error');
                  }
                }}
                className="absolute top-4 right-4 p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <input
                className="w-full bg-transparent font-bold text-sm focus:outline-none"
                defaultValue={rule.name}
                onBlur={(e) => handleUpdateRule(rule._id || rule.id, { name: e.target.value })}
              />
              <input
                className="w-full bg-transparent text-primary text-xs font-bold focus:outline-none"
                defaultValue={rule.value}
                onBlur={(e) => handleUpdateRule(rule._id || rule.id, { value: e.target.value })}
              />
              <textarea
                className="w-full bg-transparent text-slate-400 text-[10px] focus:outline-none resize-none"
                defaultValue={rule.description}
                rows={2}
                onBlur={(e) => handleUpdateRule(rule._id || rule.id, { description: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'api' && (
        <div className="space-y-6">
          <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Withdrawal Notifications</h3>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Admin Receiving Email</label>
              <input
                type="email"
                placeholder="admin@example.com"
                className="w-full bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                defaultValue={notificationSettings?.withdrawalEmail || ''}
                onBlur={(e) => handleUpdateNotifications({ ...notificationSettings, withdrawalEmail: e.target.value })}
              />
              <p className="text-[9px] text-slate-400 italic ml-1">This email will receive notifications for all client withdrawal requests.</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Market API Connections</h3>
            <button 
              onClick={() => {
                const newProvider = { 
                  id: `custom-${Date.now()}`, 
                  name: 'New Custom API', 
                  type: 'custom', 
                  url: '', 
                  headers: {} 
                };
                handleUpdateApi({ 
                  ...apiSettings, 
                  providers: [...(apiSettings.providers || []), newProvider] 
                });
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold"
            >
              <Plus className="w-3 h-3" />
              Add Provider
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Active Provider</p>
              <div className="grid grid-cols-2 gap-2">
                {apiSettings?.providers?.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => handleUpdateApi({ ...apiSettings, activeProviderId: p.id })}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      apiSettings.activeProviderId === p.id 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'border-slate-200 dark:border-white/10 text-slate-400'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {apiSettings?.providers?.map((p: any) => (
              <div key={p.id} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 relative group">
                {p.id !== 'dhan' && (
                  <button 
                    onClick={() => {
                      const newProviders = apiSettings.providers.filter((pr: any) => pr.id !== p.id);
                      handleUpdateApi({ 
                        ...apiSettings, 
                        providers: newProviders,
                        activeProviderId: apiSettings.activeProviderId === p.id ? 'dhan' : apiSettings.activeProviderId
                      });
                    }}
                    className="absolute top-4 right-4 p-1.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiSettings.activeProviderId === p.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{p.name} Configuration</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Display Name</label>
                    <input
                      type="text"
                      defaultValue={p.name}
                      onBlur={(e) => {
                        const newProviders = apiSettings.providers.map((pr: any) => pr.id === p.id ? { ...pr, name: e.target.value } : pr);
                        handleUpdateApi({ ...apiSettings, providers: newProviders });
                      }}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold"
                    />
                  </div>

                  {p.type === 'dhan' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Client ID</label>
                        <input
                          type="text"
                          defaultValue={p.clientId}
                          onBlur={(e) => {
                            const newProviders = apiSettings.providers.map((pr: any) => pr.id === p.id ? { ...pr, clientId: e.target.value } : pr);
                            handleUpdateApi({ ...apiSettings, providers: newProviders });
                          }}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Access Token</label>
                        <input
                          type="password"
                          defaultValue={p.accessToken}
                          onBlur={(e) => {
                            const newProviders = apiSettings.providers.map((pr: any) => pr.id === p.id ? { ...pr, accessToken: e.target.value } : pr);
                            handleUpdateApi({ ...apiSettings, providers: newProviders });
                          }}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl text-xs"
                        />
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/market/dhan/connect', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ clientId: p.clientId, accessToken: p.accessToken })
                              });
                              const data = await response.json();
                              showToast(data.status || 'Connection triggered');
                            } catch (err) {
                              showToast('Failed to trigger connection', 'error');
                            }
                          }}
                          className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors"
                        >
                          Connect & Test
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/market/dhan/reconnect', { method: 'POST' });
                                const data = await response.json();
                                showToast(data.status || 'Reconnection triggered');
                              } catch (err) {
                                showToast('Failed to trigger reconnection', 'error');
                              }
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                          >
                            Reconnect
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/market/dhan/status');
                              const data = await response.json();
                              showToast(`WS: ${data.wsConnected ? 'Connected' : 'Disconnected'} | Auth: ${data.authFailed ? 'Failed' : 'OK'}`);
                              console.log('[Dhan Status]', data);
                            } catch (err) {
                              showToast('Failed to fetch status', 'error');
                            }
                          }}
                          className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
                        >
                          Check Status
                        </button>
                      </div>
                    </div>
                  </>
                )}


                  {p.type === 'custom' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">API Endpoint URL</label>
                        <input
                          type="text"
                          placeholder="https://api.example.com/quotes"
                          defaultValue={p.url}
                          onBlur={(e) => {
                            const newProviders = apiSettings.providers.map((pr: any) => pr.id === p.id ? { ...pr, url: e.target.value } : pr);
                            handleUpdateApi({ ...apiSettings, providers: newProviders });
                          }}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Headers (JSON)</label>
                        <textarea
                          placeholder='{ "Authorization": "Bearer ..." }'
                          defaultValue={JSON.stringify(p.headers || {}, null, 2)}
                          onBlur={(e) => {
                            try {
                              const headers = JSON.parse(e.target.value);
                              const newProviders = apiSettings.providers.map((pr: any) => pr.id === p.id ? { ...pr, headers } : pr);
                              handleUpdateApi({ ...apiSettings, providers: newProviders });
                            } catch (err) {
                              showToast('Invalid JSON in headers', 'error');
                            }
                          }}
                          rows={3}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-[#160d08] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WithdrawalModal = ({ isOpen, onClose, userProfile, user, showToast, setUserProfile }: { isOpen: boolean, onClose: () => void, userProfile: any, user: any, showToast: (msg: string, type?: 'success' | 'error') => void, setUserProfile: (profile: any) => void }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountDetails, setAccountDetails] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    if (withdrawAmount > userProfile.balance) {
      showToast('Insufficient balance', 'error');
      return;
    }

    if (!accountDetails.trim()) {
      showToast('Please enter your account details', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Create transaction record
      await api.addTransaction({
        userId: user.uid,
        type: 'withdrawal',
        amount: withdrawAmount,
        accountDetails: accountDetails.trim()
      });

      // 2. Update user balance
      const newBalance = userProfile.balance - withdrawAmount;
      const updatedProfile = await api.upsertUser({
        uid: user.uid,
        balance: newBalance
      });
      setUserProfile(updatedProfile);

      // 3. Send email notification via backend
      try {
        await fetch('/api/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            userName: userProfile.name,
            userEmail: user.email,
            amount: withdrawAmount,
            method: 'Withdrawal',
            details: accountDetails.trim()
          })
        });
      } catch (emailErr) {
        console.warn('Failed to send withdrawal email notification:', emailErr);
        // We don't fail the whole process if email fails, but we log it
      }

      showToast(`Withdrawal request for ₹${withdrawAmount.toLocaleString('en-IN')} submitted successfully!`);
      onClose();
      setAmount('');
      setAccountDetails('');
    } catch (error) {
      console.error('Withdrawal failed:', error);
      showToast('Failed to submit withdrawal request', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10"
      >
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold">Withdraw Funds</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <Plus className="w-6 h-6 rotate-45 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available Balance</label>
            <p className="text-2xl font-bold text-primary">₹{userProfile?.balance?.toLocaleString('en-IN') || '0.00'}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Withdrawal Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Details (UPI/Bank)</label>
            <textarea 
              value={accountDetails}
              onChange={(e) => setAccountDetails(e.target.value)}
              placeholder="Enter your UPI ID or Bank Account Details (A/C No, IFSC)"
              className="w-full p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 font-bold min-h-[100px]"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                Confirm Withdrawal
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const ProfileView = ({ userProfile, user, showToast, setUserProfile }: { userProfile: any, user: any, showToast: (msg: string, type?: 'success' | 'error') => void, setUserProfile: (profile: any) => void }) => {
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    let consecutiveErrors = 0;
    const fetchTrades = async () => {
      try {
        const trades = await api.getTrades(user.uid);
        // Only get first 10 closed trades for history
        const closed = trades.filter(t => t.status === 'Closed').slice(0, 10);
        setTradeHistory(closed);
        consecutiveErrors = 0;
      } catch (error) {
        consecutiveErrors++;
        // Signal server startup or temporary failure quietly
        if (consecutiveErrors % 10 === 1) {
          console.warn("Retrying trade history fetch (server may be starting)...");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
    const interval = setInterval(fetchTrades, 10000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  return (
    <div className="flex flex-col gap-6 p-4 pb-28">
      <div className="premium-card premium-gradient-line flex flex-col items-center gap-4 p-8 text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-primary/25 bg-gradient-to-br from-primary/20 to-orange-400/5 shadow-2xl shadow-primary/10">
          <User className="h-14 w-14 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-[-0.05em]">{userProfile?.name || 'Trader'}</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Pro Trader • ID: #{userProfile?.uid?.slice(-4) || '----'}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{userProfile?.email} ({userProfile?.role || 'user'})</p>
          {userProfile?.phoneNumber && (
            <p className="mt-2 flex items-center justify-center gap-1 text-[10px] font-black text-emerald-300">
              <Phone className="w-3 h-3" /> {userProfile.phoneNumber}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="premium-card p-4">
          <p className="premium-label mb-1">Wallet Balance</p>
          <p className="text-lg font-bold">₹{userProfile?.balance?.toLocaleString('en-IN') || '0.00'}</p>
          <button 
            onClick={() => setShowWithdrawalModal(true)}
            className="mt-3 rounded-full bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-white"
          >
            Withdraw Funds
          </button>
        </div>
        <div className="premium-card p-4">
          <p className="premium-label mb-1">Total Payouts</p>
          <p className="text-lg font-bold">₹0.00</p>
        </div>
      </div>

      <WithdrawalModal 
        isOpen={showWithdrawalModal} 
        onClose={() => setShowWithdrawalModal(false)}
        userProfile={userProfile}
        user={user}
        showToast={showToast}
        setUserProfile={setUserProfile}
      />

      {userProfile?.email === 'kushwahgourav2018@gmail.com' && userProfile?.role !== 'admin' && (
        <button
          onClick={async () => {
            try {
              await api.upsertUser({ uid: user.uid, role: 'admin' });
              showToast('Admin role granted!');
              // Refresh profile
              const profile = await api.getUser(user.uid);
              setUserProfile(profile);
            } catch (err) {
              console.error(err);
            }
          }}
          className="premium-action flex w-full items-center justify-center gap-2 border border-primary/20 bg-primary/10 py-4 text-primary hover:bg-primary hover:text-white"
        >
          <ShieldCheck className="w-5 h-5" />
          Activate Admin Access
        </button>
      )}

      <div className="space-y-2">
        {[
          { icon: Wallet, label: 'Withdraw Funds', onClick: () => setShowWithdrawalModal(true) },
          { icon: Trophy, label: 'My Certificates' },
          { icon: ReceiptText, label: 'Transaction History' },
          { 
            icon: Phone, 
            label: userProfile?.phoneNumber ? 'Update Mobile Number' : 'Add Mobile Number',
            onClick: () => {
              const phone = window.prompt('Enter your mobile number:', userProfile?.phoneNumber || '');
              if (phone !== null) {
                api.upsertUser({ uid: user.uid, phoneNumber: phone })
                  .then(async () => {
                    showToast('Mobile number updated!');
                    const profile = await api.getUser(user.uid);
                    setUserProfile(profile);
                  })
                  .catch(err => showToast('Failed to update: ' + err.message, 'error'));
              }
            }
          },
          { icon: User, label: 'Account Settings' },
        ].map(item => (
          <button 
            key={item.label} 
            onClick={item.onClick}
            className="premium-card premium-card-hover flex w-full items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-black">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black tracking-[-0.03em]">Recent Trade History</h3>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Symbol</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Type</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Strike</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">LTP</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Qty</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase">Time</th>
                <th className="py-3 text-[10px] font-bold text-slate-400 uppercase text-right">PnL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-bold">Loading history...</td>
                </tr>
              ) : tradeHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-bold">No recent trades</td>
                </tr>
              ) : (
                tradeHistory.map(trade => (
                  <tr key={trade._id || trade.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.035]">
                    <td className="py-3 text-xs font-bold">{trade.symbol}</td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded-[4px] text-[8px] font-black ${
                        trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-3 text-xs font-bold text-slate-500 whitespace-nowrap">{trade.strike} {trade.optionType}</td>
                    <td className="py-3 text-xs font-bold">₹{trade.price.toFixed(2)}</td>
                    <td className="py-3 text-xs font-bold text-slate-500">{trade.qty}</td>
                    <td className="py-3 text-[10px] text-slate-400 font-bold whitespace-nowrap">{trade.time}</td>
                    <td className={`py-3 text-xs font-bold text-right whitespace-nowrap ${trade.pnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
                      {trade.pnl >= 0 ? '+' : ''}₹{Math.abs(trade.pnl).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', 'dark');
      return true;
    }
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'dark-soft');
  }, [darkMode]);

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('trade');
  const [showAuth, setShowAuth] = useState(false);
  const [showOptionChain, setShowOptionChain] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [marketData, setMarketData] = useState<Record<string, any>>({
    'Nifty 50':       { price: 0, change: 0, changePct: 0, dayOpen: 0, dayHigh: 0, dayLow: 0, volume: 0, optionChain: [], timestamp: '--:--:--', expiry: '', expiries: [], isMarketOpen: false, dataSource: 'Stale' },
    'Bank Nifty':     { price: 0, change: 0, changePct: 0, dayOpen: 0, dayHigh: 0, dayLow: 0, volume: 0, optionChain: [], timestamp: '--:--:--', expiry: '', expiries: [], isMarketOpen: false, dataSource: 'Stale' },
    'Fin Nifty':      { price: 0, change: 0, changePct: 0, dayOpen: 0, dayHigh: 0, dayLow: 0, volume: 0, optionChain: [], timestamp: '--:--:--', expiry: '', expiries: [], isMarketOpen: false, dataSource: 'Stale' },
    'Midcap Select':  { price: 0, change: 0, changePct: 0, dayOpen: 0, dayHigh: 0, dayLow: 0, volume: 0, optionChain: [], timestamp: '--:--:--', expiry: '', expiries: [], isMarketOpen: false, dataSource: 'Stale' },
    'Nifty Next 50':  { price: 0, change: 0, changePct: 0, dayOpen: 0, dayHigh: 0, dayLow: 0, volume: 0, optionChain: [], timestamp: '--:--:--', expiry: '', expiries: [], isMarketOpen: false, dataSource: 'Stale' },
    'SENSEX':         { price: 0, change: 0, changePct: 0, dayOpen: 0, dayHigh: 0, dayLow: 0, volume: 0, optionChain: [], timestamp: '--:--:--', expiry: '', expiries: [], isMarketOpen: false, dataSource: 'Stale' },
    'Bankex':         { price: 0, change: 0, changePct: 0, dayOpen: 0, dayHigh: 0, dayLow: 0, volume: 0, optionChain: [], timestamp: '--:--:--', expiry: '', expiries: [], isMarketOpen: false, dataSource: 'Stale' },
  });

  // Use Dexie to observe local market data
  const localMarketData = useLiveQuery(() => db.marketData.toArray());
  const localTrades = useLiveQuery(() => user ? db.trades.where('userId').equals(user.uid).toArray() : Promise.resolve([]));
  const watchlists = useLiveQuery(
    () => user ? db.watchlists.where('userId').equals(user.uid).toArray() : Promise.resolve([]),
    [user?.uid],
    []
  );
  const watchlistItems = useLiveQuery(
    () => user ? db.watchlistItems.where('userId').equals(user.uid).toArray() : Promise.resolve([]),
    [user?.uid],
    []
  );

  useEffect(() => {
    if (localTrades) {
      setAllTrades(localTrades);
    }
  }, [localTrades]);
  const [selectedSymbol, setSelectedSymbol] = useState('Nifty 50');
  const [selectedStrike, setSelectedStrike] = useState<number>(0);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'polling'>('disconnected');
  const [providerStatus, setProviderStatus] = useState<Record<string, { status: string, nextRetryIn?: number, error?: string }>>({});
  const [selectedWatchlistId, setSelectedWatchlistId] = useState('');
  const [orderTicket, setOrderTicket] = useState<OrderTicketInstrument | null>(null);
  const [chartSelection, setChartSelection] = useState<ChartSelection>({
    kind: 'index',
    symbol: 'Nifty 50',
    securityId: INDEX_SECURITY_IDS['Nifty 50'],
    timeframe: '5m',
    chartKey: 'index:Nifty 50:5m',
    exchangeSegment: 'IDX_I',
    instrument: 'INDEX',
  });
  const [latestChartTick, setLatestChartTick] = useState<ChartTick | null>(null);
  const selectedSymbolRef = React.useRef(selectedSymbol);
  const chartSelectionRef = React.useRef(chartSelection);
  const marketDataRef = React.useRef(marketData);
  const portfolioDiagnosticRef = React.useRef(0);
  const socketRef = React.useRef<any>(null);
  const needsResubscribeRef = React.useRef(false);
  const chartSubscribedKeyRef = React.useRef<string | null>(null);

  // Sync Dexie data to state when it changes
  useEffect(() => {
    if (!localMarketData || localMarketData.length === 0) return;
    if (isSocketConnected) return;
    setMarketData(prev => {
      const updated = { ...prev };
      localMarketData.forEach(item => {
        updated[item.symbol] = {
          ...prev[item.symbol],
          price: item.price,
          change: item.change,
          timestamp: item.timestamp,
          optionChain: item.optionChain || prev[item.symbol]?.optionChain || []
        };
      });
      return updated;
    });
  }, [isSocketConnected, localMarketData]);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);
  useEffect(() => {
    chartSelectionRef.current = chartSelection;
  }, [chartSelection]);
  useEffect(() => {
    marketDataRef.current = marketData;
  }, [marketData]);
  const [isOptionChainLoading, setIsOptionChainLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const openPositions = useMemo(() => allTrades.filter(t => t.status === 'Open'), [allTrades]);
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!user || watchlists === undefined) return;
    const storageKey = `selected_watchlist_${user.uid}`;
    if (watchlists.length === 0) {
      const now = new Date().toISOString();
      const defaultWatchlist: Watchlist = {
        id: makeClientId('wl'),
        userId: user.uid,
        name: 'My Watchlist',
        createdAt: now,
        updatedAt: now,
      };
      void db.watchlists.put(defaultWatchlist).then(() => {
        localStorage.setItem(storageKey, defaultWatchlist.id);
        setSelectedWatchlistId(defaultWatchlist.id);
      });
      return;
    }

    const savedId = localStorage.getItem(storageKey);
    const nextId = savedId && watchlists.some((list) => list.id === savedId) ? savedId : watchlists[0].id;
    if (selectedWatchlistId !== nextId) setSelectedWatchlistId(nextId);
  }, [selectedWatchlistId, user, watchlists]);

  const currentWatchlistItems = useMemo(() => {
    return (watchlistItems || []).filter((item) => item.watchlistId === selectedWatchlistId);
  }, [selectedWatchlistId, watchlistItems]);

  const persistSelectedWatchlist = (id: string) => {
    if (!user) return;
    localStorage.setItem(`selected_watchlist_${user.uid}`, id);
    setSelectedWatchlistId(id);
  };

  const createWatchlist = async (name: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const watchlist: Watchlist = {
      id: makeClientId('wl'),
      userId: user.uid,
      name,
      createdAt: now,
      updatedAt: now,
    };
    await db.watchlists.put(watchlist);
    persistSelectedWatchlist(watchlist.id);
    showToast(`Created ${name}`, 'success');
  };

  const renameWatchlist = async (id: string, name: string) => {
    await db.watchlists.update(id, { name, updatedAt: new Date().toISOString() });
    showToast('Watchlist renamed', 'success');
  };

  const deleteWatchlist = async (id: string) => {
    if (!user || (watchlists || []).length <= 1) {
      showToast('Keep at least one watchlist', 'info');
      return;
    }
    await db.watchlists.delete(id);
    await db.watchlistItems.where('[userId+watchlistId]').equals([user.uid, id]).delete();
    const next = (watchlists || []).find((list) => list.id !== id);
    if (next) persistSelectedWatchlist(next.id);
    showToast('Watchlist deleted', 'success');
  };

  const addIndexToWatchlist = async (symbol: SymbolName) => {
    if (!user || !selectedWatchlistId) return;
    const securityId = INDEX_SECURITY_IDS[symbol];
    const duplicate = (watchlistItems || []).some((item) =>
      item.watchlistId === selectedWatchlistId && String(item.securityId) === String(securityId)
    );
    if (duplicate) {
      showToast(`${symbol} already exists in this watchlist`, 'info');
      return;
    }
    const now = new Date().toISOString();
    await db.watchlistItems.put({
      id: makeClientId('wli'),
      userId: user.uid,
      watchlistId: selectedWatchlistId,
      securityId,
      symbol,
      displaySymbol: symbol,
      underlying: symbol,
      instrumentType: 'INDEX',
      lotSize: LOT_SIZES[symbol],
      exchangeSegment: 'IDX_I',
      instrument: 'INDEX',
      createdAt: now,
    });
    if (IS_DEV) console.log('[Watchlist] subscribed tokens', [securityId]);
    showToast(`Added ${symbol}`, 'success');
  };

  const addOptionToWatchlist = async (strike: number, optionType: 'CE' | 'PE', ltp: number) => {
    if (!user || !selectedWatchlistId) return;
    const row = marketData[selectedSymbol]?.optionChain?.find((item: OptionStrike) => Number(item.strike) === Number(strike));
    if (!row) {
      showToast('Option row not available yet', 'error');
      return;
    }
    const securityId = optionType === 'CE' ? row.ce_security_id : row.pe_security_id;
    if (!securityId) {
      showToast('Security ID missing for this strike', 'error');
      return;
    }
    const duplicate = (watchlistItems || []).some((item) =>
      item.watchlistId === selectedWatchlistId && String(item.securityId) === String(securityId)
    );
    if (duplicate) {
      showToast(`${selectedSymbol} ${strike} ${optionType} already exists`, 'info');
      return;
    }
    const now = new Date().toISOString();
    await db.watchlistItems.put({
      id: makeClientId('wli'),
      userId: user.uid,
      watchlistId: selectedWatchlistId,
      securityId: String(securityId),
      symbol: selectedSymbol,
      displaySymbol: `${selectedSymbol} ${strike} ${optionType}`,
      underlying: selectedSymbol,
      instrumentType: 'OPTION',
      strikePrice: strike,
      optionType,
      expiry: marketData[selectedSymbol]?.expiry || '',
      lotSize: LOT_SIZES[selectedSymbol as SymbolName] || 50,
      exchangeSegment: 'NSE_FNO',
      instrument: 'OPTIDX',
      createdAt: now,
    });
    if (IS_DEV) console.log('[Watchlist] subscribed tokens', [String(securityId)]);
    showToast(`Added ${optionType} ${strike} @ ${ltp.toFixed(2)}`, 'success');
  };

  const removeWatchlistItem = async (item: WatchlistItem) => {
    await db.watchlistItems.delete(item.id);
    if (IS_DEV) console.log('[Watchlist] unsubscribe candidate', item.securityId);
    showToast('Removed from watchlist', 'success');
  };

  const syncChartSelection = (selection: ChartSelectionInput) => {
    const timeframe = selection.timeframe || chartSelectionRef.current.timeframe || '5m';
    setChartSelection({
      ...selection,
      timeframe,
      chartKey: buildChartKey(selection, timeframe),
    });
  };

  useEffect(() => {
    // MongoDB migration check
    if (IS_DEV) console.log('[App] MongoDB Backend Active');
  }, []);

  useEffect(() => {
    const fetchPlansAndRules = async () => {
      try {
        const [plansData, rulesData] = await Promise.all([
          api.getChallenges(),
          api.getRules()
        ]);
        setPlans(plansData);
        setRules(rulesData);
      } catch (err) {
        // Silently fail for periodic configs 
      }
    };
    fetchPlansAndRules();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const savedUser = localStorage.getItem('trader_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          const profile = await api.getUser(userData.uid);
          setUserProfile(profile);
          setHasStarted(true);
          setShowOptionChain(false);
        } catch (err) {
          console.error('Auto-login failed:', err);
          localStorage.removeItem('trader_user');
        }
      }
      setIsAuthReady(true);
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('trader_user');
    setUser(null);
    setUserProfile(null);
    setShowOptionChain(false);
    setShowAuth(true);
  };

  useEffect(() => {
    if (!user) return;
  }, [user]);

  useEffect(() => {
    const socket = io({
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });
    socketRef.current = socket;

    // ─── Diagnostics Tracking (for dev/debugging) ───
    const diagnosticsRef: any = {
      tickCounts: { indexTicks: 0, optionTicks: 0, chartTicks: 0 },
      lastTickTimes: { indexTickAt: 0, optionTickAt: 0, chartTickAt: 0 },
      latencies: { lastIndexLatency: 0, lastOptionLatency: 0, lastChartLatency: 0 },
      connectedAt: Date.now(),
    };

    socket.on('connect', () => {
      setIsSocketConnected(true);
      setConnectionStatus('connected');
      showToast('Market feed connected', 'success');
      if (IS_DEV) console.log('[Market] socket connected');
      diagnosticsRef.connectedAt = Date.now();
      if (IS_DEV) console.log('[Market] diagnostics reset');
      if (IS_DEV) console.log('[Market] active chart token', chartSelectionRef.current.chartKey);
      if (needsResubscribeRef.current) {
        socket.emit('chart:subscribe', chartSelectionRef.current);
        needsResubscribeRef.current = false;
      }
    });

    socket.on('disconnect', (reason) => {
      setIsSocketConnected(false);
      setConnectionStatus(reason === 'io server disconnect' ? 'disconnected' : 'reconnecting');
      if (reason === 'io server disconnect') {
        socket.connect();
      }
      showToast('Market feed disconnected', 'error');
      if (IS_DEV) console.log('[Market] socket disconnected:', reason);
      needsResubscribeRef.current = true;
    });

    const pendingMarketPatches = new Map<string, Partial<any>>();
    const pendingDbRecords = new Map<string, any>();
    let marketFlushTimer: number | null = null;
    let dbFlushTimer: number | null = null;
    let chartTickFrame: number | null = null;
    let pendingChartTick: ChartTick | null = null;

    const queueDbRecord = (symbol: string, record: any) => {
      pendingDbRecords.set(symbol, {
        symbol,
        price: record.price,
        change: record.change,
        changePct: record.changePct,
        dayOpen: record.dayOpen,
        dayHigh: record.dayHigh,
        dayLow: record.dayLow,
        volume: record.volume,
        timestamp: record.timestamp,
        expiry: record.expiry,
        expiries: record.expiries,
        optionChain: record.optionChain,
        isMarketOpen: record.isMarketOpen,
        dataSource: record.dataSource,
      });
      if (dbFlushTimer !== null) return;
      dbFlushTimer = window.setTimeout(() => {
        dbFlushTimer = null;
        const rows = Array.from(pendingDbRecords.values());
        pendingDbRecords.clear();
        if (rows.length) {
          void db.marketData.bulkPut(rows as any[]).catch(() => {});
        }
      }, 1000);
    };

    const flushMarketPatches = () => {
      marketFlushTimer = null;
      const patches = Array.from(pendingMarketPatches.entries());
      pendingMarketPatches.clear();
      if (!patches.length) return;
      setMarketData(prev => {
        const nextState = { ...prev };
        for (const [symbol, patch] of patches) {
          const current = nextState[symbol] || {};
          const next = {
            ...current,
            ...patch,
            optionChain: patch.optionChain ?? current.optionChain ?? [],
          };
          nextState[symbol] = next;
          queueDbRecord(symbol, next);
        }
        marketDataRef.current = nextState;
        return nextState;
      });
    };

    const updateMarketSymbol = (symbol: string, patch: Partial<any>) => {
      pendingMarketPatches.set(symbol, {
        ...(pendingMarketPatches.get(symbol) || {}),
        ...patch,
      });
      if (marketFlushTimer === null) {
        marketFlushTimer = window.setTimeout(flushMarketPatches, UI_BATCH_MS);
      }
    };

    const sameToken = (a?: string | number, b?: string | number) => {
      if (a === undefined || a === null || b === undefined || b === null) return false;
      return String(a) === String(b);
    };

    const normalizeSymbolKey = (symbol?: string) => {
      if (!symbol) return symbol || '';
      const normalized = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
      return SYMBOLS.find((candidate) =>
        candidate.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
      ) || symbol;
    };

    const mergeOptionRow = (chain: OptionStrike[] = [], payload: {
      strike?: number;
      optionType?: 'CE' | 'PE';
      securityId?: string;
      price?: number;
      volume?: number;
      oi?: number;
      oiChange?: number;
      bid?: number;
      ask?: number;
      change?: number;
      changePct?: number;
    }) => {
      if (!chain.length) return chain;
      return chain.map((row) => {
        const isMatchBySecurity = payload.securityId
          ? sameToken(row.ce_security_id, payload.securityId) || sameToken(row.pe_security_id, payload.securityId)
          : false;
        const isMatchByStrike = payload.strike !== undefined && Number(row.strike) === Number(payload.strike);
        if (!isMatchBySecurity && !isMatchByStrike) return row;
        if (payload.optionType === 'CE') {
          return {
            ...row,
            ce_ltp: payload.price !== undefined ? payload.price : row.ce_ltp,
            ce_volume: payload.volume !== undefined ? payload.volume : row.ce_volume,
            ce_oi: payload.oi !== undefined ? payload.oi : row.ce_oi,
            ce_oi_change: payload.oiChange !== undefined ? payload.oiChange : row.ce_oi_change,
            ce_bid: payload.bid !== undefined ? payload.bid : row.ce_bid,
            ce_ask: payload.ask !== undefined ? payload.ask : row.ce_ask,
            ce_change: payload.change !== undefined ? payload.change : row.ce_change,
            ce_change_pct: payload.changePct !== undefined ? payload.changePct : row.ce_change_pct,
          };
        }
        if (payload.optionType === 'PE') {
          return {
            ...row,
            pe_ltp: payload.price !== undefined ? payload.price : row.pe_ltp,
            pe_volume: payload.volume !== undefined ? payload.volume : row.pe_volume,
            pe_oi: payload.oi !== undefined ? payload.oi : row.pe_oi,
            pe_oi_change: payload.oiChange !== undefined ? payload.oiChange : row.pe_oi_change,
            pe_bid: payload.bid !== undefined ? payload.bid : row.pe_bid,
            pe_ask: payload.ask !== undefined ? payload.ask : row.pe_ask,
            pe_change: payload.change !== undefined ? payload.change : row.pe_change,
            pe_change_pct: payload.changePct !== undefined ? payload.changePct : row.pe_change_pct,
          };
        }
        return row;
      });
    };

    // REMOVE all old listeners to prevent duplicates
    socket.off('chartTick');
    socket.off('market:indexTick');
    socket.off('market:optionTick');
    socket.off('optionChain:update');
    socket.off('marketUpdate');
    socket.off('virtualTrading:mtmUpdate');

    // ADD NEW LISTENERS
    socket.on('chartTick', (tick: ChartTick) => {
      const activeChart = chartSelectionRef.current;
      const tokenMatchesActive = sameToken(tick.securityId, activeChart.securityId);
      if (tick.chartKey === activeChart.chartKey || tokenMatchesActive) {
        pendingChartTick = {
          ...tick,
          chartKey: activeChart.chartKey,
          symbol: activeChart.symbol,
          securityId: String(activeChart.securityId || tick.securityId),
          exchangeSegment: activeChart.exchangeSegment || tick.exchangeSegment,
          instrument: activeChart.instrument || tick.instrument,
          strike: activeChart.strike ?? tick.strike,
          optionType: activeChart.optionType ?? tick.optionType,
        };
        if (chartTickFrame === null) {
          chartTickFrame = window.requestAnimationFrame(() => {
            chartTickFrame = null;
            if (pendingChartTick) setLatestChartTick(pendingChartTick);
            pendingChartTick = null;
          });
        }
      }
    });

    socket.on('market:indexTick', (tick: any) => {
      updateMarketSymbol(tick.symbol, {
        price: tick.price,
        change: tick.change,
        changePct: tick.changePct,
        dayOpen: tick.dayOpen,
        dayHigh: tick.dayHigh,
        dayLow: tick.dayLow,
        volume: tick.volume,
        timestamp: tick.timestamp,
        dataSource: 'Dhan',
      });
      if (tick.symbol === selectedSymbolRef.current) {
        setIsOptionChainLoading(false);
      }
    });

    const handleOptionTick = (tick: any) => {
      const symbolKey = normalizeSymbolKey(tick.symbol);
      const optionRows = marketDataRef.current[symbolKey]?.optionChain?.length || 0;
      const previousRow = marketDataRef.current[symbolKey]?.optionChain?.find((row: OptionStrike) =>
        sameToken(row.ce_security_id, tick.securityId) || sameToken(row.pe_security_id, tick.securityId) || Number(row.strike) === Number(tick.strike)
      );
      const previousLtp = tick.optionType === 'CE' ? previousRow?.ce_ltp : previousRow?.pe_ltp;
      const frontendReceivedAt = Date.now();
      const totalLatencyMs = frontendReceivedAt - (tick.tickReceivedAt || tick.emittedAt || 0);
      
      if (IS_DEV) console.log('[Market] option tick received', {
        symbol: symbolKey,
        token: tick.securityId,
        strike: tick.strike,
        type: tick.optionType,
        source: tick.source || 'ws',
        optionChainSize: optionRows,
        previousLtp,
        newLtp: tick.price,
        wsLatencyMs: tick.latencyMs,
        totalLatencyMs,
        allLatencies: {
          tickReceivedAtBackend: tick.tickReceivedAt,
          emittedAtBackend: tick.emittedAt,
          wsLatency: tick.latencyMs,
          frontendReceivedAt,
          totalLatency: totalLatencyMs,
        }
      });
      
      const current = {
        ...(marketDataRef.current[symbolKey] || {}),
        ...(pendingMarketPatches.get(symbolKey) || {}),
      };
      const nextChain = mergeOptionRow(current.optionChain || [], {
          strike: tick.strike,
          optionType: tick.optionType,
          securityId: tick.securityId,
          price: tick.price,
          volume: tick.volume,
          oi: tick.oi,
          oiChange: tick.oiChange,
          change: tick.change,
          changePct: tick.changePct,
      });
      updateMarketSymbol(symbolKey, {
        timestamp: tick.timestamp,
        dataSource: 'Dhan',
        optionChain: nextChain,
      });
      if (symbolKey === selectedSymbolRef.current) {
        setIsOptionChainLoading(false);
      }
    };

    const handleOptionChainUpdate = (payload: any) => {
      const symbolKey = normalizeSymbolKey(payload.symbol);
      const isFullChain = Array.isArray(payload.optionChain);
      const previousRow = marketDataRef.current[symbolKey]?.optionChain?.find((row: OptionStrike) =>
        sameToken(row.ce_security_id, payload.securityId) || sameToken(row.pe_security_id, payload.securityId) || Number(row.strike) === Number(payload.strike)
      );
      const previousLtp = payload.optionType === 'CE' ? previousRow?.ce_ltp : payload.optionType === 'PE' ? previousRow?.pe_ltp : undefined;
      const nextLtp = payload.optionType === 'CE' ? payload.row?.ce_ltp : payload.optionType === 'PE' ? payload.row?.pe_ltp : undefined;
      const frontendReceivedAt = Date.now();
      const wsLatencyMs = payload.latencyMs;
      const totalLatencyMs = frontendReceivedAt - (payload.tickReceivedAt || payload.emittedAt || 0);
      
      if (IS_DEV) console.log('[Market] optionChain:update received', {
        source: payload.source || 'ws',
        symbol: symbolKey,
        token: payload.securityId,
        strike: payload.strike,
        type: payload.optionType,
        expiry: payload.expiry,
        isFullChain,
        updatedRows: payload.updatedRows || (isFullChain ? payload.optionChain.length : 1),
        previousLtp,
        newLtp: nextLtp,
        wsLatencyMs,
        totalLatencyMs,
        allLatencies: {
          tickReceivedAtBackend: payload.tickReceivedAt,
          emittedAtBackend: payload.emittedAt,
          wsLatency: payload.latencyMs,
          frontendReceivedAt,
          totalLatency: totalLatencyMs,
        }
      });
      
      const current = {
        ...(marketDataRef.current[symbolKey] || {}),
        ...(pendingMarketPatches.get(symbolKey) || {}),
      };
      const nextChain = isFullChain && payload.source !== 'rest-fallback'
          ? payload.optionChain
          : mergeOptionRow(current.optionChain || [], {
              strike: payload.strike,
              optionType: payload.optionType,
              securityId: payload.securityId,
              price: payload.row?.ce_ltp ?? payload.row?.pe_ltp,
              volume: payload.row?.ce_volume ?? payload.row?.pe_volume,
              oi: payload.row?.ce_oi ?? payload.row?.pe_oi,
              oiChange: payload.row?.ce_oi_change ?? payload.row?.pe_oi_change,
              change: payload.change,
              changePct: payload.changePct,
            });
      updateMarketSymbol(symbolKey, {
        optionChain: nextChain,
        expiry: payload.expiry || current.expiry,
        expiries: current.expiries,
        dataSource: 'Dhan',
        timestamp: payload.timestamp || current.timestamp,
      });
      if (symbolKey === selectedSymbolRef.current) {
        setIsOptionChainLoading(false);
      }
    };

    socket.on('market:optionTick', handleOptionTick);
    socket.on('optionChain:update', handleOptionChainUpdate);

    socket.on('marketUpdate', async (data) => {
      for (const [symbol, info] of Object.entries(data)) {
        const current = marketDataRef.current[symbol] || {};
        updateMarketSymbol(symbol, {
          ...(info as any),
          optionChain: (info as any).optionChain || current.optionChain || [],
        });
      }

      if (data[selectedSymbolRef.current]) {
        setIsOptionChainLoading(false);
      }
    });

    socket.on('virtualTrading:mtmUpdate', (payload: any) => {
      if (!payload) return;
      setPortfolio(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          equity: payload.equity ?? prev.equity,
          balance: payload.balance ?? prev.balance,
          unrealizedPnl: payload.unrealizedPnl ?? prev.unrealizedPnl,
          realizedPnl: payload.realizedPnl ?? prev.realizedPnl,
          dayPnl: payload.dayPnl ?? prev.dayPnl,
          drawdown: payload.drawdown ?? prev.drawdown,
        };
      });
    });

    socket.on('reconnect_attempt', (attempt) => {
      setConnectionStatus('reconnecting');
      if (IS_DEV) console.log(`[Market] Reconnection attempt #${attempt}`);
    });

    socket.on('reconnect_error', (error) => {
      console.error('[Market] Reconnection error:', error);
    });

    socket.on('reconnect_failed', () => {
      setConnectionStatus('disconnected');
      showToast('Market feed reconnection failed', 'error');
      console.error('[Market] Reconnection failed');
    });

    socket.on('marketStatus', (data) => {
      if (IS_DEV) console.log('[Market] Provider Status:', data);
      setProviderStatus(prev => ({
        ...prev,
        [data.provider]: {
          status: data.status,
          nextRetryIn: data.nextRetryIn,
          error: data.error
        }
      }));
    });

    // Polling fallback for serverless (Vercel) or connection issues
    let isPolling = false;
    let consecutiveErrors = 0;
    const pollInterval = setInterval(async () => {
      // Only poll if we're not connected via WS and not already polling
      if (socket.connected || isPolling) {
        if (socket.connected && connectionStatus === 'polling') {
          setConnectionStatus('connected');
          consecutiveErrors = 0;
        }
        return;
      }

      isPolling = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      try {
        const response = await fetch('/api/market/quotes', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            setMarketData(prev => ({ ...prev, ...data }));
            setConnectionStatus('polling');
            consecutiveErrors = 0;
            if (data[selectedSymbolRef.current]) {
              setIsOptionChainLoading(false);
            }
          } else {
            consecutiveErrors++;
            if (consecutiveErrors % 10 === 1) {
              console.warn('[Market] Polling received non-JSON response (server likely starting up)');
            }
            setConnectionStatus('disconnected');
          }
        } else {
          consecutiveErrors++;
          if (consecutiveErrors % 10 === 1) {
            console.warn('[Market] Polling failed with status:', response.status);
          }
          setConnectionStatus('disconnected');
        }
      } catch (err: any) {
        consecutiveErrors++;
        if (err.name !== 'AbortError' && consecutiveErrors % 10 === 1) {
          // Silent most errors to avoid console noise
        }
        setConnectionStatus('disconnected');
      } finally {
        isPolling = false;
      }
    }, 5000); // Increased interval to 5s to be less aggressive

    return () => { 
      socket.off('market:optionTick', handleOptionTick);
      socket.off('optionChain:update', handleOptionChainUpdate);
      socket.emit('chart:unsubscribe', { chartKey: chartSelectionRef.current.chartKey });
      socket.disconnect(); 
      socketRef.current = null;
      if (marketFlushTimer !== null) window.clearTimeout(marketFlushTimer);
      if (dbFlushTimer !== null) window.clearTimeout(dbFlushTimer);
      if (chartTickFrame !== null) window.cancelAnimationFrame(chartTickFrame);
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    setLatestChartTick(null);
    if (!socket) return;

    if (chartSubscribedKeyRef.current === chartSelection.chartKey) return;
    if (chartSubscribedKeyRef.current) {
      socket.emit('chart:unsubscribe', { chartKey: chartSubscribedKeyRef.current });
    }
    chartSubscribedKeyRef.current = chartSelection.chartKey;
    if (IS_DEV) console.log('[Market] subscribing chart token', chartSelection.chartKey);
    socket.emit('chart:subscribe', chartSelection);
    return () => {
      if (chartSubscribedKeyRef.current !== chartSelection.chartKey) return;
      if (IS_DEV) console.log('[Market] unsubscribing chart token', chartSelection.chartKey);
      socket.emit('chart:unsubscribe', { chartKey: chartSelection.chartKey });
      chartSubscribedKeyRef.current = null;
    };
  }, [chartSelection]);

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!user) {
      setAllTrades([]);
      return;
    }
    let consecutiveErrors = 0;
    const fetchTrades = async () => {
      try {
        const trades = await api.getTrades(user.uid);
        setAllTrades(trades);
        consecutiveErrors = 0;
        // Sync to Dexie - Ensure each trade has an 'id' field for Dexie primary key
        const tradesForDexie = trades.map((t: any) => ({
          ...t,
          id: t._id || t.id
        })).filter((t: any) => t.id); // Guard against missing IDs
        
        if (tradesForDexie.length > 0) {
          await db.trades.bulkPut(tradesForDexie);
        }
      } catch (err) {
        consecutiveErrors++;
        // Signal server startup or temporary failure quietly
        if (consecutiveErrors % 10 === 1) {
          console.warn('Retrying trades fetch (server may be starting)...');
        }
      }
    };
    fetchTrades();
    const interval = setInterval(fetchTrades, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!userProfile) return;

    const closedTrades = allTrades.filter(t => t.status === 'Closed');

    let totalUnrealizedPnl = 0;
    const updatedPositions = openPositions.map(pos => {
      let currentPrice = pos.price;
      const symbolData = marketData[pos.symbol];
      
      // Try to get current price from option chain
      if (symbolData && symbolData.dataSource !== 'Stale') {
        const option = symbolData.optionChain.find(o => o.strike === pos.strike);
        if (option) {
          const ltpValue = pos.optionType === 'CE' ? option.ce_ltp : option.pe_ltp;
          if (ltpValue > 0) {
            currentPrice = ltpValue;
          }
        }
      }
      
      // If data is stale or option not found, use last known price (pos.price)
      // This prevents P&L calculation from being blocked by missing option chain data
      
      const grossPnl = pos.type === 'BUY' ? (currentPrice - pos.price) * pos.qty : (pos.price - currentPrice) * pos.qty;
      const pnl = grossPnl - (pos.charges || 0);
      totalUnrealizedPnl += pnl;
      return { ...pos, pnl };
    });

    const realizedPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalCharges = allTrades.reduce((sum, t) => sum + (t.charges || 0), 0);
    
    // Drawdown calculation
    const initialBalance = userProfile.initial_balance || 100000;
    const currentEquity = (userProfile.balance || 0) + totalUnrealizedPnl;
    
    // Simple drawdown from initial (or peak if we had history)
    // For a better DD, we'd need peak equity history
    const drawdown = currentEquity < initialBalance ? ((initialBalance - currentEquity) / initialBalance) * 100 : 0;

    // Calculate stats
    const wins = closedTrades.filter(t => t.pnl > 0);
    const losses = closedTrades.filter(t => t.pnl < 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    
    const totalWinAmount = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 100 : 0;
    
    const avgWin = wins.length > 0 ? totalWinAmount / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossAmount / losses.length : 0;

    const nextPortfolio = {
      equity: currentEquity,
      balance: userProfile.balance || 0,
      unrealizedPnl: totalUnrealizedPnl,
      realizedPnl: realizedPnl,
      dayPnl: realizedPnl + totalUnrealizedPnl,
      totalCharges: totalCharges,
      drawdown: drawdown,
      positions: updatedPositions,
      stats: {
        winRate,
        lossRate: closedTrades.length > 0 ? (losses.length / closedTrades.length) * 100 : 0,
        profitFactor,
        avgWin,
        avgLoss,
        expectancy: closedTrades.length > 0 ? (totalWinAmount - totalLossAmount) / closedTrades.length : 0,
        totalTrades: closedTrades.length,
        totalWins: wins.length,
        totalLosses: losses.length,
        maxDrawdown: drawdown
      },
      equityCurve: []
    };

    const now = Date.now();
    if (now - portfolioDiagnosticRef.current > 2000) {
      portfolioDiagnosticRef.current = now;
      if (IS_DEV) console.log('[Market] portfolio updated', {
        openPositions: updatedPositions.length,
        unrealizedPnl: totalUnrealizedPnl,
        equity: currentEquity,
      });
    }

    setPortfolio(nextPortfolio);
  }, [userProfile, allTrades, marketData, openPositions]);

  const calculateCharges = (quantity: number, price: number, isSell: boolean) => {
    const brokerage = 20; 
    const turnover = quantity * price;
    const transactionCharges = turnover * 0.00053; 
    const stt = isSell ? turnover * 0.0005 : 0; 
    const sebiCharges = turnover * 0.000001; 
    const stampDuty = !isSell ? turnover * 0.00003 : 0; 
    const gst = (brokerage + transactionCharges + sebiCharges) * 0.18;
    return brokerage + transactionCharges + stt + sebiCharges + stampDuty + gst;
  };

  const handleTrade = async (
    type: 'BUY' | 'SELL',
    strike: number,
    price: number,
    optionType: 'CE' | 'PE' = 'CE',
    options: {
      symbol?: string;
      quantity?: number;
      lotSize?: number;
      securityId?: string;
      expiry?: string;
      orderType?: 'MARKET' | 'LIMIT';
    } = {}
  ): Promise<boolean> => {
    if (!user || !userProfile) return false;

    const tradeSymbol = options.symbol || selectedSymbol;
    const lotSize = options.lotSize || LOT_SIZES[tradeSymbol as SymbolName] || (
      tradeSymbol.includes('Bank') ? 15 :
      tradeSymbol.includes('Midcap') ? 75 :
      tradeSymbol.includes('Fin') ? 40 : 50
    );
    const quantity = options.quantity || lotSize;

    if (!price || price <= 0 || !Number.isFinite(price)) {
      showToast('Invalid order price', 'error');
      return false;
    }

    if (!quantity || quantity <= 0 || quantity % lotSize !== 0) {
      showToast(`Quantity must be a multiple of lot size ${lotSize}`, 'error');
      return false;
    }
    
    const charges = calculateCharges(quantity, price, type === 'SELL');
    
    // For SELL (Shorting), we receive premium but need margin. 
    // For simulation, let's say Margin is 1,00,000 per lot.
    const marginPerLot = 100000;
    const requiredMargin = type === 'SELL' ? Math.ceil(quantity / lotSize) * marginPerLot : 0;
    
    const cashOutflow = type === 'BUY' ? (price * quantity) + charges : charges;
    const totalRequired = cashOutflow + requiredMargin;
    
    if (userProfile.balance < totalRequired) {
      const msg = type === 'BUY' 
        ? `Insufficient funds. Required: ₹${totalRequired.toFixed(2)} (Incl. Charges), Available: ₹${userProfile.balance.toFixed(2)}`
        : `Insufficient margin for SELL. Required: ₹${totalRequired.toFixed(2)} (₹1L/Lot Margin), Available: ₹${userProfile.balance.toFixed(2)}`;
      showToast(msg, 'error');
      return false;
    }

    try {
      // Balance Change logic:
      // BUY: Balance decreases by (Price * Qty + Charges)
      // SELL: Balance increases by (Price * Qty - Charges)
      const balanceChange = type === 'BUY' ? -cashOutflow : (price * quantity) - charges;
      const newBalance = userProfile.balance + balanceChange;
      
      await api.upsertUser({
        uid: user.uid,
        balance: newBalance
      });
      setUserProfile(prev => prev ? { ...prev, balance: newBalance } : null);

      const newTrade = await api.addTrade({
        userId: user.uid,
        symbol: tradeSymbol,
        type,
        optionType,
        strike,
        qty: quantity,
        lotSize,
        price: price,
        status: 'Open',
        pnl: 0,
        charges: charges,
        time: new Date().toISOString(),
        securityId: options.securityId,
        expiry: options.expiry,
        orderType: options.orderType || 'MARKET',
      });
      
      const tradeToStore = { ...newTrade, id: newTrade._id || newTrade.id };
      await db.trades.put(tradeToStore);
      
      const confirmMsg = type === 'BUY' 
        ? `${type} Order Placed. Cost: ₹${cashOutflow.toFixed(2)}`
        : `${type} Order Placed. Credit: ₹${((price * quantity) - charges).toFixed(2)}`;
      showToast(confirmMsg);
      return true;
    } catch (error) {
      console.error('Trade failed:', error);
      showToast('Trade failed. Please try again.', 'error');
      return false;
    }
  };

  const handleClosePosition = async (tradeId: string) => {
    if (!user || !userProfile) return;
    try {
      const trade = allTrades.find(t => (t as any)._id === tradeId || t.id === tradeId);
      if (!trade) return;
      
      let currentPrice = trade.price;
      const symbolData = marketData[trade.symbol];
      
      if (symbolData) {
        const option = symbolData.optionChain.find(o => o.strike === trade.strike);
        if (option) {
          currentPrice = trade.optionType === 'CE' ? option.ce_ltp : option.pe_ltp;
        }
      }
      
      const exitCharges = calculateCharges(trade.qty, currentPrice, trade.type === 'BUY'); // If we bought, closing is sell (vice versa)
      const priceDiff = trade.type === 'BUY' ? (currentPrice - trade.price) : (trade.price - currentPrice);
      const grossPnl = priceDiff * trade.qty;
      const netPnl = grossPnl - (trade.charges || 0) - exitCharges;
      
      // Balance change on close:
      // If we were LONG (BUY): Receive current value - exit charges
      // If we were SHORT (SELL): Pay current value + exit charges
      const closeCashChange = trade.type === 'BUY' 
        ? (currentPrice * trade.qty) - exitCharges 
        : -((currentPrice * trade.qty) + exitCharges);

      // Update trade status
      const updatedTrade = await api.updateTrade(tradeId, {
        status: 'Closed',
        pnl: netPnl,
        exitPrice: currentPrice,
        exitTime: new Date().toISOString(),
        charges: (trade.charges || 0) + exitCharges
      });

      // Sync to Dexie
      await db.trades.put({ ...updatedTrade, id: updatedTrade._id || updatedTrade.id });

      const newBalance = userProfile.balance + closeCashChange;
      await api.upsertUser({
        uid: user.uid,
        balance: newBalance
      });

      setUserProfile(prev => prev ? { ...prev, balance: newBalance } : null);

      showToast(`Closed. Net PnL: ₹${netPnl.toFixed(2)}`);
    } catch (error) {
      console.error('Close position failed:', error);
      showToast('Failed to close position', 'error');
    }
  };

  const handleBuyChallenge = async (plan: Plan) => {
    if (!user || !userProfile) return;
    
    // In a real app, you'd check balance, but here we add capital to balance
    try {
      const newBalance = (userProfile.balance || 0) + plan.capital;
      
      // Update user balance in MongoDB
      await api.upsertUser({
        uid: user.uid,
        balance: newBalance,
        initial_balance: newBalance // Also update initial balance for drawdown tracking
      });

      // Record the transaction
      await api.addTransaction({
        userId: user.uid,
        type: 'challenge_purchase',
        amount: plan.price,
        planId: plan.id,
        planName: plan.name
      });

      showToast(`Successfully purchased ${plan.name}! ₹${plan.capital.toLocaleString()} added to wallet.`);
    } catch (error) {
      console.error('Purchase failed:', error);
      showToast('Failed to purchase challenge', 'error');
    }
  };

  const onLogout = handleLogout;

  const selectIndexChart = (symbol: string) => {
    setShowOptionChain(false);
    syncChartSelection({
      kind: 'index',
      symbol,
      securityId: INDEX_SECURITY_IDS[symbol as keyof typeof INDEX_SECURITY_IDS],
      exchangeSegment: 'IDX_I',
      instrument: 'INDEX',
    });
  };

  const selectOptionChart = (symbol: string, strike: number, optionType: 'CE' | 'PE') => {
    const row = marketData[symbol]?.optionChain?.find((s: OptionStrike) => s.strike === strike);
    const securityId = optionType === 'CE' ? row?.ce_security_id : row?.pe_security_id;
    setShowOptionChain(false);
    syncChartSelection({
      kind: 'option',
      symbol,
      strike,
      optionType,
      securityId,
      exchangeSegment: 'NSE_FNO',
      instrument: 'OPTIDX',
    });
  };

  const openOrderTicketFromOption = (symbol: string, strike: number, optionType: 'CE' | 'PE') => {
    const row = marketData[symbol]?.optionChain?.find((item: OptionStrike) => Number(item.strike) === Number(strike));
    if (!row) {
      showToast('Option row not available yet', 'error');
      return;
    }
    const instrument = buildOrderInstrument(symbol, row, optionType, marketData[symbol]?.expiry || '');
    if (!instrument.securityId) {
      showToast('Security ID missing for this strike', 'error');
      return;
    }
    setOrderTicket(instrument);
  };

  const openWatchlistChart = (item: WatchlistItem) => {
    setSelectedSymbol(item.symbol);
    setActiveTab('trade');
    if (item.instrumentType === 'INDEX') {
      selectIndexChart(item.symbol);
      return;
    }
    if (item.instrumentType === 'OPTION' && item.strikePrice && item.optionType) {
      setSelectedStrike(item.strikePrice);
      selectOptionChart(item.symbol, item.strikePrice, item.optionType);
    }
  };

  const openWatchlistOrderTicket = (item: WatchlistItem) => {
    if (item.instrumentType !== 'OPTION' || !item.strikePrice || !item.optionType) {
      showToast('Direct buy is available for CE/PE options', 'info');
      return;
    }
    openOrderTicketFromOption(item.symbol, item.strikePrice, item.optionType);
  };

  const placeOrderFromTicket = async (
    instrument: OrderTicketInstrument,
    side: 'BUY' | 'SELL',
    price: number,
    quantity: number,
    orderType: 'MARKET' | 'LIMIT'
  ) => {
    return handleTrade(side, instrument.strikePrice, price, instrument.optionType, {
      symbol: instrument.symbol,
      quantity,
      lotSize: instrument.lotSize,
      securityId: instrument.securityId,
      expiry: instrument.expiry,
      orderType,
    });
  };

  const navItems: NavItem[] = [
    { id: 'trade', label: 'Trade', icon: CandlestickChart },
    { id: 'watchlist', label: 'Watchlist', icon: LayoutDashboard },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (userProfile?.role === 'admin' || user?.email === 'kushwahgourav2018@gmail.com') {
    if (!navItems.find(i => i.id === 'admin')) {
      navItems.push({ id: 'admin', label: 'Admin', icon: ShieldCheck });
    }
  }

  return (
    <div className={`app-premium-bg relative mx-auto flex min-h-screen flex-col text-slate-100 shadow-2xl ${user && hasStarted ? 'max-w-md' : 'max-w-none'}`}>
      {user && hasStarted && (
        <Header 
          activeTab={activeTab} 
          isSubView={(activeTab === 'trade' && showOptionChain)}
          onBack={() => {
            if (showOptionChain) setShowOptionChain(false);
          }}
          onOpenOptionChain={() => setShowOptionChain(true)}
          onLogout={user ? handleLogout : undefined}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(true)}
          providerStatus={providerStatus}
          onSearch={() => setShowSearch(true)}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm whitespace-nowrap ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white'
                : toast.type === 'info'
                  ? 'bg-blue-500 text-white'
                  : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="flex-1 overflow-y-auto">
        {!isAuthReady ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !user ? (
          <div className="min-h-screen bg-white dark:bg-[#050505]">
            <LandingPage 
              onLoginClick={() => setShowAuthModal(true)} 
              onAdminLogin={async (mobile, pass) => {
                try {
                  const userData = await api.adminLogin(mobile, pass);
                  localStorage.setItem('trader_user', JSON.stringify(userData));
                  setUser(userData);
                  setUserProfile(userData);
                  setHasStarted(true);
                  setShowOptionChain(false);
                  showToast('Admin Access Granted');
                } catch (err: any) {
                  showToast(err.message || 'Admin login failed', 'error');
                }
              }}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(true)}
              isLoggedIn={!!user}
            />
            
            <AnimatePresence>
              {showAuthModal && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-[#160d08] p-4 rounded-[2.5rem] border border-slate-200 dark:border-white/10 w-full max-w-sm relative"
                  >
                    <button 
                      onClick={() => setShowAuthModal(false)}
                      className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <Plus className="w-5 h-5 rotate-45" />
                    </button>
                    <AuthView onAuthSuccess={(userData) => {
                      setUser(userData);
                      setUserProfile(userData);
                      setShowAuthModal(false);
                      setHasStarted(true);
                      setShowOptionChain(false);
                      showToast('Welcome!');
                    }} showToast={showToast} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : !hasStarted ? (
          <LandingPage 
            onLoginClick={() => setHasStarted(true)} 
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(true)}
            isLoggedIn={!!user}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (showOptionChain ? '-oc' : '')}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'trade' && (
                showOptionChain ? (
                  <OptionChain
                    symbol={selectedSymbol}
                    data={marketData[selectedSymbol] as any}
                    onStrikeSelect={(strike, type, ltp) => {
                      setSelectedStrike(strike);
                      selectOptionChart(selectedSymbol, strike, type);
                      showToast(`${type} ${strike} @ ₹${ltp.toFixed(2)}`);
                    }}
                    onExpiryChange={async (expiry) => {
                      setIsOptionChainLoading(true);
                      try {
                        await fetch('/api/market/expiry', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ symbol: selectedSymbol, expiry })
                        });
                        showToast(`Expiry updated to ${expiry}`, 'success');
                      } catch { showToast('Failed to update expiry', 'error'); }
                      finally { setIsOptionChainLoading(false); }
                    }}
                    onTrade={(strike, type, action, ltp) => {
                      setSelectedStrike(strike);
                      if (action === 'BUY') {
                        openOrderTicketFromOption(selectedSymbol, strike, type);
                      }
                      selectOptionChart(selectedSymbol, strike, type);
                      showToast(`${action} ${type} ${strike} @ ₹${ltp.toFixed(2)}`, 'info');
                    }}
                    onAddToWatchlist={(strike, type, ltp) => {
                      void addOptionToWatchlist(strike, type, ltp);
                    }}
                  />
                ) : (
                  <TradeView 
                    onViewOptionChain={() => {
                      setIsOptionChainLoading(true);
                      setShowOptionChain(true);
                      // If data is already there, clear loading quickly for better UX
                      if (marketData[selectedSymbol].optionChain.length > 0) {
                        setTimeout(() => setIsOptionChainLoading(false), 300);
                      }
                    }} 
                    price={marketData[selectedSymbol].price}
                    change={marketData[selectedSymbol].change}
                    timestamp={marketData[selectedSymbol].timestamp}
                    optionChain={marketData[selectedSymbol].optionChain}
                    selectedSymbol={selectedSymbol}
                    onSymbolChange={(s) => {
                      setSelectedSymbol(s);
                      setSelectedStrike(0);
                      selectIndexChart(s);
                      setIsOptionChainLoading(true);
                    }}
                    selectedStrike={selectedStrike}
                    onStrikeChange={setSelectedStrike}
                    onTrade={handleTrade}
                    chartSelection={chartSelection}
                    liveChartTick={latestChartTick}
                    onChartSelectionChange={setChartSelection}
                    openPositions={openPositions}
                    isLive={isSocketConnected}
                    connectionStatus={connectionStatus}
                    expiry={marketData[selectedSymbol].expiry}
                    isMarketOpen={marketData[selectedSymbol].isMarketOpen}
                    dataSource={marketData[selectedSymbol].dataSource}
                    darkMode={darkMode}
                  />
                )
              )}
              {activeTab === 'watchlist' && (
                <WatchlistView
                  watchlists={watchlists || []}
                  items={currentWatchlistItems}
                  selectedWatchlistId={selectedWatchlistId}
                  marketData={marketData}
                  onCreateWatchlist={(name) => void createWatchlist(name)}
                  onRenameWatchlist={(id, name) => void renameWatchlist(id, name)}
                  onDeleteWatchlist={(id) => void deleteWatchlist(id)}
                  onSelectWatchlist={persistSelectedWatchlist}
                  onAddIndex={(symbol) => void addIndexToWatchlist(symbol)}
                  onRemoveItem={(item) => void removeWatchlistItem(item)}
                  onOpenChart={openWatchlistChart}
                  onBuy={openWatchlistOrderTicket}
                />
              )}
              {activeTab === 'challenges' && <ChallengesView onSelectPlan={handleBuyChallenge} plans={plans} rules={rules} />}
              {activeTab === 'portfolio' && <PortfolioView portfolio={portfolio} onClosePosition={handleClosePosition} userId={user.uid} allTrades={allTrades} />}
              {activeTab === 'profile' && <ProfileView userProfile={userProfile} user={user} showToast={showToast} setUserProfile={setUserProfile} />}
              {activeTab === 'admin' && <AdminView showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {user && hasStarted && (
        <nav className="premium-bottom-nav fixed bottom-0 z-50 w-full max-w-md px-3 pb-5 pt-3">
          <div className="flex items-center justify-around gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex min-w-[64px] flex-col items-center gap-1.5 rounded-2xl px-2 py-2 transition-all duration-300 active:scale-95 ${
                  activeTab === item.id ? 'bg-primary/[0.12] text-primary shadow-lg shadow-primary/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                }`}
              >
                <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'fill-primary/20' : ''}`} />
                <span className="text-[9px] font-black uppercase tracking-[0.12em]">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {orderTicket && (
        <OrderTicketModal
          instrument={orderTicket}
          marketData={marketData}
          userProfile={userProfile}
          onClose={() => setOrderTicket(null)}
          onPlaceOrder={placeOrderFromTicket}
        />
      )}

      {/* Global Search Modal */}
      {showSearch && (
        <GlobalSearch
          marketData={marketData}
          onSelectIndex={(symbol) => {
            setSelectedSymbol(symbol);
            setShowSearch(false);
            setSelectedStrike(0);
            selectIndexChart(symbol);
          }}
          onSelectOption={(symbol, strike, type, ltp) => {
            setSelectedSymbol(symbol);
            setSelectedStrike(strike);
            setShowSearch(false);
            selectOptionChart(symbol, strike, type);
            showToast(`Selected ${type} ${strike}`, 'info');
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
