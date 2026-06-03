import React, { useState, useEffect, useMemo, Component, useRef, memo } from 'react';

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
import { NavItem, Trade, Plan, OptionStrike, Portfolio, Account, Client, Rule, SymbolMarketData, SYMBOLS, LOT_SIZES } from './types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.client';

interface User {
  uid: string;
  email: string;
  name?: string;
  role?: string;
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
    time: '24 Oct, 10:30 AM',
    status: 'Closed',
    pnl: 4500
  },
  {
    id: '2',
    symbol: 'HDFCBANK',
    type: 'SELL',
    optionType: 'PE',
    strike: 22500,
    price: 112.45,
    qty: 100,
    time: '23 Oct, 02:15 PM',
    status: 'Closed',
    pnl: -1200
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
  onSearch,
  providerStatus 
}: { 
  activeTab: string, 
  onBack?: () => void, 
  isSubView?: boolean, 
  onLogout?: () => void,
  darkMode: boolean,
  onToggleDarkMode: () => void,
  onOpenOptionChain?: () => void,
  onSearch?: () => void,
  providerStatus?: Record<string, { status: string, nextRetryIn?: number, error?: string }>
}) => {
  const handleReconnect = async (provider: string) => {
    try {
      // Only Dhan is supported in this application.
    } catch (err) {
      console.error('Manual reconnect failed:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#160d08]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isSubView ? (
          <button onClick={onBack} className="p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <ArrowDown className="w-6 h-6 rotate-90" />
          </button>
        ) : activeTab === 'trade' ? (
          <button 
            onClick={onOpenOptionChain} 
            className="p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
            title="View Option Chain"
          >
            <Menu className="text-primary w-6 h-6" />
          </button>
        ) : (
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <TrendingUp className="text-primary w-5 h-5" />
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight leading-none">
            {isSubView ? 'Option Chain' : 'Indo Trader'}
          </h1>
        </div>
        {!isSubView && activeTab === 'trade' && (
          <span className="bg-slate-100 dark:bg-white/5 text-[10px] font-bold px-2 py-0.5 rounded-full text-slate-500 flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            LIVE
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Search — Dhan indices only */}
        <button
          onClick={onSearch}
          className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          title="Search indices (Dhan)"
        >
          <Search className="w-5 h-5" />
        </button>
        <button 
          onClick={onToggleDarkMode}
          className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {onLogout && (
          <button onClick={onLogout} className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
            <User className="w-5 h-5" />
          </button>
        )}
        <button className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 relative">
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
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all font-bold"
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
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all font-bold font-mono"
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
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all font-bold font-mono"
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
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-primary transition-all font-bold"
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

const TradingViewWidget = memo(({ symbol, interval = "5" }: { symbol: string, interval?: string }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const symbolMap: { [key: string]: string } = {
      'Nifty 50':      'NSE:NIFTY',
      'Bank Nifty':    'NSE:BANKNIFTY',
      'Fin Nifty':     'NSE:FINNIFTY',
      'Midcap Select': 'NSE:NIFTY_MID_SELECT',
      'SENSEX':        'BSE:SENSEX',
    };

    const intervalMap: { [key: string]: string } = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '1h': '60',
      '1D': 'D',
    };

    const tvSymbol = symbolMap[symbol] || `NSE:${symbol.replace(/\s+/g, '')}`;
    const tvInterval = intervalMap[interval] || interval;
    const containerId = `tv_chart_${symbol.replace(/\s+/g, '_').toLowerCase()}_${tvInterval}`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.onerror = (e) => {
      console.warn("TradingView script failed to load:", e);
      if (container.current) {
        container.current.innerHTML = '<div class="flex items-center justify-center h-full text-slate-500 text-xs font-bold uppercase tracking-widest">Chart failed to load. Please check your connection.</div>';
      }
    };
    script.innerHTML = JSON.stringify({
      "autosize": true,
      "symbol": tvSymbol,
      "interval": tvInterval,
      "timezone": "Asia/Kolkata",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "calendar": false,
      "container_id": containerId,
      "support_host": "https://www.tradingview.com"
    });

    if (container.current) {
      container.current.innerHTML = '';
      const widgetDiv = document.createElement('div');
      widgetDiv.id = containerId;
      widgetDiv.style.height = '100%';
      widgetDiv.style.width = '100%';
      container.current.appendChild(widgetDiv);
      container.current.appendChild(script);
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = '';
      }
    };
  }, [symbol, interval]);

  return (
    <div className="tradingview-widget-container h-full w-full" ref={container}>
      <div className="tradingview-widget-container__widget h-full w-full"></div>
    </div>
  );
});

const ViewToggle = ({ activeView, onToggle }: { activeView: 'chart' | 'chain', onToggle: (view: 'chart' | 'chain') => void }) => (
  <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-2">
    <button 
      onClick={() => onToggle('chart')}
      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeView === 'chart' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-slate-400'}`}
    >
      <CandlestickChart className="w-4 h-4" />
      Chart
    </button>
    <button 
      onClick={() => onToggle('chain')}
      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeView === 'chain' ? 'bg-white dark:bg-white/10 shadow-sm text-primary' : 'text-slate-400'}`}
    >
      <ReceiptText className="w-4 h-4" />
      Option Chain
    </button>
  </div>
);

const TradeView = ({ 
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
  openPositions = [],
  isLive = false,
  connectionStatus = 'disconnected',
  expiry = '',
  isMarketOpen = false,
  dataSource = 'Live'
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
  openPositions?: Trade[],
  isLive?: boolean,
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting' | 'polling',
  expiry?: string,
  isMarketOpen?: boolean,
  dataSource?: string
}) => {
  const [timeframe, setTimeframe] = useState('5m');

  const [tradeAction, setTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [confirmOrder, setConfirmOrder] = useState<{ type: 'CE' | 'PE', price: number } | null>(null);

  useEffect(() => {
    if (optionChain.length > 0 && selectedStrike === 0) {
      const atm = optionChain.reduce((prev, curr) => 
        Math.abs(curr.strike - price) < Math.abs(prev.strike - price) ? curr : prev
      );
      onStrikeChange(atm.strike);
    }
  }, [optionChain, price, selectedStrike, onStrikeChange]);

  const selectedStrikeData = optionChain.find(s => s.strike === selectedStrike);

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
    <div className="flex flex-col gap-4 p-4 pb-48 relative">
      {/* Order Confirmation Overlay */}
      {confirmOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200">
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
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</p>
                <p className="text-lg font-bold">{lotSize} <span className="text-[10px] text-slate-500 font-medium">(1 Lot)</span></p>
              </div>
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Premium</p>
                <p className="text-lg font-bold">₹{confirmOrder.price.toFixed(2)}</p>
              </div>
              <div className="col-span-2 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                <p className="text-[10px] font-bold text-primary uppercase mb-1">Estimated {tradeAction === 'BUY' ? 'Cost' : 'Credit'}</p>
                <p className="text-2xl font-black text-primary tracking-tighter">₹{(confirmOrder.price * lotSize).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                {tradeAction === 'SELL' && <p className="text-[8px] text-primary/60 font-medium mt-1">Requires ₹1,00,000 Margin</p>}
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmOrder(null)}
                className="flex-1 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 py-4 rounded-2xl text-xs font-black uppercase transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                className={`flex-[2] py-4 rounded-2xl text-xs font-black uppercase text-white shadow-xl transition-all active:scale-95 ${
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
      
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {['Nifty 50', 'Bank Nifty', 'Fin Nifty', 'Midcap Select', 'SENSEX'].map((idx) => (
          <button 
            key={idx}
            onClick={() => {
              onSymbolChange(idx);
            }}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${
              selectedSymbol === idx ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'
            }`}
          >
            {idx}
          </button>
        ))}
      </div>

      <div className="flex border-b border-slate-200 dark:border-white/5">
        {['1m', '5m', '15m', '1h', '1D'].map((tf) => (
          <button 
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-3 text-xs font-bold transition-all ${
              timeframe === tf ? 'text-primary border-b-2 border-primary' : 'text-slate-400'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
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

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-primary/10 border-primary/20">
              <span className="text-[8px] font-black uppercase tracking-wider text-primary">
                {dataSource || 'Live'}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">As of {timestamp || '--:--:--'} IST</p>
        </div>
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-bold tracking-tighter">{(price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
          <span className={`font-bold flex items-center text-sm ${(change || 0) >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
            {(change || 0) >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(change || 0).toFixed(2)} ({((change || 0) / (price || 1) * 100).toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Lightweight Chart — replaces TradingView */}
      <LWChart
        symbol={selectedSymbol}
        interval={timeframe}
        currentPrice={price}
        darkMode={darkMode}
        height={380}
      />

      <button 
        onClick={onViewOptionChain}
        className="w-full flex items-center justify-between p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 hover:bg-primary/10 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
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
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">PCR Ratio</p>
          <p className="text-lg font-bold">
            {(() => {
              const totalCE = optionChain.reduce((s, d) => s + d.ce_oi, 0);
              const totalPE = optionChain.reduce((s, d) => s + d.pe_oi, 0);
              const pcr = totalCE > 0 ? (totalPE / totalCE).toFixed(2) : '0.00';
              return pcr;
            })()}
          </p>
          <p className={`text-[10px] font-bold ${
            (() => {
              const totalCE = optionChain.reduce((s, d) => s + d.ce_oi, 0);
              const totalPE = optionChain.reduce((s, d) => s + d.pe_oi, 0);
              const pcr = totalCE > 0 ? totalPE / totalCE : 0;
              return pcr > 1.1 ? 'text-emerald-500' : pcr < 0.9 ? 'text-rose-500' : 'text-slate-400';
            })()
          }`}>
            {(() => {
              const totalCE = optionChain.reduce((s, d) => s + d.ce_oi, 0);
              const totalPE = optionChain.reduce((s, d) => s + d.pe_oi, 0);
              const pcr = totalCE > 0 ? totalPE / totalCE : 0;
              return pcr > 1.1 ? 'Bullish' : pcr < 0.9 ? 'Bearish' : 'Neutral';
            })()}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
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
      <div className="fixed bottom-[72px] left-0 right-0 max-w-md mx-auto z-40 bg-white dark:bg-[#160d08] border-t border-slate-200 dark:border-white/10 p-4 space-y-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        {/* BUY/SELL Selector */}
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl">
          <button 
            onClick={() => setTradeAction('BUY')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              tradeAction === 'BUY' ? 'bg-white dark:bg-white/10 shadow-sm text-trading-up' : 'text-slate-400'
            }`}
          >
            BUY Side
          </button>
          <button 
            onClick={() => setTradeAction('SELL')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              tradeAction === 'SELL' ? 'bg-white dark:bg-white/10 shadow-sm text-trading-down' : 'text-slate-400'
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
          <div className="relative w-full h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center px-1 overflow-x-auto hide-scrollbar">
            {optionChain.map((s) => (
              <button
                key={s.strike}
                onClick={() => onStrikeChange(s.strike)}
                className={`flex-1 min-w-[60px] h-10 rounded-full text-[10px] font-bold transition-all ${
                  selectedStrike === s.strike ? 'bg-primary text-white shadow-lg scale-110 z-10' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
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
              className={`flex-1 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 ${
                tradeAction === 'BUY' ? 'bg-trading-up hover:bg-emerald-600 shadow-emerald-900/20' : 'bg-trading-down hover:bg-red-600 shadow-red-900/20'
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
              className={`flex-1 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 ${
                tradeAction === 'BUY' ? 'bg-trading-down hover:bg-red-600 shadow-red-900/20' : 'bg-trading-up hover:bg-emerald-600 shadow-emerald-900/20'
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
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 border border-white/10"
            >
              <span className="text-lg leading-none mb-1">BUY STRADDLE (CE + PE)</span>
              <span className="text-[10px] opacity-70 italic">Combined Premium: ₹{((selectedStrikeData?.ce_ltp || 0) + (selectedStrikeData?.pe_ltp || 0)).toFixed(2)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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
            {['Nifty 50', 'Bank Nifty', 'Fin Nifty', 'Midcap Nifty', 'RELIANCE'].map((idx) => (
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
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="rounded-3xl bg-slate-50 dark:bg-white/5 p-6 border border-slate-200 dark:border-white/10 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current Equity</p>
        <div className="flex items-baseline gap-3 mb-6">
          <p className="text-4xl font-bold">₹{portfolio.equity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <p className={`text-sm font-bold ${portfolio.unrealizedPnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
            {portfolio.unrealizedPnl >= 0 ? '+' : ''}{((portfolio.unrealizedPnl / portfolio.balance) * 100).toFixed(2)}%
          </p>
        </div>
        <div className="flex gap-4 border-t border-slate-200 dark:border-white/10 pt-6">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Available Balance</p>
            <p className="text-sm font-bold mt-1">₹{portfolio.balance.toLocaleString('en-IN')}</p>
          </div>
          <div className="w-px bg-slate-200 dark:bg-white/10" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Unrealized P&L</p>
            <p className={`text-sm font-bold mt-1 ${portfolio.unrealizedPnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
              {portfolio.unrealizedPnl >= 0 ? '+' : ''}₹{portfolio.unrealizedPnl.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Open Positions ({portfolio.positions.length})</h3>
        <div className="flex flex-col gap-3">
          {portfolio.positions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 font-bold">
              No open positions
            </div>
          ) : (
            portfolio.positions.map(trade => (
              <div key={trade._id || trade.id} className="flex flex-col gap-3 rounded-2xl bg-white dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-[10px] font-black ${trade.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {trade.type}
                    </div>
                    <span className="font-bold text-sm">{trade.symbol} {trade.strike} {trade.optionType}</span>
                  </div>
                  <button 
                    onClick={() => onClosePosition(trade._id || trade.id)}
                    className="text-[10px] font-bold text-primary uppercase hover:underline"
                  >
                    Close
                  </button>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    Avg: ₹{trade.price.toFixed(2)} • Qty: {trade.qty}
                  </div>
                  <div className={`text-sm font-bold ${trade.pnl >= 0 ? 'text-trading-up' : 'text-trading-down'}`}>
                    {trade.pnl >= 0 ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <p className="text-base font-bold">Performance</p>
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
        <h3 className="text-lg font-bold">Statistics</h3>
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
            <div key={stat.label} className="rounded-2xl bg-slate-50 dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</p>
              <p className={`text-lg font-bold mt-1 ${stat.color || ''}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Recent Trades</h3>
        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="p-4 text-center text-slate-400 text-xs font-bold">Loading history...</div>
          ) : recentTrades.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-slate-400 font-bold">
              No recent trades
            </div>
          ) : (
            recentTrades.map(trade => (
              <div key={trade._id || trade.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-white/5 p-4 border border-slate-200 dark:border-white/10 shadow-sm">
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
            className={`relative p-6 rounded-3xl border-2 transition-all ${
              plan.recommended 
                ? 'bg-white dark:bg-white/5 border-primary shadow-xl shadow-primary/5' 
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
            }`}
          >
            {plan.tag && (
              <div className="absolute -top-3 right-6 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {plan.tag}
              </div>
            )}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-3xl font-black text-primary">₹{plan.price.toLocaleString('en-IN')}</p>
              </div>
              {plan.recommended && (
                <span className="px-3 py-1 bg-accent-neon/10 text-accent-neon text-[10px] font-black rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              )}
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400 uppercase">Virtual Capital</span>
                <span>₹{plan.capital.toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-200 dark:border-white/10">
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
              className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                plan.recommended 
                  ? 'bg-accent-neon text-black shadow-lg shadow-accent-neon/20' 
                  : 'bg-primary text-white'
              }`}
            >
              Select {plan.name.split(' ')[0]} {plan.recommended ? <Trophy className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <ReceiptText className="text-accent-neon w-5 h-5" />
          Rules FAQ
        </h2>
        <div className="space-y-2">
          {(rules || []).map((rule, i) => (
            <details key={rule._id || rule.id || i} className="group bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
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
    <div className="flex flex-col gap-6 p-4 pb-24">
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
          <User className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold">{userProfile?.name || 'Trader'}</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">Pro Trader • ID: #{userProfile?.uid?.slice(-4) || '----'}</p>
          <p className="text-[10px] text-slate-500 font-bold mt-1">{userProfile?.email} ({userProfile?.role || 'user'})</p>
          {userProfile?.phoneNumber && (
            <p className="text-[10px] text-accent-neon font-bold mt-1 flex items-center justify-center gap-1">
              <Phone className="w-3 h-3" /> {userProfile.phoneNumber}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Wallet Balance</p>
          <p className="text-lg font-bold">₹{userProfile?.balance?.toLocaleString('en-IN') || '0.00'}</p>
          <button 
            onClick={() => setShowWithdrawalModal(true)}
            className="mt-2 text-[10px] font-bold text-primary uppercase tracking-wider hover:underline"
          >
            Withdraw Funds
          </button>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Payouts</p>
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
          className="w-full py-4 bg-primary/10 text-primary font-bold rounded-2xl border border-primary/20 hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
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
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10"
          >
            <div className="flex items-center gap-4">
              <item.icon className="w-5 h-5 text-slate-400" />
              <span className="font-bold text-sm">{item.label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold">Recent Trade History</h3>
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
                  <tr key={trade._id || trade.id} className="border-b border-slate-100 dark:border-white/5">
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
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('trade');
  const [showAuth, setShowAuth] = useState(false);
  const [showOptionChain, setShowOptionChain] = useState(true);
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

  // Sync Dexie data to state when it changes
  useEffect(() => {
    if (localMarketData && localMarketData.length > 0) {
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
    }
  }, [localMarketData]);

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
  const selectedSymbolRef = React.useRef(selectedSymbol);

  useEffect(() => {
    selectedSymbolRef.current = selectedSymbol;
  }, [selectedSymbol]);
  const [isOptionChainLoading, setIsOptionChainLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const openPositions = useMemo(() => allTrades.filter(t => t.status === 'Open'), [allTrades]);
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // MongoDB migration check
    console.log('[App] MongoDB Backend Active');
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

    socket.on('connect', () => {
      setIsSocketConnected(true);
      setConnectionStatus('connected');
      showToast('Market feed connected', 'success');
      console.log('[Market] WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
      setIsSocketConnected(false);
      setConnectionStatus(reason === 'io server disconnect' ? 'disconnected' : 'reconnecting');
      if (reason === 'io server disconnect') {
        socket.connect();
      }
      showToast('Market feed disconnected', 'error');
      console.log('[Market] WebSocket disconnected:', reason);
    });

    socket.on('reconnect_attempt', (attempt) => {
      setConnectionStatus('reconnecting');
      console.log(`[Market] Reconnection attempt #${attempt}`);
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
      console.log('[Market] Provider Status:', data);
      setProviderStatus(prev => ({
        ...prev,
        [data.provider]: {
          status: data.status,
          nextRetryIn: data.nextRetryIn,
          error: data.error
        }
      }));
    });

    socket.on('marketUpdate', async (data) => {
      // Data is now a Record<string, MarketData>
      setMarketData(prev => ({
        ...prev,
        ...data
      }));
      
      // Update local storage (Dexie)
      for (const [symbol, info] of Object.entries(data)) {
        await db.marketData.put({
          symbol,
          price: (info as any).price,
          change: (info as any).change,
          timestamp: (info as any).timestamp,
          optionChain: (info as any).optionChain
        });
      }
      
      if (data[selectedSymbolRef.current]) {
        setIsOptionChainLoading(false);
      }
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
      socket.disconnect(); 
      clearInterval(pollInterval);
    };
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
      
      if (symbolData) {
        const option = symbolData.optionChain.find(o => o.strike === pos.strike);
        if (option) {
          currentPrice = pos.optionType === 'CE' ? option.ce_ltp : option.pe_ltp;
        }
      }
      
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

    setPortfolio({
      equity: currentEquity,
      balance: userProfile.balance || 0,
      unrealizedPnl: totalUnrealizedPnl,
      realizedPnl: realizedPnl,
      totalCharges: totalCharges,
      drawdown: drawdown,
      positions: updatedPositions,
      stats: {
        winRate,
        profitFactor,
        avgWin,
        avgLoss
      }
    });
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

  const handleTrade = async (type: 'BUY' | 'SELL', strike: number, price: number, optionType: 'CE' | 'PE' = 'CE') => {
    if (!user || !userProfile) return;

    // Standard NSE Lot Sizes
    const lotSize = selectedSymbol.includes('Bank') ? 15 : 
                    selectedSymbol.includes('Midcap') ? 75 : 
                    selectedSymbol.includes('Fin') ? 40 : 50;
    
    const charges = calculateCharges(lotSize, price, type === 'SELL');
    
    // For SELL (Shorting), we receive premium but need margin. 
    // For simulation, let's say Margin is 1,00,000 per lot.
    const marginPerLot = 100000;
    const requiredMargin = type === 'SELL' ? marginPerLot : 0;
    
    const cashOutflow = type === 'BUY' ? (price * lotSize) + charges : charges;
    const totalRequired = cashOutflow + requiredMargin;
    
    if (userProfile.balance < totalRequired) {
      const msg = type === 'BUY' 
        ? `Insufficient funds. Required: ₹${totalRequired.toFixed(2)} (Incl. Charges), Available: ₹${userProfile.balance.toFixed(2)}`
        : `Insufficient margin for SELL. Required: ₹${totalRequired.toFixed(2)} (₹1L/Lot Margin), Available: ₹${userProfile.balance.toFixed(2)}`;
      showToast(msg, 'error');
      return;
    }

    try {
      // Balance Change logic:
      // BUY: Balance decreases by (Price * Qty + Charges)
      // SELL: Balance increases by (Price * Qty - Charges)
      const balanceChange = type === 'BUY' ? -cashOutflow : (price * lotSize) - charges;
      const newBalance = userProfile.balance + balanceChange;
      
      await api.upsertUser({
        uid: user.uid,
        balance: newBalance
      });
      setUserProfile(prev => prev ? { ...prev, balance: newBalance } : null);

      const newTrade = await api.addTrade({
        userId: user.uid,
        symbol: selectedSymbol,
        type,
        optionType,
        strike,
        qty: lotSize,
        price: price,
        status: 'Open',
        pnl: 0,
        charges: charges,
        time: new Date().toISOString()
      });
      
      const tradeToStore = { ...newTrade, id: newTrade._id || newTrade.id };
      await db.trades.put(tradeToStore);
      
      const confirmMsg = type === 'BUY' 
        ? `${type} Order Placed. Cost: ₹${cashOutflow.toFixed(2)}`
        : `${type} Order Placed. Credit: ₹${((price * lotSize) - charges).toFixed(2)}`;
      showToast(confirmMsg);
    } catch (error) {
      console.error('Trade failed:', error);
      showToast('Trade failed. Please try again.', 'error');
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

  const navItems: NavItem[] = [
    { id: 'trade', label: 'Trade', icon: CandlestickChart },
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
    <div className={`min-h-screen flex flex-col mx-auto bg-white dark:bg-[#160d08] shadow-2xl relative ${user && hasStarted ? 'max-w-md' : 'max-w-none'}`}>
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
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          providerStatus={providerStatus}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm whitespace-nowrap ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
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
                  showToast('Admin Access Granted');
                } catch (err: any) {
                  showToast(err.message || 'Admin login failed', 'error');
                }
              }}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
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
            onToggleDarkMode={() => setDarkMode(!darkMode)}
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
                      setShowOptionChain(false);
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
                      setIsOptionChainLoading(true);
                    }}
                    selectedStrike={selectedStrike}
                    onStrikeChange={setSelectedStrike}
                    onTrade={handleTrade}
                    openPositions={openPositions}
                    isLive={isSocketConnected}
                    connectionStatus={connectionStatus}
                    expiry={marketData[selectedSymbol].expiry}
                    isMarketOpen={marketData[selectedSymbol].isMarketOpen}
                    dataSource={marketData[selectedSymbol].dataSource}
                  />
                )
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
        <nav className="fixed bottom-0 w-full max-w-md bg-white/90 dark:bg-[#160d08]/90 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 px-4 pb-6 pt-3 z-50">
          <div className="flex justify-around items-center">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  activeTab === item.id ? 'text-primary' : 'text-slate-400'
                }`}
              >
                <item.icon className={`w-6 h-6 ${activeTab === item.id ? 'fill-primary/20' : ''}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
