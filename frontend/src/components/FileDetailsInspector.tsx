import React from 'react';
import { Icon } from '@iconify/react';
import { TeleFile } from '../types';

interface FileDetailsInspectorProps {
  file: TeleFile | null;
  onClose: () => void;
  onManageAccess: (file: TeleFile) => void;
  onQuickLook: (file: TeleFile) => void;
}

export const FileDetailsInspector: React.FC<FileDetailsInspectorProps> = ({
  file,
  onClose,
  onManageAccess,
  onQuickLook,
}) => {
  if (!file) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Today';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isImage = file.mimeType.startsWith('image/');
  const isVideo = file.mimeType.startsWith('video/');
  const downloadUrl = `/api/v1/download/${file._id}`;

  const getFileTypeString = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.includes('pdf')) return 'PDF Document';
    if (mimeType.includes('csv') || mimeType.includes('sheet')) return 'Spreadsheet';
    return 'Document';
  };

  return (
    <aside className="app-inspector" id="file-details-inspector">
      {/* Header: File Name + Close Button */}
      <div className="inspector-header">
        <h3 className="inspector-title" title={file.name}>
          {file.name}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
        >
          <Icon icon="lucide:x" width="18" height="18" color="#64748b" />
        </button>
      </div>

      {/* Hero Thumbnail Preview Card */}
      <div className="inspector-hero-card">
        {isImage ? (
          <img
            src={downloadUrl}
            alt={file.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : isVideo ? (
          <video
            src={downloadUrl}
            controls
            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Icon icon="lucide:file-text" width="48" height="48" color="#3b82f6" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              {file.name.split('.').pop() || 'FILE'}
            </span>
          </div>
        )}
      </div>

      {/* Who Has Access Section */}
      <div className="access-section">
        <h4 className="access-header">Who has access</h4>
        <div className="access-avatars-row">
          <div className="avatar-stack">
            <div className="stacked-avatar" style={{ background: '#dc2626' }}>SA</div>
            <div className="stacked-avatar" style={{ background: '#f59e0b' }}>JS</div>
            <div className="stacked-avatar" style={{ background: '#7c3aed' }}>FR</div>
            <div className="stacked-avatar" style={{ background: '#334155' }}>JB</div>
          </div>

          <button
            id="btn-manage-access"
            onClick={() => onManageAccess(file)}
            className="btn-manage-access"
          >
            <Icon icon="lucide:key" width="13" height="13" color="#2563eb" />
            Manage access
          </button>
        </div>
      </div>

      {/* File Details Section */}
      <div>
        <h4 className="details-section-heading">File details</h4>

        <div className="detail-row">
          <span className="detail-label">Location</span>
          <span className="detail-value">My Files</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Type</span>
          <span className="detail-value">{getFileTypeString(file.mimeType)}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Size</span>
          <span className="detail-value">{formatBytes(file.size)}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Owner</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            <div className="owner-avatar-sm" style={{ background: '#7c3aed' }}>FR</div>
            <span className="detail-value">Furuya Rei</span>
          </div>
        </div>

        <div className="detail-row">
          <span className="detail-label">Modified</span>
          <span className="detail-value">{formatDate(file.updatedAt || file.createdAt)} by Furuya Rei</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Created</span>
          <span className="detail-value">{formatDate(file.createdAt)}</span>
        </div>
      </div>

      {/* Bottom Actions */}
      <div style={{ marginTop: 'auto', paddingTop: '16px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onQuickLook(file)}
          className="btn-ghost-secondary"
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Icon icon="lucide:eye" width="15" height="15" />
          Preview
        </button>

        <a
          href={downloadUrl}
          download={file.name}
          className="btn-primary-blue"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            textDecoration: 'none',
          }}
        >
          <Icon icon="lucide:download" width="15" height="15" />
          Download
        </a>
      </div>
    </aside>
  );
};
