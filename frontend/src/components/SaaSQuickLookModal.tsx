import React from 'react';
import { Icon } from '@iconify/react';
import { TeleFile } from '../types';

interface SaaSQuickLookModalProps {
  file: TeleFile | null;
  onClose: () => void;
  onShare: (file: TeleFile) => void;
}

export const SaaSQuickLookModal: React.FC<SaaSQuickLookModalProps> = ({ file, onClose, onShare }) => {
  if (!file) return null;

  const downloadUrl = `/api/v1/download/${file._id}`;
  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const isAudio = file.mimeType.startsWith('audio/');
  const isPDF = file.mimeType.includes('pdf');

  return (
    <div className="saas-modal-overlay" onClick={onClose}>
      <div
        className="saas-modal-card"
        style={{ maxWidth: '820px', padding: '0', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon icon="lucide:file" width="18" height="18" color="var(--primary-blue)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>{file.name}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onShare(file)}
              className="btn-ghost-secondary"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
            >
              <Icon icon="lucide:share-2" width="14" height="14" />
              Share
            </button>
            <a
              href={downloadUrl}
              download={file.name}
              className="btn-primary-blue"
              style={{ textDecoration: 'none', padding: '6px 14px', fontSize: '12.5px' }}
            >
              <Icon icon="lucide:download" width="14" height="14" />
              Download
            </a>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              <Icon icon="lucide:x" width="18" height="18" color="#64748b" />
            </button>
          </div>
        </div>

        {/* Media Preview Body */}
        <div
          style={{
            padding: '24px',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            maxHeight: '65vh',
            overflow: 'hidden',
          }}
        >
          {isImage ? (
            <img
              src={downloadUrl}
              alt={file.name}
              style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          ) : isVideo ? (
            <video
              src={downloadUrl}
              controls
              autoPlay
              style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px' }}
            />
          ) : isAudio ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <Icon icon="lucide:music" width="64" height="64" color="var(--primary-blue)" />
              <audio src={downloadUrl} controls autoPlay style={{ width: '320px' }} />
            </div>
          ) : isPDF ? (
            <iframe src={downloadUrl} title={file.name} style={{ width: '100%', height: '60vh', border: 'none' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Icon icon="lucide:file-text" width="64" height="64" color="#64748b" />
              <p style={{ fontWeight: 600, fontSize: '16px' }}>{file.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
