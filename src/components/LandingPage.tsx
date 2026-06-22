import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Gauge,
  Globe,
  Layers,
  LineChart,
  Lock,
  Menu,
  MonitorSmartphone,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onAdminLogin?: (mobile: string, pass: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isLoggedIn?: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const sectionMotion = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.65, ease: 'easeOut' },
  variants: fadeUp,
} as const;

const primaryButton =
  'group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-cyan-300 px-6 py-3 text-sm font-black text-slate-950 shadow-[0_20px_70px_rgba(45,212,191,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_90px_rgba(45,212,191,0.4)] active:translate-y-0';

const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-white/[0.1] active:translate-y-0';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const GlassCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cx('rounded-[2rem] border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/20 backdrop-blur-2xl', className)}>
    {children}
  </div>
);

const CandlestickPreview = ({ compact = false }: { compact?: boolean }) => {
  const candles = [
    { h: 70, y: 34, body: 34, up: true },
    { h: 102, y: 22, body: 46, up: true },
    { h: 84, y: 46, body: 30, up: false },
    { h: 118, y: 18, body: 58, up: true },
    { h: 74, y: 58, body: 28, up: false },
    { h: 128, y: 20, body: 64, up: true },
    { h: 94, y: 32, body: 42, up: true },
    { h: 130, y: 24, body: 54, up: false },
    { h: 96, y: 50, body: 38, up: false },
    { h: 142, y: 12, body: 70, up: true },
    { h: 108, y: 30, body: 44, up: true },
    { h: 132, y: 18, body: 58, up: true },
  ];

  return (
    <div className={cx('relative overflow-hidden rounded-3xl border border-white/10 bg-[#081019]', compact ? 'h-56' : 'h-[320px] md:h-[390px]')}>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(16,185,129,0.22),transparent_34%),radial-gradient(circle_at_24%_82%,rgba(6,182,212,0.16),transparent_30%)]" />
      <svg className="absolute inset-x-0 bottom-10 h-40 w-full opacity-70" viewBox="0 0 760 180" preserveAspectRatio="none">
        <path
          d="M0 132 C74 100 92 118 140 86 C202 43 242 96 298 72 C354 48 388 22 438 55 C500 96 536 80 592 42 C638 12 686 32 760 18"
          fill="none"
          stroke="url(#landing-chart-line)"
          strokeWidth="3"
        />
        <path
          d="M0 132 C74 100 92 118 140 86 C202 43 242 96 298 72 C354 48 388 22 438 55 C500 96 536 80 592 42 C638 12 686 32 760 18 L760 180 L0 180 Z"
          fill="url(#landing-chart-fill)"
        />
        <defs>
          <linearGradient id="landing-chart-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="55%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#bef264" />
          </linearGradient>
          <linearGradient id="landing-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-5 top-8 flex h-40 items-end justify-between gap-2">
        {candles.map((candle, index) => (
          <motion.div
            key={`${candle.y}-${index}`}
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.45, delay: index * 0.055 }}
            className="relative flex flex-1 origin-bottom justify-center"
            style={{ height: candle.h }}
          >
            <span className="absolute top-0 h-full w-px rounded-full bg-white/30" />
            <span
              className={cx(
                'absolute w-full max-w-[18px] rounded-md shadow-lg',
                candle.up ? 'bg-emerald-400 shadow-emerald-400/20' : 'bg-rose-400 shadow-rose-400/20'
              )}
              style={{ top: candle.y, height: candle.body }}
            />
          </motion.div>
        ))}
      </div>
      <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-xl">
        <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
        Live NIFTY 50
      </div>
      <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-3">
        {[
          ['Equity', '₹12.5L', 'text-emerald-300'],
          ['Risk Used', '3.8%', 'text-cyan-200'],
          ['Today', '+₹18,420', 'text-lime-300'],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className={cx('mt-1 text-sm font-black md:text-base', color)}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const HeroDashboardMockup = () => (
  <motion.div
    initial={{ opacity: 0, y: 30, rotateX: 8 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ duration: 0.85, delay: 0.2, ease: 'easeOut' }}
    className="relative mx-auto max-w-2xl lg:mx-0"
  >
    <div className="absolute -left-10 top-16 hidden rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-black text-emerald-200 shadow-2xl shadow-emerald-500/20 backdrop-blur-xl sm:block">
      +₹24,880 Profit
    </div>
    <div className="absolute -right-8 bottom-24 hidden rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-black text-rose-200 shadow-2xl shadow-rose-500/10 backdrop-blur-xl md:block">
      Risk Cut: -1.2%
    </div>
    <GlassCard className="relative overflow-hidden p-3">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,0.18),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(14,165,233,0.14),transparent_30%)]" />
      <div className="relative rounded-[1.65rem] border border-white/10 bg-slate-950/80 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200/70">TradeBul Terminal</p>
            <h3 className="mt-1 text-lg font-black text-white">Challenge Dashboard</h3>
          </div>
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-300" />
            <span className="h-3 w-3 rounded-full bg-emerald-300" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
          <CandlestickPreview />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {([
              ['P&L', '+₹42,650', TrendingUp, 'text-emerald-300'],
              ['Win Rate', '68.4%', Trophy, 'text-lime-300'],
              ['Active Traders', '12,842', Globe, 'text-cyan-200'],
            ] satisfies Array<[string, string, LucideIcon, string]>).map(([label, value, CardIcon, color]) => {
              return (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                    <CardIcon className={cx('h-5 w-5', color)} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
                  <p className={cx('mt-1 text-xl font-black', color)}>{value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassCard>
  </motion.div>
);

const Header = ({
  onLoginClick,
  isLoggedIn,
  darkMode,
  onToggleDarkMode,
  onLogoClick,
}: {
  onLoginClick: () => void;
  isLoggedIn?: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogoClick: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ['Plans', '#plans'],
    ['Platform', '#platform'],
    ['Features', '#features'],
    ['FAQ', '#faq'],
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050812]/78 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <button onClick={onLogoClick} className="group flex items-center gap-3 text-left">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-slate-950 shadow-[0_0_40px_rgba(45,212,191,0.35)] transition-transform duration-300 group-hover:rotate-6">
            <TrendingUp className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-base font-black uppercase tracking-[-0.04em] text-white">TradeBul</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-200/70">Prop Trading</span>
          </span>
        </button>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map(([label, href]) => (
            <a key={label} href={href} className="text-xs font-black uppercase tracking-[0.22em] text-slate-400 transition-colors hover:text-emerald-200">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={onToggleDarkMode}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={onLoginClick} className={secondaryButton}>
            {isLoggedIn ? 'Dashboard' : 'Login'}
          </button>
          <button onClick={onLoginClick} className={primaryButton}>
            Start Challenge <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <button
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white md:hidden"
          aria-label="Open menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-t border-white/10 bg-[#060914] px-4 py-5 md:hidden"
          >
            <div className="flex flex-col gap-3">
              {links.map(([label, href]) => (
                <a key={label} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-bold text-slate-200">
                  {label}
                </a>
              ))}
              <button onClick={onLoginClick} className={primaryButton}>
                {isLoggedIn ? 'Go to Dashboard' : 'Start Challenge'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Hero = ({ onLoginClick, isLoggedIn }: { onLoginClick: () => void; isLoggedIn?: boolean }) => (
  <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-40">
    <div className="absolute inset-0 bg-[#050812]" />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
    <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-[110px]" />
    <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-[130px]" />
    <div className="absolute bottom-0 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-lime-300/10 blur-[120px]" />

    <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
      <motion.div initial="hidden" animate="visible" transition={{ duration: 0.75, ease: 'easeOut' }} variants={fadeUp}>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-200">
          <Sparkles className="h-4 w-4" />
          Real-time prop trading workspace
        </div>
        <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl xl:text-[5.6rem]">
          Get Funded. Trade Smarter. Scale Without Limits.
        </h1>
        <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
          A professional prop trading platform with real-time charts, advanced analytics, risk controls, and funding plans built for serious traders.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <button onClick={onLoginClick} className={primaryButton}>
            {isLoggedIn ? 'Go to Dashboard' : 'Start Challenge'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button onClick={onLoginClick} className={secondaryButton}>
            View Platform <MonitorSmartphone className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-10 flex flex-wrap gap-3 text-xs font-bold text-slate-400">
          {['No fake candles', 'Live Dhan-ready stack', 'Risk-first dashboard'].map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {item}
            </span>
          ))}
        </div>
      </motion.div>

      <HeroDashboardMockup />
    </div>
  </section>
);

const Stats = () => {
  const stats = [
    ['₹250Cr+', 'Simulated Trading Volume', Activity],
    ['50,000+', 'Traders', Globe],
    ['99.9%', 'Platform Uptime', ShieldCheck],
    ['Real-Time', 'Market Data', Zap],
  ] satisfies Array<[string, string, LucideIcon]>;

  return (
    <section className="relative border-y border-white/10 bg-[#08111d] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([value, label, StatIcon], index) => {
          return (
            <motion.div
              key={label}
              {...sectionMotion}
              transition={{ duration: 0.55, delay: index * 0.06 }}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
                <StatIcon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-black text-white md:text-3xl">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

const FundingPlans = ({ onLoginClick }: { onLoginClick: () => void }) => {
  const plans = [
    {
      name: 'Starter',
      amount: '₹2.5L',
      type: 'Single-step challenge',
      target: '8%',
      drawdown: '6%',
      dailyLoss: '3%',
      featured: false,
    },
    {
      name: 'Professional',
      amount: '₹10L',
      type: 'Two-step evaluation',
      target: '10%',
      drawdown: '8%',
      dailyLoss: '4%',
      featured: true,
    },
    {
      name: 'Elite',
      amount: '₹25L',
      type: 'Scale-up challenge',
      target: '12%',
      drawdown: '10%',
      dailyLoss: '5%',
      featured: false,
    },
  ];

  return (
    <section id="plans" className="relative overflow-hidden bg-[#050812] px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-emerald-400/10 blur-[130px]" />
      <motion.div {...sectionMotion} className="relative mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Funding Plans</p>
        <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">Choose a funding plan that fits your trading rhythm.</h2>
        <p className="mt-5 text-slate-400">Clear rules, transparent targets, and risk controls designed for disciplined traders.</p>
      </motion.div>

      <div className="relative mx-auto mt-14 grid max-w-7xl gap-5 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            {...sectionMotion}
            transition={{ duration: 0.6, delay: index * 0.08 }}
            className={cx(
              'relative rounded-[2rem] border p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-2',
              plan.featured
                ? 'border-emerald-300/45 bg-gradient-to-b from-emerald-300/16 to-white/[0.055] shadow-[0_35px_110px_rgba(16,185,129,0.18)]'
                : 'border-white/10 bg-white/[0.045]'
            )}
          >
            {plan.featured && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-emerald-300 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-950">
                Most Popular
              </div>
            )}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{plan.type}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
            <p className="text-5xl font-black tracking-[-0.06em] text-white">{plan.amount}</p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Funding amount</p>
            <div className="my-8 h-px bg-white/10" />
            <div className="space-y-4">
              {[
                ['Profit Target', plan.target],
                ['Max Drawdown', plan.drawdown],
                ['Daily Loss Limit', plan.dailyLoss],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-2xl bg-white/[0.045] px-4 py-3">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="font-black text-white">{value}</span>
                </div>
              ))}
            </div>
            <button onClick={onLoginClick} className={cx(primaryButton, 'mt-8 w-full')}>
              Start {plan.name}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const PlatformPreview = () => (
  <section id="platform" className="relative overflow-hidden bg-[#07101b] px-4 py-24 sm:px-6 lg:px-8">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
    <motion.div {...sectionMotion} className="mx-auto max-w-7xl">
      <div className="mb-12 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Platform Preview</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">A trading desk that feels connected to your real workflow.</h2>
        </div>
        <p className="max-w-2xl text-slate-400 lg:ml-auto">
          Visuals mirror the actual app experience: charts, option chain, watchlist, P&L, and risk controls in one focused trading cockpit.
        </p>
      </div>

      <GlassCard className="overflow-hidden p-3">
        <div className="grid gap-3 rounded-[1.75rem] bg-slate-950/75 p-3 lg:grid-cols-[220px_1fr_280px]">
          <div className="space-y-3">
            {['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'SENSEX'].map((symbol, index) => (
              <div key={symbol} className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-white">{symbol}</p>
                  <span className={cx('text-xs font-bold', index % 2 === 0 ? 'text-emerald-300' : 'text-rose-300')}>
                    {index % 2 === 0 ? '+0.42%' : '-0.18%'}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-white">{['23,366', '54,496', '25,056', '74,243'][index]}</p>
              </div>
            ))}
          </div>

          <CandlestickPreview />

          <div className="grid gap-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Option Chain</p>
              {[23300, 23350, 23400, 23450].map((strike, index) => (
                <div key={strike} className="mb-2 grid grid-cols-3 gap-2 rounded-2xl bg-slate-950/60 px-3 py-2 text-xs">
                  <span className="text-emerald-300">{(161 - index * 19).toFixed(2)}</span>
                  <span className="text-center font-black text-white">{strike}</span>
                  <span className="text-right text-rose-300">{(105 + index * 22).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
                <Gauge className="mb-3 h-5 w-5 text-cyan-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Risk</p>
                <p className="mt-1 text-xl font-black text-white">3.8%</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-4">
                <Target className="mb-3 h-5 w-5 text-emerald-200" />
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Target</p>
                <p className="mt-1 text-xl font-black text-white">8.0%</p>
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">P&L Summary</p>
              <p className="mt-2 text-3xl font-black text-emerald-200">+₹42,650</p>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  </section>
);

const Features = () => {
  const features = [
    ['Real-Time Charts', 'Candlestick workflows with timeframe-aware live updates.', LineChart],
    ['Advanced Option Chain', 'CE/PE rows, OI, volume, LTP, and strike selection.', Layers],
    ['Risk Management', 'Daily loss, max drawdown, and challenge-rule visibility.', ShieldCheck],
    ['Fast Execution', 'A focused interface built for decisive trading sessions.', Zap],
    ['Trader Analytics', 'Track decisions, outcomes, and performance trends.', BarChart3],
    ['Secure Dashboard', 'Protected access for trader accounts and admins.', Lock],
    ['Multi-Device Access', 'Responsive layouts across desktop, tablet, and mobile.', MonitorSmartphone],
    ['Clean Performance Tracking', 'P&L summaries without distracting clutter.', Activity],
  ] satisfies Array<[string, string, LucideIcon]>;

  return (
    <section id="features" className="bg-[#050812] px-4 py-24 sm:px-6 lg:px-8">
      <motion.div {...sectionMotion} className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Features</p>
        <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">Everything serious traders expect from a premium prop platform.</h2>
      </motion.div>
      <div className="mx-auto mt-14 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(([title, desc, FeatureIcon], index) => {
          return (
            <motion.div
              key={title}
              {...sectionMotion}
              transition={{ duration: 0.55, delay: index * 0.045 }}
              className="group rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 transition-all duration-300 hover:-translate-y-2 hover:border-emerald-300/30 hover:bg-white/[0.07]"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-emerald-200 transition-transform duration-300 group-hover:scale-110">
                <FeatureIcon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    ['Choose a Challenge', 'Select the funding plan and rules that match your trading style.', Wallet],
    ['Trade With Rules', 'Use the platform, manage risk, and stay inside challenge limits.', Cpu],
    ['Scale Your Account', 'Build consistency and move toward larger account sizes.', Trophy],
  ] satisfies Array<[string, string, LucideIcon]>;

  return (
    <section className="bg-[#07101b] px-4 py-24 sm:px-6 lg:px-8">
      <motion.div {...sectionMotion} className="mx-auto max-w-7xl">
        <div className="mb-14 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">How It Works</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">Simple path. Professional discipline.</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {steps.map(([title, desc, StepIcon], index) => {
            return (
              <div key={title} className="relative rounded-[2rem] border border-white/10 bg-white/[0.045] p-7">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
                    <StepIcon className="h-7 w-7" />
                  </div>
                  <span className="text-6xl font-black tracking-[-0.08em] text-white/[0.06]">0{index + 1}</span>
                </div>
                <h3 className="text-2xl font-black text-white">{title}</h3>
                <p className="mt-3 leading-7 text-slate-400">{desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

const Testimonials = () => {
  const testimonials = [
    ['UI Placeholder', 'The dashboard preview feels built for fast decisions. The risk cards make the challenge rules easy to keep in view.'],
    ['UI Placeholder', 'Clean charting, option chain context, and P&L visibility in one workspace is exactly what a prop trader needs.'],
    ['UI Placeholder', 'The platform style feels premium without hiding the important numbers behind unnecessary clutter.'],
  ];

  return (
    <section className="bg-[#050812] px-4 py-24 sm:px-6 lg:px-8">
      <motion.div {...sectionMotion} className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">Social Proof</p>
        <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">Designed to feel trustworthy before the first trade.</h2>
        <p className="mt-5 text-sm text-slate-500">These are UI placeholder testimonials for layout only, not verified customer claims.</p>
      </motion.div>
      <div className="mx-auto mt-14 grid max-w-7xl gap-5 lg:grid-cols-3">
        {testimonials.map(([name, quote], index) => (
          <motion.div key={`${name}-${index}`} {...sectionMotion} transition={{ duration: 0.55, delay: index * 0.08 }} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-300 text-sm font-black text-slate-950">
                UI
              </div>
              <div>
                <p className="font-black text-white">{name}</p>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Design preview copy</p>
              </div>
            </div>
            <p className="leading-7 text-slate-300">"{quote}"</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const items = [
    ['How does the challenge work?', 'Choose a plan, trade within the published rules, and track your progress through the dashboard. Access and next steps are handled through the existing account flow.'],
    ['What markets can I trade?', 'The platform is designed around supported Indian index workflows such as NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY, SENSEX, and related option premium charts where live data is available.'],
    ['How is risk managed?', 'Risk is controlled through daily loss limits, max drawdown, targets, P&L tracking, and visible dashboard metrics that help traders stay disciplined.'],
    ['Can I use the platform on mobile?', 'Yes. The landing page and dashboard shell are responsive, with layouts optimized for desktop, tablet, and mobile usage.'],
    ['When do I get access to dashboard?', 'After login or signup through the existing authentication flow, the app routes you into the dashboard experience without changing existing functionality.'],
  ];

  return (
    <section id="faq" className="bg-[#07101b] px-4 py-24 sm:px-6 lg:px-8">
      <motion.div {...sectionMotion} className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.78fr_1.22fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">FAQ</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">Questions traders ask before starting.</h2>
        </div>
        <div className="space-y-3">
          {items.map(([question, answer], index) => {
            const isOpen = openIndex === index;
            return (
              <div key={question} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045]">
                <button
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                >
                  <span className="font-black text-white">{question}</span>
                  <ChevronDown className={cx('h-5 w-5 shrink-0 text-emerald-200 transition-transform', isOpen && 'rotate-180')} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="px-5 pb-5 leading-7 text-slate-400">{answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};

const FinalCTA = ({ onLoginClick, isLoggedIn }: { onLoginClick: () => void; isLoggedIn?: boolean }) => (
  <section className="relative overflow-hidden bg-[#050812] px-4 py-24 sm:px-6 lg:px-8">
    <div className="absolute inset-x-4 inset-y-16 rounded-[3rem] bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.34),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.24),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))]" />
    <motion.div {...sectionMotion} className="relative mx-auto max-w-4xl rounded-[2.5rem] border border-white/10 p-8 text-center backdrop-blur-2xl sm:p-12">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-100">Final Step</p>
      <h2 className="mt-4 text-4xl font-black tracking-[-0.055em] text-white sm:text-6xl">Ready to Trade With a Professional Funding Plan?</h2>
      <p className="mx-auto mt-5 max-w-2xl text-slate-200">Start the challenge flow or return to the dashboard using the existing app routes and authentication.</p>
      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={onLoginClick} className={primaryButton}>
          Start Challenge <ArrowRight className="h-4 w-4" />
        </button>
        <button onClick={onLoginClick} className={secondaryButton}>
          {isLoggedIn ? 'Login to Dashboard' : 'Login to Dashboard'}
        </button>
      </div>
    </motion.div>
  </section>
);

const Footer = ({ onLoginClick }: { onLoginClick: () => void }) => (
  <footer className="border-t border-white/10 bg-[#050812] px-4 py-12 sm:px-6 lg:px-8">
    <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-slate-950">
          <TrendingUp className="h-6 w-6" />
        </span>
        <div>
          <p className="font-black uppercase tracking-[-0.04em] text-white">TradeBul Prop Trading</p>
          <p className="text-xs text-slate-500">Premium trading challenges and dashboard infrastructure.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onLoginClick} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:text-white">
          Login
        </button>
        <a href="#plans" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:text-white">
          Plans
        </a>
        <a href="#faq" className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-colors hover:text-white">
          FAQ
        </a>
      </div>
    </div>
  </footer>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onAdminLogin,
  darkMode,
  onToggleDarkMode,
  isLoggedIn,
}) => {
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ mobile: '', pass: '' });

  const handleLogoClick = () => {
    const nextClicks = logoClicks + 1;
    if (nextClicks >= 5) {
      setLogoClicks(0);
      setShowAdminLogin(true);
      return;
    }
    setLogoClicks(nextClicks);
    window.setTimeout(() => setLogoClicks(0), 2000);
  };

  const handleAdminSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (adminCreds.mobile === '9691827337' && adminCreds.pass === '888981') {
      onAdminLogin?.(adminCreds.mobile, adminCreds.pass);
      setShowAdminLogin(false);
      return;
    }
    alert('Invalid admin credentials');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050812] font-sans text-white selection:bg-emerald-300/30">
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-slate-950 p-7 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">System</p>
                  <h2 className="mt-1 text-2xl font-black text-white">Admin Access</h2>
                </div>
                <button onClick={() => setShowAdminLogin(false)} className="rounded-full bg-white/10 p-2 text-slate-300 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Secret Mobile</label>
                  <input
                    type="text"
                    value={adminCreds.mobile}
                    onChange={(event) => setAdminCreds((prev) => ({ ...prev, mobile: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-300"
                    placeholder="Enter mobile"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Secret Pin</label>
                  <input
                    type="password"
                    value={adminCreds.pass}
                    onChange={(event) => setAdminCreds((prev) => ({ ...prev, pass: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-300"
                    placeholder="Enter PIN"
                  />
                </div>
                <button type="submit" className={cx(primaryButton, 'w-full')}>
                  Verify Identity
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Header
        onLoginClick={onLoginClick}
        isLoggedIn={isLoggedIn}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onLogoClick={handleLogoClick}
      />
      <main>
        <Hero onLoginClick={onLoginClick} isLoggedIn={isLoggedIn} />
        <Stats />
        <FundingPlans onLoginClick={onLoginClick} />
        <PlatformPreview />
        <Features />
        <HowItWorks />
        <Testimonials />
        <FAQ />
        <FinalCTA onLoginClick={onLoginClick} isLoggedIn={isLoggedIn} />
      </main>
      <Footer onLoginClick={onLoginClick} />
    </div>
  );
};
