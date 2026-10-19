import React from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

/**
 * Bifogat Logo Component
 * Renders inline SVG adapted to the project's Swedish beekeeping sage palette:
 * - Light Sage Cream: #f1f3e0
 * - Soft Sage: #d2dcb6
 * - Medium Sage Green: #a1bc98
 * - Dark Sage / Olive Gray: #778873
 * - Deep Forest Charcoal: #273026
 * - Warm Honey Amber: #f59e0b / #fbbf24
 *
 * Inlined SVG avoids 404 network issues when deployed on subpath domains (e.g. GitHub Pages /bifogat/).
 */
export const Logo: React.FC<LogoProps> = ({
  className = "header-logo",
  size = 32,
  style,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        borderRadius: "8px",
        flexShrink: 0,
        ...style,
      }}
      role="img"
      aria-label="Bifogat logotyp"
    >
      <defs>
        <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a1bc98" />
          <stop offset="100%" stopColor="#778873" />
        </linearGradient>
        <linearGradient id="logoCombGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f1f3e0" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#d2dcb6" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="logoStripeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="logoWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f1f3e0" stopOpacity="0.8" />
        </linearGradient>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="5" stdDeviation="8" floodColor="#273026" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Rounded squircle background in dark/medium sage */}
      <rect width="512" height="512" rx="112" fill="url(#logoBgGrad)" />
      <rect
        width="504"
        height="504"
        x="4"
        y="4"
        rx="108"
        fill="none"
        stroke="#f1f3e0"
        strokeWidth="4"
        strokeOpacity="0.45"
      />

      <g filter="url(#logoShadow)">
        {/* Honeycomb hex backdrop in soft sage cream */}
        <polygon
          points="256,70 340,118 340,214 256,262 172,214 172,118"
          fill="url(#logoCombGrad)"
          stroke="#778873"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <polygon
          points="172,214 256,262 256,358 172,406 88,358 88,262"
          fill="url(#logoCombGrad)"
          stroke="#778873"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <polygon
          points="340,214 424,262 424,358 340,406 256,358 256,262"
          fill="url(#logoCombGrad)"
          stroke="#778873"
          strokeWidth="6"
          strokeLinejoin="round"
        />

        {/* Bee Wings */}
        <ellipse
          cx="205"
          cy="195"
          rx="44"
          ry="64"
          transform="rotate(-30 205 195)"
          fill="url(#logoWingGrad)"
          stroke="#778873"
          strokeWidth="4"
        />
        <line
          x1="205"
          y1="140"
          x2="205"
          y2="245"
          transform="rotate(-30 205 195)"
          stroke="#a1bc98"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />

        <ellipse
          cx="307"
          cy="195"
          rx="44"
          ry="64"
          transform="rotate(30 307 195)"
          fill="url(#logoWingGrad)"
          stroke="#778873"
          strokeWidth="4"
        />
        <line
          x1="307"
          y1="140"
          x2="307"
          y2="245"
          transform="rotate(30 307 195)"
          stroke="#a1bc98"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />

        {/* Bee Abdomen Body */}
        <ellipse cx="256" cy="270" rx="52" ry="72" fill="#273026" />

        {/* Honey Amber Stripes */}
        <path d="M 208 242 Q 256 252 304 242 L 307 262 Q 256 272 205 262 Z" fill="url(#logoStripeGrad)" />
        <path d="M 205 277 Q 256 288 307 277 L 304 297 Q 256 308 208 297 Z" fill="url(#logoStripeGrad)" />
        <path d="M 215 312 Q 256 324 297 312 L 290 327 Q 256 337 222 327 Z" fill="url(#logoStripeGrad)" />

        {/* Stinger */}
        <polygon points="256,348 250,364 262,364" fill="#1c241c" />

        {/* Head */}
        <circle cx="256" cy="178" r="30" fill="#273026" />

        {/* Eyes */}
        <ellipse cx="242" cy="173" rx="5.5" ry="8.5" fill="#f1f3e0" />
        <circle cx="243" cy="174" r="3.5" fill="#1c241c" />
        <ellipse cx="270" cy="173" rx="5.5" ry="8.5" fill="#f1f3e0" />
        <circle cx="269" cy="174" r="3.5" fill="#1c241c" />

        {/* Antennae */}
        <path
          d="M 246 152 Q 232 128 222 133"
          stroke="#273026"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="220" cy="134" r="5.5" fill="#f59e0b" />
        <path
          d="M 266 152 Q 280 128 290 133"
          stroke="#273026"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="292" cy="134" r="5.5" fill="#f59e0b" />
      </g>
    </svg>
  );
};
