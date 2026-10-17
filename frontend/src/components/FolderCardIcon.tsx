import React from 'react';
import { Icon } from '@iconify/react';

interface FolderCardIconProps {
  iconName: string;
  width?: number;
  height?: number;
}

export const FolderCardIcon: React.FC<FolderCardIconProps> = ({
  iconName,
  width = 96,
  height = 72,
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
        viewBox="0 0 96 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`fg-back-${iconName}`} x1="12" y1="10" x2="12" y2="62" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id={`fg-front-${iconName}`} x1="8" y1="20" x2="8" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FBBF24" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
          <filter id={`fg-shadow-${iconName}`} x="0" y="4" width="96" height="68" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Back folder body with top-left tab */}
        <path
          d="M10 18C10 13.5817 13.5817 10 18 10H36.5C38.6217 10 40.6567 10.8429 42.1569 12.3431L45.8431 16.0294C46.5932 16.7795 47.6107 17.201 48.6716 17.201H78C82.4183 17.201 86 20.7827 86 25.201V56C86 60.4183 82.4183 64 78 64H18C13.5817 64 10 60.4183 10 56V18Z"
          fill={`url(#fg-back-${iconName})`}
        />

        {/* Peeking White Sheet */}
        <rect
          x="22"
          y="14"
          width="52"
          height="24"
          rx="4"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Front folder flap */}
        <g filter={`url(#fg-shadow-${iconName})`}>
          <rect
            x="8"
            y="20"
            width="80"
            height="46"
            rx="11"
            fill={`url(#fg-front-${iconName})`}
          />
        </g>
      </svg>

      {/* Center Icon Badge */}
      <div
        style={{
          position: 'absolute',
          top: '56%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#d97706',
        }}
      >
        <Icon icon={iconName} width="22" height="22" />
      </div>
    </div>
  );
};
