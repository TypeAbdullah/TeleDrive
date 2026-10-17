import React from 'react';
import { Icon } from '@iconify/react';
import { AppleFileIcon } from './AppleIcons';
import { TeleFile } from '../types';

interface QuickLookModalProps {
  file: TeleFile | null;
  onClose: () => void;
  onShare: (file: TeleFile) => void;
}

export const QuickLookModal: React.FC<QuickLookModalProps> = ({ file, onClose, onShare }) => {
  if (!file) return null;

  const downloadUrl = `/api/v1/download/${file._id}`;
  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isPDF = file.mimeType.includes('pdf');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      className="macos-quicklook-overlay"
      id="quicklook-modal-overlay"
      onClick={onClose}
    >
      <div
        className="macos-quicklook-window"
        id="quicklook-modal-window"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Quick Look Header */}
        <div className="macos-quicklook-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              className="macos-btn macos-btn-icon"
              style={{ width: '24px', height: '24px' }}
              title="Close (Esc)"
            >
              <Icon icon="lucide:x" width="14" height="14" />
            </button>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              {file.name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onShare(file)}
              className="macos-btn"
              title="Share"
            >
              <Icon icon="lucide:share-2" width="13" height="13" color="var(--apple-blue)" />
              Share
            </button>

            <a
              href={downloadUrl}
              download={file.name}
              className="macos-btn macos-btn-primary"
              style={{ textDecoration: 'none' }}
              title="Download file"
            >
              <Icon icon="lucide:download" width="13" height="13" />
              Download
            </a>

            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="macos-btn macos-btn-icon"
              title="Open in new window"
            >
              <Icon icon="lucide:external-link" width="13" height="13" />
            </a>
          </div>
        </div>

        {/* Content Viewer */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            minHeight: '380px',
            background: 'rgba(15, 15, 18, 0.9)',
            overflow: 'hidden',
          }}
        >
          {isImage ? (
            <img
              src={downloadUrl}
              alt={file.name}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              }}
            />
          ) : isVideo ? (
            <video
              src={downloadUrl}
              controls
              autoPlay
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                borderRadius: '8px',
                outline: 'none',
              }}
            />
          ) : isAudio ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                width: '100%',
                maxWidth: '440px',
              }}
            >
              <AppleFileIcon mimeType={file.mimeType} name={file.name} size={90} />
              <p style={{ fontSize: '16px', fontWeight: 600 }}>{file.name}</p>
              <audio src={downloadUrl} controls autoPlay style={{ width: '100%' }} />
            </div>
          ) : isPDF ? (
            <iframe
              src={downloadUrl}
              title={file.name}
              style={{
                width: '100%',
                height: '60vh',
                border: 'none',
                borderRadius: '8px',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                textAlign: 'center',
              }}
            >
              <AppleFileIcon mimeType={file.mimeType} name={file.name} size={110} />
              <div>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                  {file.name}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {formatBytes(file.size)} • {file.mimeType}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(28, 28, 30, 0.95)',
            borderTop: '1px solid var(--macos-border-subtle)',
            fontSize: '11.5px',
            color: 'var(--text-tertiary)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>Stored on Telegram MTProto Storage</span>
          <span>{formatBytes(file.size)}</span>
        </div>
      </div>
    </div>
  );
};
