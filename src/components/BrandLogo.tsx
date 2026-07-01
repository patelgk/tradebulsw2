import React from 'react';

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
};

export const APP_NAME = 'Proprupee';
export const APP_TAGLINE = 'Trade. Earn. Grow.';

export const BrandIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 96 96"
    role="img"
    aria-label="Proprupee logo"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="proprupeeGlow" x1="18" y1="82" x2="84" y2="8" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4EF2C2" />
        <stop offset="0.56" stopColor="#00D4FF" />
        <stop offset="1" stopColor="#4EF2C2" />
      </linearGradient>
      <filter id="proprupeeShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#4EF2C2" floodOpacity="0.55" />
      </filter>
    </defs>
    <rect x="6" y="6" width="84" height="84" rx="24" fill="#08121A" stroke="url(#proprupeeGlow)" strokeOpacity="0.45" />
    <g filter="url(#proprupeeShadow)" stroke="url(#proprupeeGlow)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 72c17 8 40 1 52-20" />
      <path d="M58 18h20v20" />
      <path d="M78 18 53 43" />
      <path d="M29 63V48" />
      <path d="M43 67V36" />
      <path d="M57 57V43" />
    </g>
    <text
      x="22"
      y="48"
      fill="#4EF2C2"
      fontSize="42"
      fontWeight="900"
      fontFamily="Arial, sans-serif"
      filter="url(#proprupeeShadow)"
    >
      ₹
    </text>
  </svg>
);

export default function BrandLogo({
  compact = false,
  className = '',
  iconClassName = 'h-11 w-11',
  textClassName = '',
  showTagline = true,
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <BrandIcon className={iconClassName} />
      {!compact && (
        <span className={textClassName}>
          <span className="block font-black tracking-[-0.045em]">
            <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]">Prop</span>
            <span className="text-[#4EF2C2] drop-shadow-[0_0_14px_rgba(78,242,194,0.45)]">rupee</span>
          </span>
          {showTagline && (
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.28em] text-[#B7FFF0]/80">
              {APP_TAGLINE}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
