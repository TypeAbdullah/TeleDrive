import React from 'react';

/**
 * Authentic Apple macOS Blue Folder with 3D gradient, folder tab, embossed depth, and optional cloud badge.
 */
export const AppleFolderIcon: React.FC<{ size?: number; color?: string; withCloud?: boolean }> = ({
  size = 64,
  color = '#258cfb',
  withCloud = true,
}) => {
  const width = size;
  const height = (size * 52) / 64;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 64 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.28))', flexShrink: 0 }}
    >
      <defs>
        {/* Back tab gradient */}
        <linearGradient id={`folderBack_${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#258cfb" />
          <stop offset="100%" stopColor="#146ecc" />
        </linearGradient>

        {/* Front flap gradient */}
        <linearGradient id={`folderFront_${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5bb1ff" />
          <stop offset="28%" stopColor="#3199ff" />
          <stop offset="100%" stopColor="#0c70db" />
        </linearGradient>

        {/* Top highlight line */}
        <linearGradient id={`folderHighlight_${size}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
        </linearGradient>

        {/* Folder inner paper/divider */}
        <linearGradient id={`folderInner_${size}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c5e4ff" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Back flap with tab */}
      <path
        d="M5 6C5 3.79086 6.79086 2 9 2H22.5C24.3 2 25.9 2.9 26.8 4.4L29.2 8H55C57.2091 8 59 9.79086 59 12V42C59 44.2091 57.2091 46 55 46H9C6.79086 46 5 44.2091 5 42V6Z"
        fill={`url(#folderBack_${size})`}
      />

      {/* Inner subtle paper rim */}
      <rect x="9" y="11" width="46" height="10" rx="2" fill={`url(#folderInner_${size})`} />

      {/* Front flap */}
      <path
        d="M2.5 15.5C2.5 13.567 4.067 12 6 12H58C59.933 12 61.5 13.567 61.5 15.5V44.5C61.5 47.5376 59.0376 50 56 50H8C4.96243 50 2.5 47.5376 2.5 44.5V15.5Z"
        fill={`url(#folderFront_${size})`}
      />

      {/* Top bevel highlight */}
      <path
        d="M6 13H58C59.3807 13 60.5 14.1193 60.5 15.5C60.5 15.7761 60.2761 16 60 16H4C3.72386 16 3.5 15.7761 3.5 15.5C3.5 14.1193 4.61929 13 6 13Z"
        fill={`url(#folderHighlight_${size})`}
        opacity="0.6"
      />

      {/* Embossed iCloud Cloud logo in center */}
      {withCloud && (
        <path
          d="M38.5 34C40.9853 34 43 31.9853 43 29.5C43 27.2346 41.3235 25.3582 39.1396 25.0456C38.6482 21.6429 35.7314 19 32.2 19C29.2131 19 26.6698 20.9103 25.7262 23.6339C25.3262 23.5463 24.9107 23.5 24.4848 23.5C21.7318 23.5 19.5 25.7318 19.5 28.4848C19.5 28.6186 19.5053 28.7512 19.5157 28.8824C18.0645 29.6206 17 31.1895 17 33C17 35.4853 19.0147 37.5 21.5 37.5H38.5C40.433 37.5 42 35.933 42 34H38.5Z"
          fill="rgba(255, 255, 255, 0.45)"
          transform="scale(0.8) translate(8, 5)"
        />
      )}
    </svg>
  );
};

/**
 * Authentic Apple iCloud Cloud Icon
 */
export const AppleCloudIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({
  size = 28,
  className = '',
  color = '#007aff',
}) => {
  return (
    <svg
      width={size}
      height={(size * 20) / 28}
      viewBox="0 0 28 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M21.5 19C24.5376 19 27 16.5376 27 13.5C27 10.6691 24.8624 8.3371 22.0911 8.03362C21.3932 3.51351 17.5025 0 12.8 0C8.63665 0 5.10515 2.76612 3.96695 6.63462C3.48624 6.54583 2.99126 6.5 2.48485 6.5C1.11243 6.5 0 7.61243 0 8.98485C0 9.07684 0.00511195 9.16781 0.0152003 9.25732C-0.00511195 9.50153 0 9.74786 0 10C0 14.9706 4.02944 19 9 19H21.5Z"
        fill="url(#appleCloudGradient)"
      />
      <defs>
        <linearGradient id="appleCloudGradient" x1="0" y1="0" x2="27" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#41a4ff" />
          <stop offset="1" stopColor="#0066eb" />
        </linearGradient>
      </defs>
    </svg>
  );
};

/**
 * macOS Window Traffic Light Controls (Close, Minimize, Maximize)
 */
export const TrafficLights: React.FC<{
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}> = ({ onClose, onMinimize, onMaximize }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 4px',
      }}
      className="traffic-lights-group"
    >
      <button
        onClick={onClose}
        title="Close"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#ff5f56',
          border: '0.5px solid rgba(0,0,0,0.2)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
          cursor: 'pointer',
          padding: 0,
        }}
      />
      <button
        onClick={onMinimize}
        title="Minimize"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#ffbd2e',
          border: '0.5px solid rgba(0,0,0,0.2)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
          cursor: 'pointer',
          padding: 0,
        }}
      />
      <button
        onClick={onMaximize}
        title="Full Screen"
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#27c93f',
          border: '0.5px solid rgba(0,0,0,0.2)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.4)',
          cursor: 'pointer',
          padding: 0,
        }}
      />
    </div>
  );
};

/**
 * Authentic Apple macOS Document File Icon with dog-ear fold and type badge
 */
export const AppleFileIcon: React.FC<{
  mimeType: string;
  name: string;
  size?: number;
}> = ({ mimeType, name, size = 60 }) => {
  const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
  const width = size;
  const height = (size * 74) / 60;

  // Determine kind styling
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');
  const isPDF = mimeType.includes('pdf') || ext === 'PDF';
  const isCode =
    mimeType.includes('json') ||
    mimeType.includes('javascript') ||
    mimeType.includes('typescript') ||
    ['JS', 'TS', 'JSON', 'PY', 'HTML', 'CSS', 'RS', 'GO'].includes(ext);
  const isArchive =
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    ['ZIP', 'TAR', 'GZ', '7Z'].includes(ext);

  let badgeColor = '#6c757d';
  let badgeGradient = ['#71717a', '#52525b'];

  if (isImage) {
    badgeColor = '#007aff';
    badgeGradient = ['#38bdf8', '#0284c7'];
  } else if (isVideo) {
    badgeColor = '#8b5cf6';
    badgeGradient = ['#a855f7', '#7e22ce'];
  } else if (isAudio) {
    badgeColor = '#ec4899';
    badgeGradient = ['#f472b6', '#db2777'];
  } else if (isPDF) {
    badgeColor = '#ef4444';
    badgeGradient = ['#f87171', '#dc2626'];
  } else if (isCode) {
    badgeColor = '#10b981';
    badgeGradient = ['#34d399', '#059669'];
  } else if (isArchive) {
    badgeColor = '#f59e0b';
    badgeGradient = ['#fbbf24', '#d97706'];
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 60 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 3px 7px rgba(0, 0, 0, 0.25))', flexShrink: 0 }}
    >
      <defs>
        {/* Paper sheet gradient */}
        <linearGradient id={`docSheet_${size}_${ext}`} x1="0" y1="0" x2="60" y2="74" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdfdfd" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>

        {/* Fold triangle shadow */}
        <linearGradient id={`docFold_${size}_${ext}`} x1="42" y1="0" x2="60" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Badge gradient */}
        <linearGradient id={`badgeGrad_${size}_${ext}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={badgeGradient[0]} />
          <stop offset="100%" stopColor={badgeGradient[1]} />
        </linearGradient>
      </defs>

      {/* Main Paper Body with Top-Right Fold cut */}
      <path
        d="M6 3C6 1.34315 7.34315 0 9 0H42L58 16V71C58 72.6569 56.6569 74 55 74H9C7.34315 74 6 72.6569 6 71V3Z"
        fill={`url(#docSheet_${size}_${ext})`}
      />

      {/* Dog-ear fold */}
      <path
        d="M42 0V13C42 14.6569 43.3431 16 45 16H58L42 0Z"
        fill={`url(#docFold_${size}_${ext})`}
        opacity="0.9"
      />

      {/* Fold shadow rim */}
      <path d="M42 0L42 16L58 16" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

      {/* Center preview graphic based on type */}
      {isImage ? (
        <g transform="translate(14, 24)">
          <rect width="32" height="22" rx="3" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="10" cy="7" r="3" fill="#38bdf8" />
          <path d="M5 19L14 11L21 16L27 12L31 16V19H5Z" fill="#0284c7" />
        </g>
      ) : isVideo ? (
        <g transform="translate(14, 24)">
          <rect width="32" height="22" rx="3" fill="#27272a" />
          <polygon points="13,6 13,16 22,11" fill="#c084fc" />
        </g>
      ) : isAudio ? (
        <g transform="translate(18, 24)">
          <path
            d="M5 18V6L19 3V15M5 18C5 19.6569 3.65685 21 2 21C0.343146 21 -1 19.6569 -1 18C-1 16.3431 0.343146 15 2 15C3.65685 15 5 16.3431 5 18ZM19 15C19 16.6569 17.6569 18 16 18C14.3431 18 13 16.6569 13 15C13 13.3431 14.3431 12 16 12C17.6569 12 19 13.3431 19 15Z"
            fill="#ec4899"
          />
        </g>
      ) : isCode ? (
        <g transform="translate(16, 26)">
          <text x="0" y="14" fill="#059669" fontFamily="monospace" fontSize="13" fontWeight="bold">
            &lt;/&gt;
          </text>
        </g>
      ) : (
        /* Subtle document lines */
        <g transform="translate(14, 25)" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
          <line x1="0" y1="0" x2="32" y2="0" />
          <line x1="0" y1="6" x2="28" y2="6" />
          <line x1="0" y1="12" x2="32" y2="12" />
          <line x1="0" y1="18" x2="18" y2="18" />
        </g>
      )}

      {/* Extension badge pill at bottom */}
      <rect
        x="9"
        y="54"
        width="42"
        height="14"
        rx="3"
        fill={`url(#badgeGrad_${size}_${ext})`}
      />
      <text
        x="30"
        y="64.5"
        fill="#ffffff"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
        fontSize="8.5"
        fontWeight="bold"
        textAnchor="middle"
        letterSpacing="0.04em"
      >
        {ext.slice(0, 5)}
      </text>
    </svg>
  );
};
