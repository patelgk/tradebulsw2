/**
 * Post-build prerender script for Proprupee SEO pages.
 *
 * Runs AFTER `vite build`. Reads dist/index.html as a template, replaces
 * placeholder comments with page-specific meta tags, and writes one static
 * HTML file per public SEO route into dist/.
 *
 * Each generated page contains:
 *   - Correct <title>
 *   - Correct <meta name="description">
 *   - Self-referencing <link rel="canonical">
 *   - Correct OG tags (og:title, og:description, og:url, og:image)
 *   - Correct Twitter Card tags
 *   - Page-specific JSON-LD structured data
 *   - Shared Vite JS/CSS bundles (identical to index.html)
 *
 * Usage: node scripts/prerender-seo.mjs
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
  path: string;
  title: string;
  description: string;
  image: string;
  schemaType: string;
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
// Helpers
// ---------------------------------------------------------------------------
function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlFor(page: PageMeta): string {
  return page.path === '/' ? BASE_URL : `${BASE_URL}${page.path}`;
}

// ---------------------------------------------------------------------------
// Replace placeholders in template HTML
// ---------------------------------------------------------------------------
function applyTemplate(html: string, page: PageMeta): string {
  const u = urlFor(page);
  const replacements: Record<string, string> = {
    '<!--SEO:TITLE-->': `<title>${escapeXml(page.title)}</title>\n`,
    '<!--SEO:CANONICAL-->': `<link rel="canonical" href="${u}" />\n`,
    '<!--SEO:OG-TITLE-->': `<meta property="og:title" content="${escapeXml(page.title)}" />\n`,
    '<!--SEO:OG-DESC-->': `<meta property="og:description" content="${escapeXml(page.description)}" />\n`,
    '<!--SEO:OG-URL-->': `<meta property="og:url" content="${u}" />\n`,
    '<!--SEO:OG-IMAGE-->': `<meta property="og:image" content="${page.image}" />\n`,
    '<!--SEO:TWITTER-TITLE-->': `<meta name="twitter:title" content="${escapeXml(page.title)}" />\n`,
    '<!--SEO:TWITTER-DESC-->': `<meta name="twitter:description" content="${escapeXml(page.description)}" />\n`,
    '<!--SEO:TWITTER-IMAGE-->': `<meta name="twitter:image" content="${page.image}" />\n`,
  };
  let result = html;
  for (const [ph, rep] of Object.entries(replacements)) {
    result = result.split(ph).join(rep);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Inject page-specific JSON-LD (replaces the <!--SEO:JSONLD--> placeholder)
// ---------------------------------------------------------------------------
function injectJsonLd(html: string, page: PageMeta): string {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': page.schemaType,
    name: page.title,
    url: urlFor(page),
    description: page.description,
    image: page.image,
    publisher: { '@type': 'Organization', name: 'Proprupee', url: BASE_URL },
  });
  const replacement = `  <script type="application/ld+json">\n${jsonLd}\n  </script>\n`;
  return html.split('<!--SEO:JSONLD-->').join(replacement);
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

  // Verify all placeholders exist
  const required = ['SEO:TITLE', 'SEO:CANONICAL', 'SEO:OG-TITLE', 'SEO:OG-DESC',
    'SEO:OG-URL', 'SEO:OG-IMAGE', 'SEO:TWITTER-TITLE', 'SEO:TWITTER-DESC',
    'SEO:TWITTER-IMAGE', 'SEO:JSONLD'];
  for (const ph of required) {
    if (!template.includes(`<!--${ph}-->`)) {
      console.error(`[prerender-seo] ERROR: Missing placeholder <!--${ph}--> in index.html.`);
      process.exit(1);
    }
  }

  let created = 0;
  for (const page of PAGES) {
    let html = applyTemplate(template, page);
    html = injectJsonLd(html, page);

    // Write to: dist/{path-without-leading-slash}/index.html or dist/index.html
    const dirName = page.path === '/' ? '' : page.path.replace(/^\//, '').split('/').slice(0, -1).join('/');
    const outDir = dirName ? path.join(DIST_DIR, dirName) : DIST_DIR;
    const outFile = path.join(outDir, 'index.html');

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, html, 'utf-8');
    console.log(`[prerender-seo] ✓ ${page.path} → ${outDir.endsWith('dist') ? 'dist/' : `dist/${dirName}/`}index.html`);
    created++;
  }

  console.log(`[prerender-seo] Done. ${created} SEO pages generated.\n`);
}

main();
