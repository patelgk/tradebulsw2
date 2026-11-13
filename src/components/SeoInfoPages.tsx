import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { LOGO_ALT, BrandIconSVG } from './BrandLogo';

const pageLinks = [
  { label: 'What is Proprupee?', href: '/what-is-proprupee' },
  { label: 'How Proprupee Works', href: '/how-proprupee-works' },
  { label: 'Trader Evaluation', href: '/trader-evaluation' },
  { label: 'Funding Program', href: '/funding-program' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
  { label: 'Risk Disclaimer', href: '/risk-disclaimer' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Refund & Cancellation', href: '/refund-policy' },
];

const setMeta = (name: string, content: string) => {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setOgMeta = (property: string, content: string) => {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const setSeoTags = (title: string, description: string, canonical: string) => {
  if (typeof document === 'undefined') return;

  // Title
  document.title = title;

  // Meta description + robots
  setMeta('description', description);
  setMeta('robots', 'index, follow');

  // Canonical
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonical);

  // Open Graph
  setOgMeta('og:title', title);
  setOgMeta('og:description', description);
  setOgMeta('og:url', canonical);

  // Twitter
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
};

interface SeoPageProps {
  title: string;
  description: string;
  heading: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string[];
    bullets?: string[];
  }>;
}

const SeoPageLayout: React.FC<SeoPageProps> = ({ title, description, heading, intro, sections }) => {
  useEffect(() => {
    setSeoTags(title, description, `https://www.proprupee.com${window.location.pathname}`);
  }, [title, description]);

  return (
    <div className="min-h-screen bg-[#121717] text-white">
      <header className="border-b border-white/10 bg-[#121717]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <a href="/" className="flex items-center gap-2.5" aria-label="Proprupee home">
            <BrandIconSVG size={32} className="rounded-xl" />
            <span className="text-sm font-black uppercase tracking-[0.2em] text-white">
              Prop<span className="text-[#4ade80]">Rupee</span>
            </span>
          </a>
          <nav className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            {pageLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-emerald-200">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 rounded-[2rem] border border-emerald-300/20 bg-emerald-300/8 p-6 sm:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200">Indian Prop Firm for Traders</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">{heading}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{intro}</p>
        </div>

        <div className="space-y-8">
          {sections.map((section, index) => (
            <section key={section.heading} id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-white">{index + 1}. {section.heading}</h2>
              </div>

              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-base leading-8 text-slate-300">{paragraph}</p>
              ))}

              {section.bullets && (
                <ul className="mt-5 space-y-3 text-slate-300">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-emerald-200" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-[-0.04em] text-white">Learn more about Proprupee</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {pageLinks.map((link) => (
              <a key={link.href} href={link.href} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-emerald-300/40 hover:text-white">
                {link.label}
                <ArrowRight className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export const WhatIsProprupeePage: React.FC = () => (
  <SeoPageLayout
    title="What is Proprupee? | Prop Firm & Trader Funding Platform in India"
    description="Proprupee evaluates traders based on their trading skills, strategy, and risk management before providing eligible traders access to its funding program in India."
    heading="What is Proprupee?"
    intro="Proprupee is a trader evaluation and funding platform designed for active traders in India. The platform uses a structured challenge model to assess whether a trader can generate consistent performance while respecting defined risk limits. Eligible traders who pass the evaluation may then access the Proprupee funded account program, which offers profit splits up to 90% depending on the selected challenge tier. The platform operates across major Indian equity derivatives markets, including NIFTY, BANKNIFTY, FINNIFTY, and SENSEX index instruments."
    sections={[
      {
        heading: 'A prop firm and trader funding platform',
        body: [
          'Proprupee functions as an Indian prop trading evaluation platform that connects skilled traders with capital access through a transparent challenge-based system. Rather than relying solely on personal funds, traders demonstrate their ability to trade consistently within predefined parameters — profit targets, daily loss limits, and maximum drawdown thresholds — before being considered for funded account status.',
          'The platform supports evaluation across the most actively traded Indian market indexes: NIFTY 50, BANKNIFTY, FINNIFTY, and SENSEX. These are the primary instruments available during the challenge period, and they align with the trading preferences of the majority of Indian retail derivatives participants.'
        ]
      },
      {
        heading: 'How the platform works',
        body: [
          'The Proprupee journey follows a three-stage pathway: first, a trader selects a challenge plan that matches their preferred account size and risk tolerance. Second, they complete the evaluation phase by trading under the platform\'s rules — hitting the profit target while staying within all daily and overall loss limits. Third, if the trader meets every condition successfully, they become eligible for the funding program where profit splits range from 80% to 90% depending on the tier chosen.',
          'This structure exists because consistent execution under pressure is what separates profitable traders from the rest. By requiring adherence to strict risk limits during evaluation, the platform identifies traders who prioritize capital preservation alongside returns.'
        ],
        bullets: [
          'Challenge fees start at ₹9,999 and vary by account tier and current promotional pricing.',
          'Profit targets typically range from 8% to 10% per evaluation phase, though exact figures depend on the selected plan.',
          'Daily loss limits and maximum drawdown caps are clearly stated upfront for each challenge tier.',
          'Payout cycles operate on a 15-day schedule for eligible funded traders, subject to platform policy.'
        ]
      },
      {
        heading: 'Why traders search for Proprupee',
        body: [
          'Indian traders searching for terms like "prop firm India", "trading evaluation India", or "funded trader program" are looking for platforms that offer real capital access without requiring large personal deposits. Proprupee addresses this need by combining transparent rules, measurable performance criteria, and a clear path from evaluation to funded status.',
          'Unlike traditional brokerage accounts that require significant capital to trade meaningfully, prop firm evaluations allow skilled traders to demonstrate capability with smaller entry fees and then scale their trading activity under a funded account structure.'
        ]
      }
    ]}
  />
);

export const HowProprupeeWorksPage: React.FC = () => (
  <SeoPageLayout
    title="How Proprupee Works | Step-by-Step Trading Challenge & Funding Guide"
    description="Complete step-by-step guide to how Proprupee works: select a challenge, pass evaluation with risk management, and access funded trading with up to 90% profit split."
    heading="How Proprupee Works"
    intro="Proprupee follows a straightforward three-step process: traders choose a challenge plan, complete the evaluation phase while following all risk rules, and if they qualify, enter the funding program where they trade with platform capital and retain up to 90% of profits. Every rule and threshold is disclosed before purchase so there are no surprises."
    sections={[
      {
        heading: 'Step 1: Select your challenge plan',
        body: [
          'The first step is choosing a challenge plan from the Proprupee dashboard. Each plan specifies an account size (the hypothetical capital you will trade with), a profit target percentage (typically between 8% and 10%), and the associated risk limits including daily loss cap and maximum drawdown. Challenge fees range from ₹9,999 to ₹99,999 depending on the tier.',
          'Traders should review each plan carefully, comparing the profit target against the risk limits to understand what consistency level is required. A higher account size means a larger funded potential but also typically carries proportionally larger absolute loss limits.'
        ]
      },
      {
        heading: 'Step 2: Complete the evaluation phase',
        body: [
          'Once a challenge is purchased, the evaluation period begins. During this time, traders must reach the stated profit target while never breaching the daily loss limit or the maximum drawdown threshold. These constraints exist to ensure that only traders who can manage risk systematically progress to the funded stage.',
          'Evaluation is tracked in real time through the Proprupee dashboard. Progress toward the profit target, remaining daily loss room, and current drawdown are all visible at every moment. This transparency helps traders make informed decisions rather than guessing whether they are close to breaching any rule.'
        ],
        bullets: [
          'Daily loss limit: the maximum loss allowed in a single trading day — breaching this invalidates the challenge immediately.',
          'Maximum drawdown: the largest cumulative decline from peak equity allowed during the entire evaluation period.',
          'Profit target: usually 8–10%, though this varies by challenge tier and current platform policy.',
          'Allowed instruments: primarily NIFTY, BANKNIFTY, FINNIFTY, and SENSEX index futures and options contracts.'
        ]
      },
      {
        heading: 'Step 3: Enter the funding program',
        body: [
          'After successfully completing the evaluation without violating any rules, the trader becomes eligible for the Proprupee funding program. The funded account mirrors the challenge account size, and profit splits range from 80% to 90% depending on which tier was selected. Payouts are processed on a 15-day cycle once the trader meets minimum profit thresholds and complies with ongoing risk rules.',
          'If a funded trader breaches any rule during the funded phase, the account may be subject to review and possible termination according to the platform\'s policies. Maintaining discipline after funding begins is just as important as passing the evaluation itself.'
        ]
      }
    ]}
  />
);

export const TraderEvaluationPage: React.FC = () => (
  <SeoPageLayout
    title="Trader Evaluation Process | Proprupee Risk Management Rules Explained"
    description="Understand Proprupee's evaluation metrics: profit targets, daily loss limits, maximum drawdown, and the risk rules that determine funding eligibility for Indian traders."
    heading="Trader Evaluation"
    intro="The Proprupee trader evaluation tests whether a participant can generate returns while strictly managing downside risk. It measures consistency, not aggression — disciplined traders who respect their loss limits are exactly the profile the platform looks for before granting funded account access."
    sections={[
      {
        heading: 'What the evaluation measures',
        body: [
          'Proprupee\'s evaluation focuses on two core dimensions: profitability and risk control. A trader must hit the profit target, but equally important is whether they did so without taking excessive risk. Overleveraging, revenge trading, or ignoring stop-loss discipline are behaviors that fail the evaluation even if the final result is positive.',
          'The platform reviews whether a trader stays within every defined limit throughout the full evaluation period. Missing the target by a small margin is far less damaging than hitting it through reckless position sizing that would be unsustainable in live trading conditions.'
        ]
      },
      {
        heading: 'Key risk controls',
        body: [
          'Every challenge includes explicit risk boundaries that protect both the trader and the platform\'s capital allocation model. Daily loss limits prevent catastrophic single-day blowups, while maximum drawdown caps ensure traders cannot give back all accumulated gains through a prolonged losing streak. Understanding these limits before placing a single trade is essential to passing the evaluation.',
          'The specific values for daily loss and maximum drawdown are tied to the challenge tier selected. Higher-tier plans generally allow proportionally larger absolute losses but maintain the same relative percentages, keeping the risk-reward discipline consistent across all account sizes.'
        ],
        bullets: [
          'Daily loss limit: triggers challenge failure if breached on any single trading day.',
          'Maximum drawdown: calculated from peak equity and applied to the entire evaluation period, not reset daily.',
          'Profit target: typically 8–10% of the challenge account size; achieved before any rule breach.',
          'Instrument restrictions: only approved index futures and options contracts are tradable during evaluation.'
        ]
      },
      {
        heading: 'Who the evaluation suits',
        body: [
          'The evaluation is best suited for traders who already have a tested strategy and understand concepts like position sizing, stop placement, and portfolio-level risk. If you regularly trade index futures or options and know how to manage a losing streak without escalating positions, the Proprupee framework will feel familiar.',
          'Beginner traders who are still developing their edge may find the combination of profit targets and hard risk limits challenging. It is advisable to practice with simulated tools and study the platform rules thoroughly before committing to a paid challenge.'
        ]
      }
    ]}
  />
);

export const FundingProgramPage: React.FC = () => (
  <SeoPageLayout
    title="Proprupee Funding Program | Profit Split, Account Sizes & Payout Terms"
    description="Explore Proprupee's funded account program: profit splits up to 90%, 15-day payout cycles, and eligibility requirements for traders who pass the evaluation."
    heading="Funding Program"
    intro="The Proprupee funding program rewards traders who demonstrate consistent risk-managed performance during evaluation. Funded traders trade with platform-provided capital, keep a share of their profits ranging from 80% to 90%, and receive payouts every 15 days — provided they continue complying with all trading rules after activation."
    sections={[
      {
        heading: 'Account sizes and challenge tiers',
        body: [
          'Proprupee offers multiple challenge tiers with varying hypothetical account sizes. Each tier determines both the profit target amount and the corresponding funded account balance upon successful evaluation completion. Account sizes range from smaller starter plans suitable for new traders to premium tiers designed for experienced participants seeking larger capital allocation.',
          'The relationship between challenge fee, account size, and profit target is linear: a larger account requires a proportionally larger absolute profit but the same percentage target. This means the percentage-based difficulty remains consistent regardless of tier selection.'
        ]
      },
      {
        heading: 'Profit split structure',
        body: [
          'Profit splits are the core incentive of the funding program. Depending on the selected challenge tier, eligible traders retain between 80% and 90% of the profits generated on their funded account. The highest tiers offer the 90% split, reflecting the platform\'s confidence in traders who have proven themselves capable of handling larger capital allocations responsibly.',
          'It is important to note that profit split percentages are subject to the platform\'s current terms and may change. All applicable rates are displayed in the dashboard at the time of challenge purchase and remain binding for that purchase.'
        ]
      },
      {
        heading: 'Payout terms and frequency',
        body: [
          'Funded traders receive payouts on a 15-day cycle, assuming they meet minimum profit thresholds and remain in compliance with all rules during the payout window. Withdrawals are processed to the original payment method used for the challenge purchase, supporting UPI, credit card, and net banking options accepted by the platform.',
          'If a funded trader violates any rule during the funded phase — such as exceeding the daily loss limit or operating outside permitted instruments — the account may be closed and subsequent payouts suspended until the situation is reviewed by the Proprupee support team.'
        ]
      }
    ]}
  />
);

export const FaqPage: React.FC = () => (
  <SeoPageLayout
    title="Proprupee FAQ | Prop Firm Questions for Indian Traders"
    description="Answered questions about Proprupee: evaluation process, profit splits, risk rules, funding eligibility, and challenges for traders in India."
    heading="Frequently Asked Questions"
    intro="Below are answers to the most common questions from traders exploring Proprupee. For further details, refer to the challenge terms displayed during checkout and the full risk disclosure published on the platform."
    sections={[
      {
        heading: 'What is Proprupee?',
        body: [
          'Proprupee is an Indian prop trading evaluation and funding platform. It allows skilled traders to demonstrate their ability to trade profitably within strict risk guidelines, and eligible participants gain access to funded accounts where they trade with platform capital and retain a majority share of their profits. The platform supports NIFTY, BANKNIFTY, FINNIFTY, and SENSEX index instruments and operates through a challenge-based selection model.'
        ]
      },
      {
        heading: 'What is a prop firm in India?',
        body: [
          'A prop firm (proprietary trading firm) in India is a company that provides capital to traders who pass a structured evaluation. Unlike traditional brokers where traders risk their own money, prop firms allow qualified individuals to trade with firm-provided funds in exchange for a profit share. In India, several prop firms serve the local market, offering evaluation models tailored to Indian traders who primarily trade index derivatives on the NSE. Proprupee is one such platform operating under this model.'
        ]
      },
      {
        heading: 'How does the Proprupee evaluation work?',
        body: [
          'The evaluation consists of a single phase where the trader must achieve a stated profit target — typically between 8% and 10% of the account size — while staying within two hard risk limits: the daily loss cap and the maximum drawdown. Both limits apply simultaneously, meaning a trader who hits the profit target on Day 1 but breaches the daily loss limit on Day 2 has failed the challenge. Success requires patience, discipline, and consistent execution across multiple days if necessary.'
        ]
      },
      {
        heading: 'How much does a challenge cost?',
        body: [
          'Challenge fees range from approximately ₹9,999 to ₹99,999 depending on the account tier selected. Higher-tier challenges provide larger hypothetical capital and correspondingly higher profit targets, but the percentage-based difficulty remains similar across tiers. Exact pricing and any current promotions are displayed on the Proprupee dashboard before purchase. Refund eligibility is limited to unused challenges requested within 7 calendar days of purchase, as outlined in the Refund & Cancellation Policy.'
        ]
      },
      {
        heading: 'What is the profit split?',
        body: [
          'The profit split depends on the challenge tier. Standard splits range from 80% to 90%, with higher tiers typically qualifying for the maximum 90% split. After evaluation success, the funded trader retains this percentage of all net profits generated, with the remainder distributed according to the platform\'s revenue model. Profit splits are confirmed at the time of challenge purchase and are governed by the terms displayed in your dashboard.'
        ]
      },
      {
        heading: 'What instruments can I trade?',
        body: [
          'During both evaluation and funded phases, the permitted instruments are the major Indian equity index derivatives listed on the National Stock Exchange (NSE): NIFTY 50, BANKNIFTY, FINNIFTY, and SENSEX. Trading is restricted to futures and options contracts on these indexes. Individual stock derivatives, commodity contracts, and currency pairs are not available on the platform.'
        ]
      },
      {
        heading: 'What are the risks of prop trading?',
        body: [
          'Prop trading involves several risks that every participant should understand. Market volatility can cause rapid adverse price movements. Leverage inherent in index options amplifies both gains and losses. Execution delays or platform issues may affect order fills. There is always the risk of challenge invalidation if any rule — daily loss limit, maximum drawdown, or permitted instrument restriction — is breached. Proprupee\'s full risk disclosure, available at /risk-disclaimer, covers these topics comprehensively and should be read before participating.'
        ]
      },
      {
        heading: 'How do I apply?',
        body: [
          'To begin, create an account on the Proprupee website, navigate to the challenge selection page, and choose the plan that matches your goals. After completing payment via UPI, credit card, or net banking, your evaluation account is activated immediately. You can then start trading through the platform\'s trading interface. Your progress, risk metrics, and remaining days are all tracked in real time on your dashboard.'
        ]
      }
    ]}
  />
);

export const RiskDisclaimerSeoPage: React.FC = () => {
  if (typeof window !== 'undefined') {
    window.location.href = '/risk-disclaimer';
  }
  return null;
};
