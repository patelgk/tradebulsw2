/**
 * SSR Page Metadata & Data
 *
 * Plain-data module — NO React imports, NO component logic.
 * Used by both the server-side renderer and the frontend for hydration safety.
 */

export interface SeoPageData {
  /** Internal slug used to identify the page */
  slug: string;
  /** Full URL path (with leading slash, no trailing slash) */
  path: string;
  /** Document <title> */
  title: string;
  /** Meta <meta name="description"> */
  description: string;
  /** Open Graph and Twitter card image URL */
  image: string;
  /** The main visible H1 heading shown on the page */
  heading: string;
  /** Intro paragraph shown below the H1 */
  intro: string;
  /** Body sections — rendered as <section><h2><p><ul></section> blocks */
  sections: Array<{
    heading: string;
    body: string[];
    bullets?: string[];
  }>;
}

const BASE_IMAGE = 'https://proprupee.com/proprupee-icon.svg';
const BASE_URL = 'https://proprupee.com';

export const SEO_PAGES: SeoPageData[] = [
  {
    slug: 'home',
    path: '/',
    title: 'Proprupee | Prop Firm & Trader Funding Platform in India',
    description: 'Proprupee evaluates traders based on their trading skills and strategy and provides eligible traders access to its funding program. Learn how Proprupee works and apply for trader evaluation.',
    image: BASE_IMAGE,
    heading: 'Indian Prop Firm for Traders',
    intro: 'Proprupee evaluates traders based on their trading skills and strategy and provides eligible traders access to its funding program.',
    sections: [],
  },
  {
    slug: 'what-is-proprupee',
    path: '/what-is-proprupee',
    title: 'What is Proprupee? | Prop Firm & Trader Funding Platform in India',
    description: 'Learn what Proprupee is, how its evaluation process works, and how eligible traders can access a funding program through the Proprupee platform.',
    image: BASE_IMAGE,
    heading: 'What is Proprupee?',
    intro: 'Proprupee is a trader funding and evaluation platform built for traders in India who want to trade under a structured challenge and funding model. The platform evaluates trading skill, strategy, and risk discipline before eligible traders are considered for its funding program.',
    sections: [
      {
        heading: 'A prop firm and trader funding platform',
        body: [
          'Proprupee is designed for traders who want to work with a structured funding model rather than trading only with personal capital. The platform reviews trading performance against set rules and provides eligible participants access to a funding program based on their evaluation results.',
          'The platform supports trader evaluation across major Indian market instruments, including NIFTY, BANKNIFTY, FINNIFTY, and SENSEX indexes.',
        ],
      },
      {
        heading: 'How the platform works',
        body: [
          'Traders start by selecting a challenge or funding plan, then trade under the platform\'s evaluation rules covering profit target, daily loss limit, and maximum drawdown.',
          'This structure identifies disciplined traders who can manage risk while maintaining consistent execution.',
        ],
      },
      {
        heading: 'Why traders search for Proprupee',
        body: [
          'Traders search for "prop firm India", "Indian prop firm", and "trading evaluation India" seeking transparent rules and a platform designed for active trading.',
          'Proprupee focuses on clear rules, measurable goals, and a pathway from evaluation to funded account access.',
        ],
      },
    ],
  },
  {
    slug: 'how-proprupee-works',
    path: '/how-proprupee-works',
    title: 'How Proprupee Works | Trader Evaluation & Funding Program',
    description: 'Learn how Proprupee works: choose a challenge, pass the evaluation, trade within risk rules, and access the funding program if eligible.',
    image: BASE_IMAGE,
    heading: 'How Proprupee Works',
    intro: 'Proprupee is built around a straightforward path: traders review the program, complete the evaluation, and trade within the rules to earn access to a funded account if they qualify.',
    sections: [
      {
        heading: 'Step 1: Select a challenge',
        body: ['Traders choose a challenge or funding plan matching their trading style and capital goals. Plans vary by account size and attached rules including target levels and risk limits.'],
      },
      {
        heading: 'Step 2: Trade under evaluation rules',
        body: ['The evaluation period measures trading performance against profit targets and risk controls such as daily loss limits and maximum drawdown thresholds.'],
        bullets: [
          'The goal is to measure consistency and disciplined execution.',
          'The platform monitors whether the trader stays within the selected challenge rules.',
          'This helps separate strong risk management from impulsive trading.',
        ],
      },
      {
        heading: 'Step 3: Become eligible for funding',
        body: ['If the trader meets the conditions and remains compliant with the rules, they may become eligible for the Proprupee funding program.'],
      },
    ],
  },
  {
    slug: 'trader-evaluation',
    path: '/trader-evaluation',
    title: 'Trader Evaluation at Proprupee | Prop Trading India',
    description: 'Understand Proprupee\'s trader evaluation process, challenge requirements, and risk management rules designed for Indian traders.',
    image: BASE_IMAGE,
    heading: 'Trader Evaluation',
    intro: 'The Proprupee evaluation is designed to test a trader\'s skill, consistency, and risk management under a defined set of trading rules.',
    sections: [
      {
        heading: 'What the evaluation measures',
        body: ['Proprupee\'s evaluation looks at whether a trader can generate performance while respecting risk limits — not simply chasing short-term gains.'],
      },
      {
        heading: 'Risk controls during evaluation',
        body: ['Each challenge includes daily loss limits and maximum drawdown limits to require disciplined decision-making.'],
        bullets: [
          'Daily loss limits are a core part of the evaluation process.',
          'Maximum drawdown defines how much loss is allowed before challenge rules are breached.',
          'Funding is only considered after the trader remains within the policy framework.',
        ],
      },
      {
        heading: 'Who the evaluation suits',
        body: ['Designed for traders who understand market structure, risk management, and position sizing.'],
      },
    ],
  },
  {
    slug: 'funding-program',
    path: '/funding-program',
    title: 'Funding Program | Proprupee Trader Funding in India',
    description: 'Explore Proprupee\'s funding program, possible account sizes, profit splits, and the evaluation pathway for eligible traders in India.',
    image: BASE_IMAGE,
    heading: 'Funding Program',
    intro: 'The Proprupee funding program provides eligible traders with access to capital under a structured challenge model.',
    sections: [
      {
        heading: 'Funding sizes and challenge plans',
        body: ['Proprupee offers challenge plans with different funding amounts for traders to choose based on their preference and trading style.'],
      },
      {
        heading: 'Profit split and payouts',
        body: ['Profit splits may reach up to 80%, 85%, or 90% depending on the selected challenge. Payout terms follow the platform\'s payout policy.'],
      },
      {
        heading: 'How funding is considered',
        body: ['A trader must complete the evaluation, comply with rules, and meet eligibility conditions. Funding is a performance-based pathway, not a guaranteed outcome.'],
      },
    ],
  },
  {
    slug: 'faq',
    path: '/faq',
    title: 'Proprupee FAQ | Prop Firm Questions for Traders in India',
    description: 'Read Proprupee Frequently Asked Questions on trader evaluation, funding, risk rules, and how to apply for a funded trading challenge.',
    image: BASE_IMAGE,
    heading: 'Frequently Asked Questions',
    intro: 'Common questions traders ask about Proprupee, the evaluation process, and the funding program.',
    sections: [
      { heading: 'What is Proprupee?', body: ['Proprupee is a trader funding and evaluation platform for traders in India.'] },
      { heading: 'What is a prop firm in India?', body: ['A prop firm allows traders to access capital through a structured evaluation process.'] },
      { heading: 'How does the evaluation work?', body: ['The evaluation measures performance against a profit target while requiring traders to follow risk rules.'] },
      { heading: 'Who can apply?', body: ['Traders comfortable managing risk and following structured rules.'] },
      { heading: 'How does the funding program work?', body: ['Available to eligible traders who pass the evaluation and meet challenge requirements.'] },
      { heading: 'What are the trading rules?', body: ['Core framework includes profit targets, daily loss limits, and maximum drawdown limits.'] },
      { heading: 'What are the risks?', body: ['Prop trading carries market volatility, leverage, and rule-violation risks.'] },
      { heading: 'How can I apply?', body: ['Apply through the challenge or funding form on the Proprupee website.'] },
    ],
  },
  {
    slug: 'terms',
    path: '/terms',
    title: 'Terms & Conditions | Proprupee',
    description: 'Read Proprupee\'s Terms & Conditions covering evaluation programs, trading rules, fees, payouts, and legal information.',
    image: BASE_IMAGE,
    heading: 'Terms & Conditions',
    intro: 'Please read these Terms and Conditions carefully before using the Proprupee platform.',
    sections: [
      { heading: 'Introduction', body: ['These terms govern your use of the Proprupee platform and services.'] },
      { heading: 'Eligibility', body: ['Users must be of legal age and comply with applicable laws.'] },
      { heading: 'Evaluation Programs', body: ['Challenges have specific rules regarding profit targets, drawdown, and trading conduct.'] },
      { heading: 'Fees & Payments', body: ['Challenge fees are non-refundable except where explicitly stated.'] },
      { heading: 'No Guarantee', body: ['Funding is not guaranteed and depends on meeting evaluation criteria.'] },
      { heading: 'Limitation of Liability', body: ['Proprupee is not liable for trading losses or market fluctuations.'] },
      { heading: 'Contact', body: ['For questions email support@proprupee.com.'] },
    ],
  },
  {
    slug: 'risk-disclaimer',
    path: '/risk-disclaimer',
    title: 'Risk Disclosure | Proprupee',
    description: 'Read Proprupee\'s Risk Disclosure explaining trading, market, technical, evaluation, payout and other risks associated with our platform.',
    image: BASE_IMAGE,
    heading: 'Risk Disclosure',
    intro: 'Trading involves substantial risk of loss. Please review the full risk disclosure below.',
    sections: [
      { heading: 'Important Notice', body: ['Trading forex and CFDs carries a high level of risk.'] },
      { heading: 'No Guarantee of Profits', body: ['Past performance is not indicative of future results.'] },
      { heading: 'Market Risk', body: ['Prices can move rapidly against your positions.'] },
      { heading: 'Leverage Risk', body: ['Leverage amplifies both gains and losses.'] },
      { heading: 'Evaluation Risk', body: ['Challenge rules must be followed to remain eligible.'] },
      { heading: 'Technical Risks', body: ['Platform outages or delays may affect trading decisions.'] },
      { heading: 'Regulatory Risk', body: ['Regulations may change and affect your participation.'] },
      { heading: 'Acknowledgement', body: ['By using Proprupee you acknowledge these risks.'] },
    ],
  },
];

/** Look up page metadata by URL path. Returns null for unknown paths. */
export function getPageMetadata(pathname: string) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return SEO_PAGES.find((p) => p.path === clean) ?? null;
}

/** All known SEO-safe paths */
export const SEO_ROUTES = new Set(SEO_PAGES.map((p) => p.path));

/** Whether a given path should be served as a prerendered SEO page */
export function isSeoRoute(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return SEO_ROUTES.has(clean);
}
