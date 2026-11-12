/**
 * SSR entry point — renders a page component to HTML for a given pathname.
 * Only called during development when process.env.SSR=true.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { getPageMeta, renderSeoInfoPage, renderTermsPage, renderRiskDisclosurePage } from './utils/ssr-pages.js';

export interface SsrResult {
  html: string;
  meta: ReturnType<typeof getPageMeta>;
}

export function renderPage(pathname: string): SsrResult {
  const meta = getPageMeta(pathname);
  let content = '';
  if (pathname === '/what-is-proprupee') {
    content = renderSeoInfoPage('what-is-proprupee');
  } else if (pathname === '/how-proprupee-works') {
    content = renderSeoInfoPage('how-proprupee-works');
  } else if (pathname === '/trader-evaluation') {
    content = renderSeoInfoPage('trader-evaluation');
  } else if (pathname === '/funding-program') {
    content = renderSeoInfoPage('funding-program');
  } else if (pathname === '/faq') {
    content = renderSeoInfoPage('faq');
  } else if (pathname === '/terms') {
    content = renderTermsPage();
  } else if (pathname === '/risk-disclaimer') {
    content = renderRiskDisclosurePage();
  }

  return { html: content, meta };
}
