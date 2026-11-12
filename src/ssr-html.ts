/**
 * Assembles a complete HTML document from the SSR content + meta tags.
 */
import type { PageMeta } from './utils/ssr-pages.js';

const HEADER = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#08121A" />
  <meta name="robots" content="index, follow" />
`;

const FOOTER = `</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;

export function assemblePage(html: string, meta: PageMeta | null): string {
  if (!meta) return HEADER.replace('</head>', `${FOOTER.replace('<head>', '').replace('</head>', '')}\n`) + FOOTER.replace(/<head>.*<\/head>/s, '');

  const titleTag = `<title>${escapeHtml(meta.title)}</title>\n`;
  const descTag = `<meta name="description" content="${escapeHtml(meta.description)}" />\n`;
  const canonicalTag = `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />\n`;
  const ogTitle = `<meta property="og:title" content="${escapeHtml(meta.title)}" />\n`;
  const ogDesc = `<meta property="og:description" content="${escapeHtml(meta.description)}" />\n`;
  const ogUrl = `<meta property="og:url" content="${escapeHtml(meta.canonical)}" />\n`;
  const ogImage = `<meta property="og:image" content="${escapeHtml(meta.image)}" />\n`;
  const twitterTitle = `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />\n`;
  const twitterDesc = `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />\n`;
  const twitterImage = `<meta name="twitter:image" content="${escapeHtml(meta.image)}" />\n`;

  return HEADER +
    titleTag + descTag + canonicalTag +
    ogTitle + ogDesc + ogUrl + ogImage +
    twitterTitle + twitterDesc + twitterImage +
    `</head>\n<body>\n<div id="root">${html}</div>\n<script type="module" src="/src/main.tsx"></script>\n</body>\n</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
