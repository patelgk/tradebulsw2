import React, { useEffect } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, ChevronRight, FileCheck2, Gauge, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

const pageLinks = [
  { label: 'What is Proprupee?', href: '/what-is-proprupee' },
  { label: 'How Proprupee Works', href: '/how-proprupee-works' },
  { label: 'Trader Evaluation', href: '/trader-evaluation' },
  { label: 'Funding Program', href: '/funding-program' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Risk Disclaimer', href: '/risk-disclaimer' },
];

const setSeoTags = (title: string, description: string, canonical: string) => {
  if (typeof document === 'undefined') return;

  document.title = title;

  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta');
    descriptionTag.setAttribute('name', 'description');
    document.head.appendChild(descriptionTag);
  }
  descriptionTag.setAttribute('content', description);

  let robotsTag = document.querySelector('meta[name="robots"]');
  if (!robotsTag) {
    robotsTag = document.createElement('meta');
    robotsTag.setAttribute('name', 'robots');
    document.head.appendChild(robotsTag);
  }
  robotsTag.setAttribute('content', 'index, follow');

  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonical);
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
    setSeoTags(title, description, `https://proprupee.com${window.location.pathname}`);
  }, [title, description]);

  return (
    <div className="min-h-screen bg-[#050812] text-white">
      <header className="border-b border-white/10 bg-[#050812]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <a href="/" className="text-sm font-black uppercase tracking-[0.24em] text-white">Proprupee</a>
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
    description="Learn what Proprupee is, how its evaluation process works, and how eligible traders can access a funding program through the Proprupee platform."
    heading="What is Proprupee?"
    intro="Proprupee is a trader funding and evaluation platform built for traders in India who want to trade under a structured challenge and funding model. The platform evaluates trading skill, strategy, and risk discipline before eligible traders are considered for its funding program."
    sections={[
      {
        heading: 'A prop firm and trader funding platform',
        body: [
          'Proprupee is designed for traders who want to work with a structured funding model rather than trading only with personal capital. The platform reviews trading performance against set rules and provides eligible participants access to a funding program based on their evaluation results.',
          'The platform supports trader evaluation across major Indian market instruments, including NIFTY, BANKNIFTY, FINNIFTY, and SENSEX indexes. These are the markets most commonly used in the platform experience and challenge setup.'
        ]
      },
      {
        heading: 'How the platform works',
        body: [
          'Traders start by selecting a challenge or funding plan, then trade under the platform’s evaluation rules. These rules cover metrics such as profit target, daily loss limit, and maximum drawdown so the platform can assess performance and risk control before funding is considered.',
          'This structure is designed to identify disciplined traders who can manage risk while maintaining consistent execution throughout the evaluation period.'
        ]
      },
      {
        heading: 'Why traders search for Proprupee',
        body: [
          'Traders often search for terms such as “prop firm India”, “Indian prop firm”, and “trading evaluation India” because they want a clear funding model with transparent rules and a platform designed for active trading.',
          'Proprupee focuses on clear rules, measurable performance goals, and a pathway from evaluation to funded account access for eligible traders.'
        ]
      }
    ]}
  />
);

export const HowProprupeeWorksPage: React.FC = () => (
  <SeoPageLayout
    title="How Proprupee Works | Trader Evaluation & Funding Program"
    description="Learn how Proprupee works: choose a challenge, pass the evaluation, trade within risk rules, and access the funding program if eligible."
    heading="How Proprupee Works"
    intro="Proprupee is built around a straightforward path: traders review the program, complete the evaluation, and trade within the rules to earn access to a funded account if they qualify."
    sections={[
      {
        heading: 'Step 1: Select a challenge',
        body: [
          'Traders choose a challenge or funding plan that fits their trading style and capital goals. Plans vary by account size and the rules attached to each challenge, including target levels and risk limits.'
        ]
      },
      {
        heading: 'Step 2: Trade under evaluation rules',
        body: [
          'The evaluation period measures how a trader performs under the platform rules. Trading is evaluated using profit targets and risk controls such as daily loss limits and maximum drawdown thresholds.'
        ],
        bullets: [
          'The goal is to measure consistency and disciplined execution.',
          'The platform monitors whether the trader stays within the selected challenge rules.',
          'This helps separate strong risk management from impulsive trading.'
        ]
      },
      {
        heading: 'Step 3: Become eligible for funding',
        body: [
          'If the trader meets the conditions of the evaluation and remains compliant with the rules, they may become eligible for the Proprupee funding program. Funding availability depends on the selected plan and the platform’s policies.'
        ]
      }
    ]}
  />
);

export const TraderEvaluationPage: React.FC = () => (
  <SeoPageLayout
    title="Trader Evaluation at Proprupee | Prop Trading India"
    description="Understand Proprupee's trader evaluation process, challenge requirements, and risk management rules designed for Indian traders."
    heading="Trader Evaluation"
    intro="The Proprupee evaluation is designed to test a trader’s skill, consistency, and risk management under a defined set of trading rules."
    sections={[
      {
        heading: 'What the evaluation measures',
        body: [
          'Proprupee’s evaluation process looks at whether a trader can generate performance while respecting risk limits. It is not simply about taking large positions or chasing short-term gains. The platform reviews whether a trader can stay within the profit target without overshooting the challenge’s risk thresholds.'
        ]
      },
      {
        heading: 'Risk controls during evaluation',
        body: [
          'Each challenge includes risk-management rules such as daily loss limits and maximum drawdown limits. These rules help protect both the trader and the funding structure by requiring disciplined decision-making during evaluation.'
        ],
        bullets: [
          'Daily loss limits are a core part of the evaluation process.',
          'Maximum drawdown helps define how much loss is allowed before the challenge rules are breached.',
          'Funding is only considered after the trader remains within the policy framework.'
        ]
      },
      {
        heading: 'Who the evaluation suits',
        body: [
          'The evaluation is designed for traders who understand market structure, risk management, and position sizing. Traders who can operate consistently and avoid unnecessary risk are more likely to complete the evaluation in line with Proprupee’s rules.'
        ]
      }
    ]}
  />
);

export const FundingProgramPage: React.FC = () => (
  <SeoPageLayout
    title="Funding Program | Proprupee Trader Funding in India"
    description="Explore Proprupee's funding program, possible account sizes, profit splits, and the evaluation pathway for eligible traders in India."
    heading="Funding Program"
    intro="The Proprupee funding program provides eligible traders with access to capital under a structured challenge model. Account sizes and profit splits depend on the selected challenge and the platform’s current policy."
    sections={[
      {
        heading: 'Funding sizes and challenge plans',
        body: [
          'Proprupee offers challenge plans with different funding amounts, allowing traders to choose a structure that matches their account size preference and trading style. These plans are shown on the platform before purchase or application and vary based on current availability and program rules.'
        ]
      },
      {
        heading: 'Profit split and payouts',
        body: [
          'Profit splits are part of the funded account structure and may vary by challenge. In the current platform setup, the profit split can reach up to 80%, 85%, or 90% depending on the selected challenge. Payout timing and eligibility are governed by the platform’s payout policy and challenge terms.'
        ]
      },
      {
        heading: 'How funding is considered',
        body: [
          'A trader does not receive funding simply by entering the platform. They must complete the relevant evaluation, comply with trading rules, and meet the conditions for funding eligibility. The funding program is a performance-based pathway and not a guaranteed outcome.'
        ]
      }
    ]}
  />
);

export const FaqPage: React.FC = () => (
  <SeoPageLayout
    title="Proprupee FAQ | Prop Firm Questions for Traders in India"
    description="Read Proprupee Frequently Asked Questions on trader evaluation, funding, risk rules, and how to apply for a funded trading challenge."
    heading="Frequently Asked Questions"
    intro="Here are the most common questions traders ask about Proprupee, the evaluation process, and the funding program. All answers are based on the platform’s current evaluation and risk framework."
    sections={[
      {
        heading: 'What is Proprupee?',
        body: [
          'Proprupee is a trader funding and evaluation platform for traders in India. It evaluates traders based on their skill, strategy, and risk management, and provides eligible traders access to a funding program when they meet the program conditions.'
        ]
      },
      {
        heading: 'What is a prop firm in India?',
        body: [
          'A prop firm in India is a platform or firm that allows traders to access capital through a structured evaluation process. Traders are assessed on performance and risk compliance, and eligible participants may receive access to a funded account under program rules.'
        ]
      },
      {
        heading: 'How does Proprupee’s trader evaluation work?',
        body: [
          'The evaluation measures performance against a profit target while requiring traders to follow risk rules. Daily loss limits and maximum drawdown are part of the process, and traders must remain within those rules to remain eligible for funding consideration.'
        ]
      },
      {
        heading: 'Who can apply for Proprupee?',
        body: [
          'Proprupee is intended for traders who are comfortable managing risk and following structured rules. Traders should apply through the existing challenge or application flow and ensure they understand the platform’s evaluation and funding policies before participating.'
        ]
      },
      {
        heading: 'How does the Proprupee funding program work?',
        body: [
          'The funding program is available to eligible traders who pass the evaluation and meet the challenge requirements. Funding size, profit split, and payout terms vary by challenge and are shown during the selection process.'
        ]
      },
      {
        heading: 'What are the trading rules?',
        body: [
          'Trading rules vary by challenge, but the core framework includes profit targets, daily loss limits, and maximum drawdown limits. These rules are designed to measure consistency and encourage disciplined trading rather than excessive risk-taking.'
        ]
      },
      {
        heading: 'What are the risks of prop trading?',
        body: [
          'Prop trading carries several risks, including market volatility, leverage, exposure to losses, execution delays, and invalidation if a trader breaches the challenge rules. Proprupee’s risk disclosure explains these risks in detail and traders should review it before applying.'
        ]
      },
      {
        heading: 'How can I apply for Proprupee?',
        body: [
          'You can apply through the challenge or funding form available on the Proprupee website. After selecting a challenge, you follow the platform’s evaluation process and review the associated rules before starting to trade.'
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
