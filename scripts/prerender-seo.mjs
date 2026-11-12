/**
 * Post-build prerender script for Proprupee SEO pages.
 *
 * After `vite build`, reads dist/index.html as a template and generates
 * one static HTML file per public SEO route — each with its own:
 *   - <title>
 *   - <meta name="description">
 *   - <link rel="canonical">
 *   - Open Graph tags (og:title, og:description, og:url, og:image)
 *   - Twitter Card tags (twitter:title, twitter:description, twitter:image)
 *   - Page-specific JSON-LD structured data
 *
 * All files share the same JS/CSS bundle references from the Vite build,
 * so client-side hydration works identically for every route.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

// ---------------------------------------------------------------------------
// Page metadata — single source of truth
// ---------------------------------------------------------------------------
interface PageMeta {
  /** URL path relative to root (e.g. "/faq") */
  path: string;
  /** Document title shown in browser tab & SERP */
  title: string;
  /** Meta description for search engines */
  description: string;
  /** OG / Twitter image */
  image: string;
  /** Schema.org @type value */
  schemaType: 'WebPage' | 'FAQPage' | 'AboutPage' | 'TermsOfAddress';
}

const BASE_URL = 'https://proprupee.com';
const IMAGE_URL = `${BASE_URL}/proprupee-icon.svg`;

const PAGES: PageMeta[] = [
  {
    path: '/',
    title: 'Proprupee | Prop Firm & Trader Funding Platform in India',
    description: 'Proprupee evaluates traders based on their trading skills and strategy and provides eligible traders access to its funding program. Learn how Proprupee works and apply for trader evaluation.',
    image: IMAGE_URL,
    schemaType: 'WebPage',
  },
  {
    path: '/what-is-proprupee',
    title: 'What is Proprupee? | Prop Firm & Trader Funding Platform in India',
    description: 'Learn what Proprupee is, how its evaluation process works, and how eligible traders can access a funding program through the Proprupee platform.',
    image: IMAGE_URL,
    schemaType: 'AboutPage',
  },
  {
    path: '/how-proprupee-works',
    title: 'How Proprupee Works | Trader Evaluation & Funding Program',
    description: 'Learn how Proprupee works: choose a challenge, pass the evaluation, trade within risk rules, and access the funding program if eligible.',
    image: IMAGE_URL,
    schemaType: 'WebPage',
  },
  {
    path: '/trader-evaluation',
    title: 'Trader Evaluation at Proprupee | Prop Trading India',
    description: 'Understand Proprupee\'s trader evaluation process, challenge requirements, and risk management rules designed for Indian traders.',
    image: IMAGE_URL,
    schemaType: 'WebPage',
  },
  {
    path: '/funding-program',
    title: 'Funding Program | Proprupee Trader Funding in India',
    description: 'Explore Proprupee\'s funding program, possible account sizes, profit splits, and the evaluation pathway for eligible traders in India.',
    image: IMAGE_URL,
    schemaType: 'WebPage',
  },
  {
    path: '/faq',
    title: 'Proprupee FAQ | Prop Firm Questions for Traders in India',
    description: 'Read Proprupee Frequently Asked Questions on trader evaluation, funding, risk rules, and how to apply for a funded trading challenge.',
    image: IMAGE_URL,
    schemaType: 'FAQPage',
  },
  {
    path: '/terms',
    title: 'Terms & Conditions | Proprupee',
    description: 'Read Proprupee\'s Terms & Conditions. Learn about evaluation programs, trading rules, fees, payouts, and legal information.',
    image: IMAGE_URL,
    schemaType: 'WebPage',
  },
  {
    path: '/risk-disclaimer',
    title: 'Risk Disclosure | Proprupee',
    description: 'Read Proprupee\'s Risk Disclosure explaining trading, market, technical, evaluation, payout and other risks associated with using our platform and trading-related programs.',
    image: IMAGE_URL,
    schemaType: 'WebPage',
  },
];

// ---------------------------------------------------------------------------
// HTML generators
// ---------------------------------------------------------------------------
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceInTemplate(html: string, replacements: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(replacements)) {
    // Replace only the FIRST occurrence of each placeholder pattern
    const placeholder = `<!--SEO:${key}-->`;
    result = result.replace(placeholder, value);
  }
  return result;
}

/** Inject a page-specific JSON-LD block into the HTML. */
function injectJsonLd(html: string, page: PageMeta): string {
  const typeLabel = page.schemaType === 'FAQPage' ? 'FAQPage' : 'WebPage';
  const jsonLd = `{
    "@context": "https://schema.org",
    "@type": "${typeLabel}",
    "name": "${escapeXml(page.title)}",
    "url": "${page.path === '/' ? BASE_URL : `${BASE_URL}${page.path}`}",
    "description": "${escapeXml(page.description)}",
    "image": "${page.image}",
    "publisher": {
      "@type": "Organization",
      "name": "Proprupee",
      "url": "${BASE_URL}"
    }
  }`;
  // Insert after the existing JSON-LD blocks (before Google tag)
  const insertionPoint = html.indexOf('<!-- Google tag -->');
  if (insertionPoint !== -1) {
    return html.slice(0, insertionPoint) + `<script type="application/ld+json">\n${jsonLd}\n</script>\n` + html.slice(insertionPoint);
  }
  // Fallback: insert before closing </head>
  return html.replace('</head>', `  <script type="application/ld+json">\n${jsonLd}\n</script>\n</head>`);
}

// ---------------------------------------------------------------------------
// Template placeholders used in index.html
// These are replaced during build to produce per-page HTML.
// ---------------------------------------------------------------------------
function createReplacements(page: PageMeta): Record<string, string> {
  const url = page.path === '/' ? BASE_URL : `${BASE_URL}${page.path}`;
  return {
    'SEO:TITLE': `<title>${escapeXml(page.title)}</title>\n`,
    'SEO:DESC': `<meta name="description" content="${escapeXml(page.description)}" />\n`,
    'SEO:CANONICAL': `<link rel="canonical" href="${url}" />\n`,
    'SEO:OG-TITLE': `<meta property="og:title" content="${escapeXml(page.title)}" />\n`,
    'SEO:OG-DESC': `<meta property="og:description" content="${escapeXml(page.description)}" />\n`,
    'SEO:OG-URL': `<meta property="og:url" content="${url}" />\n`,
    'SEO:OG-IMAGE': `<meta property="og:image" content="${page.image}" />\n`,
    'SEO:TWITTER-TITLE': `<meta name="twitter:title" content="${escapeXml(page.title)}" />\n`,
    'SEO:TWITTER-DESC': `<meta name="twitter:description" content="${escapeXml(page.description)}" />\n`,
    'SEO:TWITTER-IMAGE': `<meta name="twitter:image" content="${page.image}" />\n`,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main(): void {
  const templateUrl = path.join(DIST_DIR, 'index.html');

  if (!fs.existsSync(templateUrl)) {
    console.error(`[prerender-seo] ERROR: ${templateUrl} not found. Run \`npm run build\` first.`);
    process.exit(1);
  }

  const template = fs.readFileSync(templateUrl, 'utf-8');

  // Verify all placeholders exist in the template
  const requiredPlaceholders = ['SEO:TITLE', 'SEO:DESC', 'SEO:CANONICAL',
    'SEO:OG-TITLE', 'SEO:OG-DESC', 'SEO:OG-URL', 'SEO:OG-IMAGE',
    'SEO:TWITTER-TITLE', 'SEO:TWITTER-DESC', 'SEO:TWITTER-IMAGE'];
  for (const ph of requiredPlaceholders) {
    if (!template.includes(`<!--${ph}-->`)) {
      console.error(`[prerender-seo] ERROR: Missing placeholder <!--${ph}--> in index.html template.`);
      process.exit(1);
    }
  }

  let created = 0;

  for (const page of PAGES) {
    const replacements = createReplacements(page);
    let html = replaceInTemplate(template, replacements);

    // Inject page-specific JSON-LD
    html = injectJsonLd(html, page);

    // Determine output filename
    const dirName = page.path === '/' ? '' : page.path.replace(/^\//, '');
    const outDir = path.join(DIST_DIR, ...(dirName ? dirName.split('/') : []));
    const outFile = path.join(outDir, 'index.html');

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, html, 'utf-8');
    console.log(`[prerender-seo] ✓ ${page.path === '/' ? '/' : `/${dirName}/`} (${html.length} bytes)`);
    created++;
  }

  console.log(`[prerender-seo] Done. ${created} SEO pages generated in dist/.`);
}

main();
