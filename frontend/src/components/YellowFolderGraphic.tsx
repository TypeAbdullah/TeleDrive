import React from 'react';

interface YellowFolderGraphicProps {
  type: 'DOCX' | 'JPG' | 'PDF' | 'PNG' | string;
  width?: number;
  height?: number;
}

export const YellowFolderGraphic: React.FC<YellowFolderGraphicProps> = ({
  type,
  width = 140,
  height = 104,
}) => {
  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 140 104"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="folder-shadow" x="2" y="8" width="136" height="96" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.16" />
          </filter>
          <linearGradient id="folder-back-grad" x1="18" y1="14" x2="18" y2="88" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="folder-front-grad" x1="12" y1="28" x2="12" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Back folder body with top-left tab */}
        <path
          d="M16 26C16 19.3726 21.3726 14 28 14H52.5C55.6826 14 58.7351 15.2643 60.9853 17.5147L66.4853 23.0147C67.6104 24.1398 69.1367 24.7721 70.7279 24.7721H112C118.627 24.7721 124 30.1447 124 36.7721V78C124 84.6274 118.627 90 112 90H28C21.3726 90 16 84.6274 16 78V26Z"
          fill="url(#folder-back-grad)"
        />

        {/* Peeking White Document Sheet inside */}
        <rect
          x="34"
          y="20"
          width="72"
          height="34"
          rx="6"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Front folder flap */}
        <g filter="url(#folder-shadow)">
          <rect
            x="12"
            y="28"
            width="116"
            height="66"
            rx="16"
            fill="url(#folder-front-grad)"
          />
        </g>

        {/* Center Badge */}
        {type.toUpperCase() === 'DOCX' ? (
          <g transform="translate(56, 44)">
            {/* Sheet outline */}
            <rect x="0" y="0" width="28" height="34" rx="4" fill="#D97706" />
            {/* Text lines */}
            <rect x="5" y="7" width="12" height="2.5" rx="1.25" fill="#FFFFFF" />
            <rect x="5" y="13" width="18" height="2.5" rx="1.25" fill="#FFFFFF" />
            <rect x="5" y="19" width="18" height="2.5" rx="1.25" fill="#FFFFFF" />
            <rect x="5" y="25" width="14" height="2.5" rx="1.25" fill="#FFFFFF" />
          </g>
        ) : (
          <g transform="translate(49, 48)">
            <rect
              x="0"
              y="0"
              width="42"
              height="26"
              rx="6"
              fill="#D97706"
            />
            <text
              x="21"
              y="17"
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="700"
              fontFamily="Inter, system-ui, sans-serif"
              textAnchor="middle"
              letterSpacing="0.5"
            >
              {type}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
