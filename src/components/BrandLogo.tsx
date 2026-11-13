/**
 * BrandLogo.tsx
 *
 * Inline SVG logo system for PropRupee.
 * Based on the official reference artwork:
 *   – Dark/black background, neon-green glow border
 *   – Silver "R₹" monogram with green arrow cutting through
 *   – Green neon bull head to the right of the monogram
 *   – "Prop" (white/silver) + "Rupee" (lime-green) wordmark
 *   – Tagline: TRADE • PERFORM • GET FUNDED
 *   – Green candlestick chart in background (banner variant)
 *
 * Exports:
 *   APP_NAME        — string used throughout app
 *   APP_TAGLINE     — tagline string
 *   BrandIconSVG    — square icon mark only (for favicons, app header, splash)
 *   BrandWordmark   — full horizontal logo with bull + wordmark + tagline
 *   BrandLogo       — default: compact or full variant, matches old API
 *   LOGO_ALT        — accessible alt text
 */

import React from 'react';

export const APP_NAME    = 'PropRupee';
export const APP_TAGLINE = 'Trade · Perform · Get Funded';
export const LOGO_ALT    = 'PropRupee — Trade · Perform · Get Funded';

// ─── Shared gradient / filter IDs (unique to avoid collisions) ──────────────
// Each instance inlines its own defs with a uid suffix passed in.

// ─── Square Icon Mark ────────────────────────────────────────────────────────
// The "R₹" monogram with green arrow — matches the rounded-square icon used
// for favicons, app headers, and Android launcher.

export interface BrandIconProps {
  /** pixels or CSS size string – e.g. 40 or "2.5rem" */
  size?: number | string;
  className?: string;
}

export const BrandIconSVG: React.FC<BrandIconProps> = ({ size = 40, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label={LOGO_ALT}
    className={className}
    style={{ flexShrink: 0 }}
  >
    <defs>
      {/* Background */}
      <radialGradient id="bi-bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%"   stopColor="#0d1a0d" />
        <stop offset="100%" stopColor="#050d05" />
      </radialGradient>
      {/* Green glow for arrow + accents */}
      <linearGradient id="bi-green" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%"   stopColor="#22c55e" />
        <stop offset="100%" stopColor="#86efac" />
      </linearGradient>
      {/* Silver gradient for R letterform */}
      <linearGradient id="bi-silver" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor="#ffffff" />
        <stop offset="50%"  stopColor="#c8d8d8" />
        <stop offset="100%" stopColor="#8fa8a8" />
      </linearGradient>
      {/* Outer neon glow border */}
      <filter id="bi-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="bi-glow-sm" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <clipPath id="bi-clip">
        <rect x="0" y="0" width="200" height="200" rx="40" />
      </clipPath>
    </defs>

    {/* ── Background rounded square ── */}
    <rect x="0" y="0" width="200" height="200" rx="40" fill="url(#bi-bg)" />

    {/* ── Neon green border glow ── */}
    <rect
      x="3" y="3" width="194" height="194" rx="38"
      fill="none"
      stroke="#22c55e"
      strokeWidth="3"
      opacity="0.75"
      filter="url(#bi-glow)"
    />

    {/* ── Subtle candlestick bg marks ── */}
    {[
      [148,110,32,10], [160,95,32,10], [172,80,32,10], [184,68,32,10],
    ].map(([x,y,h,w], i) => (
      <g key={i} opacity="0.18">
        <rect x={x} y={y} width={w} height={h} rx="2" fill="#22c55e" />
        <line x1={x+w/2} y1={y-6} x2={x+w/2} y2={y}    stroke="#22c55e" strokeWidth="1.5" />
        <line x1={x+w/2} y1={y+h} x2={x+w/2} y2={y+h+6} stroke="#22c55e" strokeWidth="1.5" />
      </g>
    ))}

    {/* ── "R" letterform in silver ── */}
    {/* Vertical stem */}
    <rect x="38" y="42" width="18" height="116" rx="4" fill="url(#bi-silver)" />
    {/* Top bowl of R (curved top) */}
    <path
      d="M56 42 Q110 42 110 70 Q110 98 56 98 L56 42Z"
      fill="url(#bi-silver)"
      opacity="0.9"
    />
    {/* Inner bowl cutout */}
    <path
      d="M60 52 Q96 52 96 70 Q96 86 60 88 L60 52Z"
      fill="url(#bi-bg)"
    />
    {/* R leg diagonal — this gets overlapped by arrow */}
    <path
      d="M56 98 L100 158 L118 158 L72 98Z"
      fill="url(#bi-silver)"
      opacity="0.85"
    />

    {/* ── Rupee symbol stripes inside R bowl ── */}
    <line x1="62" y1="62" x2="94" y2="62" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" opacity="0.9" />
    <line x1="62" y1="74" x2="94" y2="74" stroke="#22c55e" strokeWidth="5" strokeLinecap="round" opacity="0.9" />

    {/* ── Green arrow cutting diagonally through the R ── */}
    <g filter="url(#bi-glow-sm)">
      {/* Arrow shaft */}
      <line
        x1="52" y1="155"
        x2="138" y2="52"
        stroke="url(#bi-green)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Arrow head */}
      <polygon
        points="138,52 115,58 130,72"
        fill="#4ade80"
      />
    </g>

    {/* ── Neon floor glow line ── */}
    <ellipse cx="100" cy="175" rx="55" ry="6" fill="#22c55e" opacity="0.22" />
  </svg>
);

// ─── Full Horizontal Logo (Banner / Wordmark) ────────────────────────────────
// Matches the banner reference: icon-mark + bull silhouette + PropRupee + tagline

export interface BrandWordmarkProps {
  /** Height in px. Width auto-scales to 3:1 ratio */
  height?: number;
  className?: string;
  /** Show tagline below wordmark */
  showTagline?: boolean;
}

export const BrandWordmark: React.FC<BrandWordmarkProps> = ({
  height = 56,
  className = '',
  showTagline = false,
}) => {
  const w = Math.round(height * 3.2);
  return (
    <svg
      width={w}
      height={height}
      viewBox="0 0 320 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={LOGO_ALT}
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <radialGradient id="bw-bg" cx="10%" cy="50%" r="80%">
          <stop offset="0%"   stopColor="#0d1a0d" />
          <stop offset="100%" stopColor="#050d05" />
        </radialGradient>
        <linearGradient id="bw-green" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"   stopColor="#16a34a" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
        <linearGradient id="bw-silver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#ffffff" />
          <stop offset="60%"  stopColor="#d4e4e4" />
          <stop offset="100%" stopColor="#8fa8a8" />
        </linearGradient>
        <filter id="bw-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bw-textglow" x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Background ── */}
      <rect width="320" height="100" fill="url(#bw-bg)" />

      {/* ── Faint candlestick bg ── */}
      {[
        [245,8,30,8],[258,4,34,8],[271,12,24,8],[284,2,38,8],[297,8,30,8],
      ].map(([x,y,h,w], i) => (
        <g key={i} opacity="0.15">
          <rect x={x} y={y} width={w} height={h} rx="1.5" fill="#22c55e" />
          <line x1={x+w/2} y1={y-4}   x2={x+w/2} y2={y}   stroke="#22c55e" strokeWidth="1" />
          <line x1={x+w/2} y1={y+h}   x2={x+w/2} y2={y+h+4} stroke="#22c55e" strokeWidth="1" />
        </g>
      ))}

      {/* ── Icon mark (R₹ with arrow) — left section ── */}
      <g transform="translate(6, 8) scale(0.42)">
        {/* R stem */}
        <rect x="8" y="8" width="14" height="84" rx="3" fill="url(#bw-silver)" />
        {/* R bowl */}
        <path d="M22 8 Q62 8 62 34 Q62 58 22 58 L22 8Z" fill="url(#bw-silver)" opacity="0.9" />
        <path d="M25 17 Q52 17 52 34 Q52 50 25 51 L25 17Z" fill="#0a1408" />
        {/* Rupee lines */}
        <line x1="26" y1="24" x2="50" y2="24" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
        <line x1="26" y1="34" x2="50" y2="34" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" />
        {/* R leg */}
        <path d="M22 58 L54 100 L64 100 L32 58Z" fill="url(#bw-silver)" opacity="0.8" />
        {/* Green arrow */}
        <g filter="url(#bw-glow)">
          <line x1="18" y1="96" x2="74" y2="20" stroke="url(#bw-green)" strokeWidth="7" strokeLinecap="round" />
          <polygon points="74,20 58,26 66,40" fill="#4ade80" />
        </g>
      </g>

      {/* ── Bull silhouette ── */}
      {/* Simplified neon-green bull head — stylized to match reference */}
      <g transform="translate(50, 6)" opacity="0.92">
        {/* Body mass */}
        <ellipse cx="22" cy="52" rx="20" ry="24" fill="#0f2010" />
        {/* Head */}
        <ellipse cx="22" cy="34" rx="16" ry="14" fill="#133018" />
        {/* Left horn */}
        <path d="M10 26 Q2 10 8 6 Q12 18 14 24Z" fill="#22c55e" opacity="0.9" />
        {/* Right horn */}
        <path d="M34 26 Q42 10 36 6 Q32 18 30 24Z" fill="#22c55e" opacity="0.9" />
        {/* Eyes — neon glow */}
        <circle cx="16" cy="34" r="3" fill="#4ade80" />
        <circle cx="28" cy="34" r="3" fill="#4ade80" />
        <circle cx="16" cy="34" r="1.5" fill="#ffffff" opacity="0.9" />
        <circle cx="28" cy="34" r="1.5" fill="#ffffff" opacity="0.9" />
        {/* Snout */}
        <ellipse cx="22" cy="44" rx="8" ry="5" fill="#1a4020" />
        <circle cx="19" cy="44" r="1.8" fill="#0d2010" />
        <circle cx="25" cy="44" r="1.8" fill="#0d2010" />
        {/* Outline glow */}
        <ellipse cx="22" cy="34" rx="16" ry="14" fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.7" />
        <ellipse cx="22" cy="52" rx="20" ry="24" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.4" />
      </g>

      {/* ── "Prop" in white/silver ── */}
      <text
        x="130" y="52"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="38"
        fill="#ffffff"
        letterSpacing="-1"
      >
        Prop
      </text>

      {/* ── "Rupee" in lime-green with glow ── */}
      <text
        x="202" y="52"
        fontFamily="'Arial Black', 'Arial', sans-serif"
        fontWeight="900"
        fontSize="38"
        fill="#4ade80"
        letterSpacing="-1"
        filter="url(#bw-textglow)"
      >
        Rupee
      </text>

      {/* ── Tagline ── */}
      {showTagline && (
        <>
          {/* Decorative line left */}
          <line x1="118" y1="66" x2="136" y2="66" stroke="#22c55e" strokeWidth="1.5" opacity="0.7" />
          {/* Tagline text */}
          <text
            x="140" y="70"
            fontFamily="'Arial', sans-serif"
            fontWeight="700"
            fontSize="8.5"
            fill="#d1fae5"
            letterSpacing="1.5"
            textAnchor="start"
          >
            TRADE  •  PERFORM  •  GET FUNDED
          </text>
          {/* Decorative line right */}
          <line x1="296" y1="66" x2="314" y2="66" stroke="#22c55e" strokeWidth="1.5" opacity="0.7" />
        </>
      )}

      {/* ── Floor glow ── */}
      <ellipse cx="160" cy="96" rx="140" ry="5" fill="#22c55e" opacity="0.12" />
    </svg>
  );
};

// ─── Compact nav/header logo (icon + wordmark, no tagline) ───────────────────

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
};

const SIZE_PX: Record<string, number> = {
  xs: 24,
  sm: 30,
  md: 36,
  lg: 44,
  xl: 60,
};

/**
 * BrandLogo — drop-in replacement for all previous logo usages.
 * compact=true  → icon mark only
 * compact=false → icon + "PropRupee" text (default)
 */
export default function BrandLogo({
  compact = false,
  className = '',
  size = 'md',
  showTagline = false,
}: BrandLogoProps) {
  const px = SIZE_PX[size] ?? 36;

  if (compact) {
    return <BrandIconSVG size={px} className={className} />;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`} style={{ lineHeight: 1 }}>
      <BrandIconSVG size={px} />
      <span style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
        <span style={{ color: '#ffffff' }}>Prop</span>
        <span style={{ color: '#4ade80', textShadow: '0 0 12px rgba(74,222,128,0.5)' }}>Rupee</span>
        {showTagline && (
          <span style={{
            display: 'block',
            fontSize: '0.6em',
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: 'rgba(167,243,208,0.75)',
            textShadow: 'none',
            marginTop: 2,
          }}>
            {APP_TAGLINE}
          </span>
        )}
      </span>
    </span>
  );
}

// ─── Legacy compat — LOGO_ALT kept for external references
export { LOGO_ALT };
