import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { TeleFile } from '../types';

interface RecentFilesProps {
  files: TeleFile[];
  selectedFileId: string | null;
  onSelectFile: (file: TeleFile) => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
}

export const RecentFiles: React.FC<RecentFilesProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onUploadClick,
  onNewFolderClick,
}) => {
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);

  // Take first 5-8 files for recent showcase
  const recentFiles = files.slice(0, 8);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'lucide:image';
    if (mimeType.startsWith('video/')) return 'lucide:film';
    if (mimeType.startsWith('audio/')) return 'lucide:music';
    if (mimeType.includes('pdf')) return 'lucide:file-text';
    if (mimeType.includes('csv') || mimeType.includes('sheet')) return 'lucide:table';
    return 'lucide:file';
  };

  // Pastel gradient backgrounds for recent cards (matching colorful cards in screenshot)
  const getCardBg = (index: number) => {
    const gradients = [
      'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', // Indigo/violet
      'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', // Blue
      'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)', // Teal/cyan
      'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', // Amber
      'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', // Pink
    ];
    return gradients[index % gradients.length];
  };

  return (
    <section style={{ marginBottom: '28px' }}>
      {/* Header: Recent + "+ New" Button */}
      <div className="recent-section-header">
        <h2 className="section-heading">Recent</h2>

        <div style={{ position: 'relative' }}>
          <button
            id="btn-recent-new"
            onClick={() => setNewDropdownOpen(!newDropdownOpen)}
            className="btn-new-item"
          >
            <Icon icon="lucide:plus" width="16" height="16" />
            + New
          </button>

          {newDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '42px',
                width: '180px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                padding: '6px',
                zIndex: 50,
                animation: 'popIn 0.15s ease',
              }}
              onMouseLeave={() => setNewDropdownOpen(false)}
            >
              <button
                id="btn-dropdown-upload-files"
                onClick={() => {
                  setNewDropdownOpen(false);
                  onUploadClick();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Icon icon="lucide:upload" width="15" height="15" color="var(--primary-blue)" />
                Upload Files
              </button>

              <button
                id="btn-dropdown-new-folder"
                onClick={() => {
                  setNewDropdownOpen(false);
                  onNewFolderClick();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Icon icon="lucide:folder-plus" width="15" height="15" color="#059669" />
                New Folder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Cards Row */}
      {recentFiles.length === 0 ? (
        <div
          style={{
            padding: '24px',
            background: '#ffffff',
            border: '1px solid var(--border-light)',
            borderRadius: '12px',
            color: 'var(--text-dim)',
            fontSize: '13px',
            textAlign: 'center',
          }}
        >
          No recent files yet. Click <strong>+ New</strong> to upload files.
        </div>
      ) : (
        <div className="recent-cards-row">
          {recentFiles.map((file, idx) => {
            const isSelected = selectedFileId === file._id;
            const isImage = file.mimeType.startsWith('image/');

            return (
              <div
                key={file._id}
                id={`recent-card-${file._id}`}
                className={`recent-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectFile(file)}
              >
                {/* Card Top: Icon + Name */}
                <div className="recent-card-top">
                  <Icon icon={getFileIcon(file.mimeType)} width="15" height="15" color="#64748b" />
                  <span className="recent-card-title">{file.name}</span>
                </div>

                {/* Card Preview Banner */}
                <div className="recent-card-preview" style={{ background: isImage ? '#f8fafc' : getCardBg(idx) }}>
                  {isImage ? (
                    <img
                      src={`/api/v1/download/${file._id}`}
                      alt={file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <Icon icon={getFileIcon(file.mimeType)} width="28" height="28" color="#475569" />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                        {file.name.split('.').pop() || 'FILE'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
