import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Trophy, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Globe, 
  Zap,
  BarChart3,
  Lock,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onAdminLogin?: (mobile: string, pass: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isLoggedIn?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onAdminLogin, darkMode, onToggleDarkMode, isLoggedIn }) => {
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminCreds, setAdminCreds] = useState({ mobile: '', pass: '' });

  const handleLogoClick = () => {
    const newClicks = logoClicks + 1;
    if (newClicks >= 5) {
      setLogoClicks(0);
      setShowAdminLogin(true);
    } else {
      setLogoClicks(newClicks);
      // Auto-reset clicks after 2 seconds of inactivity
      setTimeout(() => setLogoClicks(0), 2000);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminCreds.mobile === '9691827337' && adminCreds.pass === '888981') {
      onAdminLogin?.(adminCreds.mobile, adminCreds.pass);
      setShowAdminLogin(false);
    } else {
      alert('Invalid admin credentials');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-slate-900 dark:text-white overflow-x-hidden font-sans selection:bg-emerald-500/30 transition-colors duration-300">
      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-white/10 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase tracking-tighter">System Access</h2>
                <button onClick={() => setShowAdminLogin(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                  <Zap className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secret Mobile</label>
                  <input 
                    type="text" 
                    value={adminCreds.mobile}
                    onChange={e => setAdminCreds(prev => ({ ...prev, mobile: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:border-emerald-500 outline-none"
                    placeholder="Enter mobile"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Secret Pin</label>
                  <input 
                    type="password" 
                    value={adminCreds.pass}
                    onChange={e => setAdminCreds(prev => ({ ...prev, pass: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:border-emerald-500 outline-none"
                    placeholder="Enter PIN"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-emerald-500 text-black font-black rounded-xl hover:bg-emerald-400 transition-colors uppercase text-sm tracking-widest"
                >
                  Verify Identity
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div onClick={handleLogoClick} className="flex items-center gap-2 group cursor-pointer">
            <div className="bg-emerald-500 p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <TrendingUp className="w-6 h-6 text-black font-bold" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase font-display">Indo Trader</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-display">
            <a href="#features" className="hover:text-emerald-500 transition-colors">Features</a>
            <a href="#funding" className="hover:text-emerald-500 transition-colors">Funding</a>
            <a href="#rules" className="hover:text-emerald-500 transition-colors">Rules</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onToggleDarkMode}
              className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={onLoginClick}
              className="px-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95 font-display"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Login'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0">
          {/* Saffron Gradient */}
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full" />
          
          {/* India Map Outline (Simplified SVG) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-[80%] h-[80%] text-white fill-current">
              <path d="M100,10 L110,20 L120,15 L130,30 L140,25 L150,40 L145,55 L155,70 L140,85 L145,100 L130,115 L135,130 L120,145 L110,140 L100,160 L90,140 L80,145 L65,130 L70,115 L55,100 L60,85 L45,70 L55,55 L50,40 L60,25 L70,30 L80,15 L90,20 Z" />
            </svg>
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 mix-blend-overlay" />
          
          {/* Abstract Chart Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path d="M0,800 L200,750 L400,780 L600,650 L800,680 L1000,500" stroke="url(#grad1)" strokeWidth="2" fill="none" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6 font-display">
              <Zap className="w-3 h-3 fill-emerald-500" /> India's First Dedicated Options Prop Firm
            </span>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 font-display">
              Get Funded to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">Trade Options</span> in India
            </h1>
            
            <p className="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-lg md:text-xl font-medium mb-12 leading-relaxed">
              Up to <span className="text-slate-900 dark:text-white font-bold">₹1 Crore</span> Funded Capital • Trade Bank Nifty & Nifty Options • Keep up to <span className="text-emerald-500 font-bold">90% Profit</span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onLoginClick}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)] font-display uppercase tracking-widest text-xs"
              >
                {isLoggedIn ? 'Go to Dashboard' : 'Login with Mobile Number'} <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={onLoginClick}
                className="w-full sm:w-auto px-8 py-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 font-black rounded-2xl flex items-center justify-center gap-2 transition-all font-display text-slate-900 dark:text-white uppercase tracking-widest text-xs"
              >
                Start Free Evaluation
              </button>
            </div>
          </motion.div>

          {/* Hero Image / Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] -z-10 rounded-full scale-75" />
            <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-4 shadow-2xl overflow-hidden">
              <div className="bg-[#0a0a0a] rounded-[1.5rem] aspect-video flex items-center justify-center relative overflow-hidden">
                {/* Option Chain UI */}
                <div className="absolute inset-0 p-8 grid grid-cols-4 gap-4 opacity-40">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-12 bg-white/5 rounded-lg border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <div className="relative z-10 flex flex-col items-center gap-4">
                   <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                      <BarChart3 className="w-10 h-10 text-emerald-500" />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-widest text-emerald-500/50">Real-time Option Chain Engine</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <Zap className="w-6 h-6 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">UPI Supported</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Globe className="w-6 h-6 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Real-time Option Chain</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Trophy className="w-6 h-6 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Paper + Funded Mode</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">SEBI Compliant Disclaimer</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 font-display text-slate-900 dark:text-white">Built for the <span className="text-emerald-500">Indian Market</span></h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium">Advanced trading infrastructure designed specifically for Nifty and Bank Nifty options traders.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Instant Funding', desc: 'Get access to capital within 24 hours of passing your evaluation.', icon: Zap },
              { title: '90% Profit Split', desc: 'Keep the majority of your hard-earned profits with our industry-leading split.', icon: Trophy },
              { title: 'No Hidden Rules', desc: 'Transparent trading rules. No consistency rules or hidden traps.', icon: Lock },
              { title: 'Dhan Integration', desc: 'Seamlessly connect your Dhan account for lightning fast execution.', icon: Zap },
              { title: 'Advanced Analytics', desc: 'Deep dive into your trading performance with our custom dashboard.', icon: BarChart3 },
              { title: 'Dedicated Support', desc: '24/7 support from experienced Indian options traders.', icon: Globe },
            ].map((f, i) => (
              <div key={i} className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem] hover:bg-slate-100 dark:hover:bg-white/10 transition-all group cursor-default">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold mb-3 font-display text-slate-900 dark:text-white">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-20">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-emerald-500 p-1.5 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-black font-bold" />
                </div>
                <span className="text-xl font-black tracking-tighter uppercase font-display text-slate-900 dark:text-white">Indo Trader</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
                Indo Trader is a premier prop trading firm providing capital to skilled options traders in India. We empower traders to scale their strategies without risking their own capital.
              </p>
              <div className="flex gap-4">
                {/* Social Icons Placeholder */}
                <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all cursor-pointer text-slate-600 dark:text-slate-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-black transition-all cursor-pointer text-slate-600 dark:text-slate-400">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Platform</span>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Trading Terminal</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Option Chain</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Leaderboard</a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Company</span>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">About Us</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Careers</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Contact</a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">Legal</span>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Privacy Policy</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Terms of Service</a>
                <a href="#" className="text-slate-500 dark:text-slate-400 text-sm hover:text-emerald-500 transition-colors">Risk Disclosure</a>
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              © 2026 Indo Trader. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" /> SEBI Registered Investment Advisor
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
