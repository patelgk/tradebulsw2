import React from 'react';
import { renderToString } from 'react-dom/server';

// ---------------------------------------------------------------------------
// SSR-safe page components
// These intentionally omit useEffect, window checks, animations and any
// browser-only APIs so they render to a clean static HTML string on the
// server.
// ---------------------------------------------------------------------------

export const renderHomePage = (): string => {
  // Landing page renders only top-level marketing content; no auth/state.
  return '<div id="app-root"><div class="min-h-screen bg-white dark:bg-[#050505]"></div></div>';
};

export interface SeoPageData {
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

const SECTIONS: Record<string, SeoPageData> = {
  'what-is-proprupee': {
    title: 'What is Proprupee? | Prop Firm & Trader Funding Platform in India',
    description: 'Learn what Proprupee is, how its evaluation process works, and how eligible traders can access a funding program through the Proprupee platform.',
    heading: 'What is Proprupee?',
    intro: 'Proprupee is a trader funding and evaluation platform built for traders in India who want to trade under a structured challenge and funding model. The platform evaluates trading skill, strategy, and risk discipline before eligible traders are considered for its funding program.',
    sections: [
      {
        heading: 'A prop firm and trader funding platform',
        body: [
          'Proprupee is designed for traders who want to work with a structured funding model rather than trading only with personal capital. The platform reviews trading performance against set rules and provides eligible participants access to a funding program based on their evaluation results.',
          'The platform supports trader evaluation across major Indian market instruments, including NIFTY, BANKNIFTY, FINNIFTY, and SENSEX indexes. These are the markets most commonly used in the platform experience and challenge setup.',
        ],
      },
      {
        heading: 'How the platform works',
        body: [
          'Traders start by selecting a challenge or funding plan, then trade under the platform\'s evaluation rules. These rules cover metrics such as profit target, daily loss limit, and maximum drawdown so the platform can assess performance and risk control before funding is considered.',
          'This structure is designed to identify disciplined traders who can manage risk while maintaining consistent execution throughout the evaluation period.',
        ],
      },
      {
        heading: 'Why traders search for Proprupee',
        body: [
          'Traders often search for terms such as "prop firm India", "Indian prop firm", and "trading evaluation India" because they want a clear funding model with transparent rules and a platform designed for active trading.',
          'Proprupee focuses on clear rules, measurable performance goals, and a pathway from evaluation to funded account access for eligible traders.',
        ],
      },
    ],
  },
  'how-proprupee-works': {
    title: 'How Proprupee Works | Trader Evaluation & Funding Program',
    description: 'Learn how Proprupee works: choose a challenge, pass the evaluation, trade within risk rules, and access the funding program if eligible.',
    heading: 'How Proprupee Works',
    intro: 'Proprupee is built around a straightforward path: traders review the program, complete the evaluation, and trade within the rules to earn access to a funded account if they qualify.',
    sections: [
      {
        heading: 'Step 1: Select a challenge',
        body: ['Traders choose a challenge or funding plan that fits their trading style and capital goals. Plans vary by account size and the rules attached to each challenge, including target levels and risk limits.'],
      },
      {
        heading: 'Step 2: Trade under evaluation rules',
        body: [
          'The evaluation period measures how a trader performs under the platform rules. Trading is evaluated using profit targets and risk controls such as daily loss limits and maximum drawdown thresholds.',
        ],
        bullets: [
          'The goal is to measure consistency and disciplined execution.',
          'The platform monitors whether the trader stays within the selected challenge rules.',
          'This helps separate strong risk management from impulsive trading.',
        ],
      },
      {
        heading: 'Step 3: Become eligible for funding',
        body: ['If the trader meets the conditions of the evaluation and remains compliant with the rules, they may become eligible for the Proprupee funding program. Funding availability depends on the selected plan and the platform\'s policies.'],
      },
    ],
  },
  'trader-evaluation': {
    title: 'Trader Evaluation at Proprupee | Prop Trading India',
    description: 'Understand Proprupee\'s trader evaluation process, challenge requirements, and risk management rules designed for Indian traders.',
    heading: 'Trader Evaluation',
    intro: 'The Proprupee evaluation is designed to test a trader\'s skill, consistency, and risk management under a defined set of trading rules.',
    sections: [
      {
        heading: 'What the evaluation measures',
        body: ['Proprupee\'s evaluation process looks at whether a trader can generate performance while respecting risk limits. It is not simply about taking large positions or chasing short-term gains. The platform reviews whether a trader can stay within the profit target without overshooting the challenge\'s risk thresholds.'],
      },
      {
        heading: 'Risk controls during evaluation',
        body: ['Each challenge includes risk-management rules such as daily loss limits and maximum drawdown limits. These rules help protect both the trader and the funding structure by requiring disciplined decision-making during evaluation.'],
        bullets: [
          'Daily loss limits are a core part of the evaluation process.',
          'Maximum drawdown helps define how much loss is allowed before the challenge rules are breached.',
          'Funding is only considered after the trader remains within the policy framework.',
        ],
      },
      {
        heading: 'Who the evaluation suits',
        body: ['The evaluation is designed for traders who understand market structure, risk management, and position sizing. Traders who can operate consistently and avoid unnecessary risk are more likely to complete the evaluation in line with Proprupee\'s rules.'],
      },
    ],
  },
  'funding-program': {
    title: 'Funding Program | Proprupee Trader Funding in India',
    description: 'Explore Proprupee\'s funding program, possible account sizes, profit splits, and the evaluation pathway for eligible traders in India.',
    heading: 'Funding Program',
    intro: 'The Proprupee funding program provides eligible traders with access to capital under a structured challenge model. Account sizes and profit splits depend on the selected challenge and the platform\'s current policy.',
    sections: [
      {
        heading: 'Funding sizes and challenge plans',
        body: ['Proprupee offers challenge plans with different funding amounts, allowing traders to choose a structure that matches their account size preference and trading style. These plans are shown on the platform before purchase or application and vary based on current availability and program rules.'],
      },
      {
        heading: 'Profit split and payouts',
        body: ['Profit splits are part of the funded account structure and may vary by challenge. In the current platform setup, the profit split can reach up to 80%, 85%, or 90% depending on the selected challenge. Payout timing and eligibility are governed by the platform\'s payout policy and challenge terms.'],
      },
      {
        heading: 'How funding is considered',
        body: ['A trader does not receive funding simply by entering the platform. They must complete the relevant evaluation, comply with trading rules, and meet the conditions for funding eligibility. The funding program is a performance-based pathway and not a guaranteed outcome.'],
      },
    ],
  },
  'faq': {
    title: 'Proprupee FAQ | Prop Firm Questions for Traders in India',
    description: 'Read Proprupee Frequently Asked Questions on trader evaluation, funding, risk rules, and how to apply for a funded trading challenge.',
    heading: 'Frequently Asked Questions',
    intro: 'Here are the most common questions traders ask about Proprupee, the evaluation process, and the funding program. All answers are based on the platform\'s current evaluation and risk framework.',
    sections: [
      {
        heading: 'What is Proprupee?',
        body: ['Proprupee is a trader funding and evaluation platform for traders in India. It evaluates traders based on their skill, strategy, and risk management, and provides eligible traders access to a funding program when they meet the program conditions.'],
      },
      {
        heading: 'What is a prop firm in India?',
        body: ['A prop firm in India is a platform or firm that allows traders to access capital through a structured evaluation process. Traders are assessed on performance and risk compliance, and eligible participants may receive access to a funded account under program rules.'],
      },
      {
        heading: 'How does Proprupee\'s trader evaluation work?',
        body: ['The evaluation measures performance against a profit target while requiring traders to follow risk rules. Daily loss limits and maximum drawdown are part of the process, and traders must remain within those rules to remain eligible for funding consideration.'],
      },
      {
        heading: 'Who can apply for Proprupee?',
        body: ['Proprupee is intended for traders who are comfortable managing risk and following structured rules. Traders should apply through the existing challenge or application flow and ensure they understand the platform\'s evaluation and funding policies before participating.'],
      },
      {
        heading: 'How does the Proprupee funding program work?',
        body: ['The funding program is available to eligible traders who pass the evaluation and meet the challenge requirements. Funding size, profit split, and payout terms vary by challenge and are shown during the selection process.'],
      },
      {
        heading: 'What are the trading rules?',
        body: ['Trading rules vary by challenge, but the core framework includes profit targets, daily loss limits, and maximum drawdown limits. These rules are designed to measure consistency and encourage disciplined trading rather than excessive risk-taking.'],
      },
      {
        heading: 'What are the risks of prop trading?',
        body: ['Prop trading carries several risks, including market volatility, leverage, exposure to losses, execution delays, and invalidation if a trader breaches the challenge rules. Proprupee\'s risk disclosure explains these risks in detail and traders should review it before applying.'],
      },
      {
        heading: 'How can I apply for Proprupee?',
        body: ['You can apply through the challenge or funding form available on the Proprupee website. After selecting a challenge, you follow the platform\'s evaluation process and review the associated rules before starting to trade.'],
      },
    ],
  },
};

/** Render an SEO info page to a plain HTML <main> element. */
export const renderSeoInfoPage = (slug: string): string => {
  const data = SECTIONS[slug];
  if (!data) return '';

  const sectionsHtml = data.sections
    .map(
      (section) => `
      <section class="mb-12">
        <h2 class="text-2xl font-bold mb-4">${escapeHtml(section.heading)}</h2>
        ${section.body.map((p) => `<p class="text-gray-700 dark:text-gray-300 mb-3">${escapeHtml(p)}</p>`).join('')}
        ${
          section.bullets
            ? `<ul class="list-disc list-inside text-gray-700 dark:text-gray-300">${section.bullets
                .map((b) => `<li>${escapeHtml(b)}</li>`)
                .join('')}</ul>`
            : ''
        }
      </section>`,
    )
    .join('\n');

  return `
<main class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-4xl font-bold mb-6">${escapeHtml(data.heading)}</h1>
  <p class="text-lg text-gray-600 dark:text-gray-400 mb-10">${escapeHtml(data.intro)}</p>
  ${sectionsHtml}
</main>`;
};

export const renderTermsPage = (): string => {
  return `
<main class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-3xl font-bold mb-8">Terms & Conditions</h1>
  <p class="text-gray-700 dark:text-gray-300">Please read these Terms and Conditions carefully before using the Proprupee platform.</p>
</main>`;
};

export const renderRiskDisclosurePage = (): string => {
  return `
<main class="max-w-4xl mx-auto px-4 py-12">
  <h1 class="text-3xl font-bold mb-8">Risk Disclosure</h1>
  <p class="text-gray-700 dark:text-gray-300">Trading involves substantial risk of loss. Please review our full Risk Disclosure for details.</p>
</main>`;
};

/** Escape HTML special characters to prevent XSS in SSR output. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Return the canonical URL for a given page path. */
export function getCanonicalUrl(pathname: string): string {
  const base = 'https://proprupee.com';
  const clean = pathname.replace(/\/+$/, '') || '/';
  return `${base}${clean === '/' ? '' : clean}`;
}

/** Return meta data for a given page path. Returns null if not an SEO route. */
export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  image: string;
}

export const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Proprupee | Prop Firm & Trader Funding Platform in India',
    description: 'Proprupee evaluates traders based on their trading skills and strategy and provides eligible traders access to its funding program. Learn how Proprupee works and apply for trader evaluation.',
    canonical: 'https://proprupee.com/',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
  '/what-is-proprupee': {
    title: 'What is Proprupee? | Prop Firm & Trader Funding Platform in India',
    description: 'Learn what Proprupee is, how its evaluation process works, and how eligible traders can access a funding program through the Proprupee platform.',
    canonical: 'https://proprupee.com/what-is-proprupee',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
  '/how-proprupee-works': {
    title: 'How Proprupee Works | Trader Evaluation & Funding Program',
    description: 'Learn how Proprupee works: choose a challenge, pass the evaluation, trade within risk rules, and access the funding program if eligible.',
    canonical: 'https://proprupee.com/how-proprupee-works',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
  '/trader-evaluation': {
    title: 'Trader Evaluation at Proprupee | Prop Trading India',
    description: 'Understand Proprupee\'s trader evaluation process, challenge requirements, and risk management rules designed for Indian traders.',
    canonical: 'https://proprupee.com/trader-evaluation',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
  '/funding-program': {
    title: 'Funding Program | Proprupee Trader Funding in India',
    description: 'Explore Proprupee\'s funding program, possible account sizes, profit splits, and the evaluation pathway for eligible traders in India.',
    canonical: 'https://proprupee.com/funding-program',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
  '/faq': {
    title: 'Proprupee FAQ | Prop Firm Questions for Traders in India',
    description: 'Read Proprupee Frequently Asked Questions on trader evaluation, funding, risk rules, and how to apply for a funded trading challenge.',
    canonical: 'https://proprupee.com/faq',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
  '/terms': {
    title: 'Terms & Conditions | Proprupee',
    description: 'Read Proprupee\'s Terms & Conditions. Learn about evaluation programs, trading rules, fees, payouts, and legal information.',
    canonical: 'https://proprupee.com/terms',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
  '/risk-disclaimer': {
    title: 'Risk Disclosure | Proprupee',
    description: 'Read Proprupee\'s Risk Disclosure explaining trading, market, technical, evaluation, payout and other risks associated with using our platform and trading-related programs.',
    canonical: 'https://proprupee.com/risk-disclaimer',
    image: 'https://proprupee.com/proprupee-icon.svg',
  },
};

export function getPageMeta(pathname: string): PageMeta | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PAGE_META[clean] ?? null;
}
