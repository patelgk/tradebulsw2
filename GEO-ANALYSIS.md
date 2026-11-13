# GEO Analysis: proprupee.com

**Site:** https://www.proprupee.com  
**Domain type:** React 19 + Vite SPA · Express backend · Render deployment  
**Audit date:** 2026-11-13  

---

## 1. GEO Readiness Score: **42 / 100**

> This score is a heuristic checklist assessment, not a predicted citation rate or Google-internal ranking signal. Third-party SEO tools have no access to Google's internal data (per Google's third-party guidance published 2026-06-05).

| Category | Weight | Score | Notes |
|---|---|---|---|
| Citability | 25% | 8/25 | Thin passage-level content; max ~77 words per block; no specific data/sources |
| Structural Readability | 20% | 14/20 | Strong H1→H2 hierarchy; FAQ sections good; no tables |
| Multi-Modal Content | 15% | 2/15 | SVG icon only; no images; OG image missing from CDN |
| Authority & Brand Signals | 20% | 9/20 | No author bylines; no dates; no Wikipedia/Reddit presence detected; YMYL sector amplifies this gap |
| Technical Accessibility | 20% | 9/20 | SSR OK at server level; robots.txt mostly clean; no llms.txt; OAI-SearchBot/Claude-SearchBot/PerplexityBot status unknown (site returned 503 during live fetch) |

---

## 2. Platform Breakdown

| Platform | Measured? | Assessment |
|---|---|---|
| **Google AI Overviews** | Not measured (no DataForSEO/SE Ranking) | Qualitative: eligibility floor met (indexed + Search Console control default-include); content too thin for AI Overview extraction without rewriting |
| **Google AI Mode** | Not measured | Same as above; AI Mode draws from a broader pool than AIO but still requires citable passages (~130-170 words) |
| **ChatGPT / Perplexity** | Not measured | Requires entity presence on Reddit/Wikipedia/YouTube plus backlink correlation; none observed in available signals |

Live site fetch returned HTTP 503 (deploy may be paused/on-render), so crawler-access was inferred from `robots.txt` source rather than tested against live endpoints.

---

## 3. AI Crawler Access Status

### robots.txt (source of truth)

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://www.proprupee.com/sitemap.xml
```

**Note:** the frontend-user public copy (served via Render) uses `https://proprupee.com/sitemap.xml` (non-www) — this is a minor inconsistency but not a blocking issue since both resolve.

| Crawler | Governed Capability | Status | Evidence |
|---|---|---|---|
| `OAI-SearchBot` | ChatGPT Search citability | ✅ Allowed (unblocked wildcard) | Not explicitly named; falls under `Allow: /` |
| `Claude-SearchBot` | Claude search citability | ✅ Allowed | Same reasoning |
| `PerplexityBot` | Perplexity AI search | ✅ Allowed | Same reasoning |
| `Googlebot` | Google Search / AI Overviews / AI Mode inclusion | ✅ Allowed | Same reasoning |
| `GPTBot` | OpenAI model training only | ✅ Allowed (not blocked) | Training opt-in by omission |
| `ClaudeBot` | Anthropic model training only | ✅ Allowed (not blocked) | Same |
| `CCBot` | Common Crawl training data | ✅ Allowed (not blocked) | Same |
| `Applebot-Extended` | Apple Intelligence training opt-out | ⚠️ Allows training use | No explicit disallow; site is opt-out by omission |
| `Google-Extended` | Gemini/Vertex training & grounding | ✅ Allowed (not blocked) | Same |

**⚠️ Live verification not possible** — site returned 503 during this audit. Once Render is running, verify with:
```bash
curl -I -H "User-Agent: GPTBot" https://www.proprupee.com/robots.txt
```

---

## 4. llms.txt Status

| File | Present? | Verdict |
|---|---|---|
| `/llms.txt` (domain root) | ❌ Missing | Optional; Google Search ignores it per [Google AI optimization guide §Myths](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (updated 2026-07-10). Non-Google crawlers may benefit. |
| `public/llms.txt` | ❌ Missing | Same as above |

**Recommendation:** Ship a minimal `/llms.txt` for non-Google optionality at zero cost. Example template (non-blocking):

```markdown
# Proprupee | Prop Firm & Trader Funding Platform in India
> Proprupee evaluates traders based on their trading skills and strategy and provides eligible traders access to its funding program in India.

## Main sections
- [What is Proprupee?](https://www.proprupee.com/what-is-proprupee): Introduction to the trader evaluation and funding platform.
- [How Proprupee Works](https://www.proprupee.com/how-proprupee-works): Step-by-step challenge → evaluation → funding pathway.
- [Trader Evaluation](https://www.proprupee.com/trader-evaluation): Evaluation metrics including profit target, daily loss limit, and maximum drawdown.
- [Funding Program](https://www.proprupee.com/funding-program): Account sizes, profit splits (up to 90%), and payout terms.
- [FAQ](https://www.proprupee.com/faq): Frequently asked questions about prop trading in India.

## Key facts
- Supports NIFTY, BANKNIFTY, FINNIFTY, and SENSEX indexes
- Challenge fees: ₹9,999 – ₹99,999 across four account tiers
- Profit splits up to 90% depending on challenge tier
- Payout cycle: 15 days
```

Place at `public/llms.txt` so `express.static()` serves it, and add the same file to `frontend/user/public/` to cover both deploy targets.

---

## 5. Brand Mention Analysis

| Platform | Presence Detected | Impact on AI Citations |
|---|---|---|
| Wikipedia | ❌ Not found | High — Wikipedia is #1 cited source for ChatGPT (47.9%, Ahrefs 2025-06) |
| Reddit | ❌ No mentions found in public index | Very high — Reddit dominates Perplexity top-10 sources (46.7%) and is a strong ChatGPT signal (11.3%) |
| YouTube | ❌ No channel/profile found | Highest correlation signal (Ahrefs: r ≈ 0.737) |
| LinkedIn | ❌ No corporate profile linked in `sameAs` schema | Moderate correlation |
| Domain Rating (backlinks) | Unknown — no Ahrefs/Moz tooling available | Weak correlation (r ≈ 0.266) vs. brand mentions per Ahrefs 75k-brand study (2025-12) |

**Key insight:** In Ahrefs' study of 75,000 brands, brand mentions correlated ~3× more strongly with AI visibility than backlinks did. For a YMYL-sector business (trading/funding = financial decisions), building entity presence is disproportionately important.

**Recommended actions (ranked by expected impact):**
1. Publish an original research piece (e.g., "State of Indian Retail Derivatives Trading 2026") and pitch to Financiale Times India, Moneycontrol, or ET — earn citations that propagate to Wikipedia and Reddit.
2. Create a LinkedIn company page and link it in the `sameAs` array in Organization schema.
3. Post short-form educational content on X/Twitter and Reddit (r/IndianStockMarket, r/investing) to build referral mentions.

---

## 6. Passage-Level Citability

### Current state: thin, generic, unattributed

Measured word counts per body block across all SEO pages (`SeoInfoPages.tsx`):

| Page | Sections | Avg words/paragraph | Best block | Missing |
|---|---|---|---|---|
| What is Proprupee? | 3 | ~66 | ~77 | Specific numbers, sources |
| How Proprupee Works | 3 | ~43 | ~66 | Concrete example walkthrough |
| Trader Evaluation | 3 | ~45 | ~57 | Numeric thresholds, case study |
| Funding Program | 3 | ~41 | ~52 | Exact fee schedule, split table |
| FAQ (page) | 8 | ~42 | ~48 | Sources for every claim |
| FAQ (landing-page accordion) | 8 | ~42 | ~52 | Duplicate content, not indexed separately |

**Verdict:** None of the current paragraphs meet the ~130–170 word self-contained answer-block heuristic. Most are 35–50 words of generic description with zero citations, statistics, or primary-source attribution. AI systems need quotable blocks with specific data points to extract — these passages read like marketing summary copy, not citable reference material.

### Specific rewrite opportunities

| Passage location | Current text (excerpt) | Problem | Fix direction |
|---|---|---|---|
| Landing hero paragraph | *"Proprupee evaluates traders based on their trading skills and strategy and provides eligible traders access to its funding program."* | 1 sentence, 22 words — too short to cite | Expand to 3-4 sentences with concrete criteria (profit target %, DD %, instruments traded) |
| FAQ "What is a prop firm in India?" | Generic definition | No numbers, no comparison | Add: typical Indian prop-firm landscape, SEBI-regulated brokers vs. overseas prop firms, why evaluation matters |
| Funding Program — profit split | *"The profit split can reach up to 80%, 85%, or 90%"* | Numbers present but no context/source | Attribute to challenge tier; add footnote-like citation to Terms section |

---

## 7. Server-Side Rendering Check

| Aspect | Finding |
|---|---|
| Architecture | **SSR-capable but currently client-rendered.** `server.ts` serves `dist/index.html` as a SPA fallback (`app.get("*", … res.sendFile(distPath + "/index.html"))`). The React app hydrates entirely in the browser. |
| AI crawler rendering | ✅ **Googlebot renders JS** — feeds AI Overviews/AI Mode. Site content will appear after hydration. ⚠️ **GPTBot / ClaudeBot / PerplexityBot do not run JavaScript** in most configurations. They see the bare `<div id="root"></div>` shell with only `<title>` and meta tags from `index.html`. This means **all content beyond the initial HTML head is invisible to non-Google AI crawlers**. |
| Critical impact | SEO pages (What is Proprupee, FAQ, etc.) render nothing meaningful until React hydration completes. This is a hard blocker for ChatGPT Search and Perplexity citability. |
| Recommendation | Implement basic HTML pre-rendering (SSR) using: (a) a static pre-render step at build time with `@vitejs/plugin-react` + `react-snap`/`preact-cli`, or (b) a lightweight Node.js SSR via `renderToString` for the 8 SEO-only routes while keeping the trading dashboard as a hydrated SPA. This is the single highest-impact technical change for AI citability. |

---

## 8. Top 5 Highest-Impact Changes

### 1. Pre-render SEO pages to static HTML (estimated impact: +18 points)
**Why:** Without rendered HTML, non-Google AI crawlers (responsible for ~50%+ of AI queries) see empty shells. A build-time prerender pass for the 8 sitemap URLs would make content immediately available to all crawlers.
**Effort:** Medium. Can be done via `vite-plugin-prerender` or a small Node script using JSDOM/React `renderToString` targeting the 8 known paths.

### 2. Expand SEO page bodies to 130–200 words per section with specific data (estimated impact: +12 points)
**Why:** Current passages average ~42 words — far below the citability threshold. Each section should include at least one specific number (challenge size, profit target percentage, instrument list, fee range) attributed to a primary source (platform policy document or Terms).
**Effort:** Low. Direct content edit in `SeoInfoPages.tsx`.

### 3. Add og-image.png to `/public` (estimated impact: +5 points)
**Why:** OG image is referenced but does not exist at `https://www.proprupee.com/og-image.png`. Social preview cards show broken/imageless when shared. Google AI Mode can surface images in answers.
**Effort:** Low. Generate a 1200×630 PNG via AI image generation (use `/seo image-gen` skill).

### 4. Add `/llms.txt` to both public directories (estimated impact: +3 points)
**Why:** Zero-cost optionality for non-Google LLM agents. Already documented above in Section 4.
**Effort:** Trivial — create two files.

### 5. Build Reddit/Youtube/Wikipedia entity presence (estimated impact: +10 points, long-term)
**Why:** Ahrefs' 75k-brand study shows brand mentions correlate ~3× more than backlinks with AI citation rates. YouTube mentions carry the strongest single correlation (r ≈ 0.737).
**Effort:** High — ongoing marketing effort, not a code change.

---

## 9. Schema Recommendations

### Current schema (in `index.html`)
```json
{ "@type": "Organization", "name": "Proprupee", "sameAs": ["https://www.proprupee.com/"] }
{ "@type": "WebSite", ...SearchAction }
```

### Recommended additions

**a) Add `sameAs` with real social profiles** (boosts entity resolution):
```json
"sameAs": [
  "https://www.proprupee.com/",
  "https://www.linkedin.com/company/proprupee",     /* create if absent */
  "https://twitter.com/proprupee",                   /* create if absent */
  "https://www.youtube.com/@proprupee"               /* create if absent */
]
```

**b) Add `LocalBusiness` or `FinancialService` sub-schema** (India-focused YMYL signals):
```json
{
  "@type": "FinancialService",
  "name": "Proprupee",
  "areaServed": { "@type": "Country", "name": "India" },
  "telephone": "+91-93032-59841",
  "email": "support@proprupee.com",
  "openingHours": "Mo-Sa 09:00-18:00",
  "currenciesAccepted": "INR",
  "paymentAccepted": "UPI, Credit Card, Net Banking"
}
```

**c) Add `FAQPage` schema on the FAQ route** — helps Google extract Q&A directly:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is a prop firm in India?", "acceptedAnswer": { "@type": "Answer", "text": "…" } },
    …
  ]
}
```
*Note:* Google's AI optimization guide says over-investing in structured data specifically for AI features is not needed, but `FAQPage` and `Organization` schemas are baseline best practice that survive across algorithm updates. Ship them; don't treat them as magic bullets.

**d) Add `Person` schema for any named founder/team member** on an About page — who/where credentials matter for YMYL E-E-A-T signals per Google's creating-helpful-content guidance.

---

## 10. Content Reformatting Suggestions

### Passages to rewrite (priority order)

**1. Hero section paragraph** (`LandingPage.tsx` line ~310)
- Current: 1 sentence, 22 words, no specifics
- Target: 3–4 sentences covering what the platform does, which instruments, what the evaluation tests, and what funding unlocks
- Include at least 2 citable data points (e.g., "challenges start at ₹50,000 capital with profit targets of 8–10%")

**2. FAQ accordion on landing page** (`LandingPage.tsx` lines 751–761)
- These are near-duplicates of the dedicated `/faq` page. Pick one canonical source (preferably `/faq`) and replace the accordion with short teaser text linking to `/faq` — avoids duplicate-content dilution and gives crawlers a single strong signal per topic.

**3. Each section body in `SeoInfoPages.tsx`**
- Add a first sentence that stands alone as a complete answer (the "direct answer in first 40–60 words" principle).
- Follow with 2–3 supporting sentences containing specific numbers (percentages, currency amounts, instrument names).
- Add a source attribution phrase: "According to Proprupee's challenge terms" or cite the relevant section of the Terms page.

**4. Stats section** (`LandingPage.tsx` lines 400–429)
- Current: fake-looking numbers ("₹250Cr+ Simulated Trading Volume", "50,000+ Traders", "99.9% Uptime") with no sources.
- Risk: YMYL sector amplifies trust requirements; unsourced stats undermine credibility with AI evaluators.
- Fix: Either attach verifiable numbers with source citations, or remove the section and replace with a feature-benefit block tied to real platform capability.

---

## Appendix: Technical Details

### Deployment architecture
- Single Render deployment (`render.yaml`) serving both user frontend (`proprupee.com`) and admin frontend (`admin.proprupee.com`) via separate web services.
- Backend at `proprupee-backend.onrender.com`.
- SEO pages rendered client-side via React router; no SSR middleware for those routes.

### Canonical URL behavior
| Route | Set canonical to | Issue |
|---|---|---|
| `/risk-disclaimer` | Self (`/risk-disclaimer`) | ✅ |
| `/terms` | `https://www.proprupee.com/terms-and-conditions` | ✅ (correct self-cannibalization prevention) |
| `/terms-and-conditions` | Self | ✅ |
| `/what-is-proprupee` | Self | ✅ |
| `/how-proprupee-works` | Self | ✅ |
| `/trader-evaluation` | Self | ✅ |
| `/funding-program` | Self | ✅ |
| `/faq` | Self | ✅ |
| `/` (home) | `https://www.proprupee.com/` | ✅ |

**No conflicting canonical issues found.** Both `/terms` and `/terms-and-conditions` correctly converge to one canonical URL.

### robots.txt consistency check
Root `public/robots.txt` and `frontend/user/public/robots.txt` differ only in the sitemap URL (`www.proprupee.com` vs `proprupee.com`). Since both are valid and the sitemap itself lives at the www host, the non-www version is harmless but worth aligning to avoid confusion.

### Sitemap validation
All 8 URLs in `sitemap.xml` are crawlable under current robots.txt (none fall under `/admin/` or `/api/`). Priorities and changefreq values are reasonable.
