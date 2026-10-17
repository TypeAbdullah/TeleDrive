import React, { useState, useEffect } from 'react';
import {
  AppleFolderIcon,
  AppleFileIcon,
} from './AppleIcons';
import { TeleFile, TeleFolder, StorageStats } from '../types';

interface AppleFinderViewProps {
  viewMode: 'grid' | 'list';
  folders: TeleFolder[];
  files: TeleFile[];
  selectedId: string | null;
  onSelect: (id: string, type: 'file' | 'folder') => void;
  onOpenFolder: (folderId: string) => void;
  onQuickLook: (file: TeleFile) => void;
  onContextMenu: (e: React.MouseEvent, item: TeleFile | TeleFolder, type: 'file' | 'folder') => void;
  onDropFiles: (files: FileList) => void;
  storageStats: StorageStats | null;
  isLoading: boolean;
}

export const AppleFinderView: React.FC<AppleFinderViewProps> = ({
  viewMode,
  folders,
  files,
  selectedId,
  onSelect,
  onOpenFolder,
  onQuickLook,
  onContextMenu,
  onDropFiles,
  storageStats,
  isLoading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [iconScale, setIconScale] = useState(1); // Zoom slider (0.8x to 1.3x)

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '--';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileKind = (file: TeleFile) => {
    const ext = file.name.split('.').pop()?.toUpperCase() || 'DOCUMENT';
    if (file.mimeType.startsWith('image/')) return `${ext} Image`;
    if (file.mimeType.startsWith('video/')) return `${ext} Movie`;
    if (file.mimeType.startsWith('audio/')) return `${ext} Audio`;
    if (file.mimeType.includes('pdf')) return 'PDF Document';
    if (file.mimeType.includes('json') || file.mimeType.includes('javascript')) return 'Source Code';
    return `${ext} Document`;
  };

  // Keyboard Spacebar trigger for Quick Look
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedId) {
        const file = files.find((f) => f._id === selectedId);
        if (file) {
          e.preventDefault();
          onQuickLook(file);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, files, onQuickLook]);

  const totalItems = folders.length + files.length;
  const availableBytes = storageStats ? Math.max(0, storageStats.quotaBytes - storageStats.usedBytes) : 0;

  return (
    <main
      className="macos-canvas"
      id="apple-finder-canvas"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onDropFiles(e.dataTransfer.files);
        }
      }}
      onClick={(e) => {
        // Deselect if clicking on empty canvas
        if (e.target === e.currentTarget) {
          onSelect('', 'file');
        }
      }}
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 122, 255, 0.2)',
            backdropFilter: 'blur(8px)',
            border: '2px dashed var(--apple-blue)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            pointerEvents: 'none',
          }}
        >
          <AppleFolderIcon size={96} />
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>
            Drop files to upload to iCloud Drive
          </p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div style={{ padding: '30px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ width: '100px', height: '110px' }} className="skeleton" />
          ))}
        </div>
      ) : totalItems === 0 ? (
        /* Empty Folder State */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            color: 'var(--text-tertiary)',
          }}
        >
          <AppleFolderIcon size={80} withCloud={false} />
          <p style={{ fontSize: '15px', fontWeight: 500 }}>This folder is empty</p>
          <p style={{ fontSize: '12.5px' }}>Drag and drop files here to upload to Telegram MTProto storage</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── ICON / GRID VIEW ────────────────────────────────────────────── */
        <div className="macos-icon-grid">
          {/* Folders */}
          {folders.map((folder) => {
            const isSelected = selectedId === folder._id;
            return (
              <div
                key={folder._id}
                id={`folder-item-${folder._id}`}
                className={`macos-icon-item ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(folder._id, 'folder');
                }}
                onDoubleClick={() => onOpenFolder(folder._id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSelect(folder._id, 'folder');
                  onContextMenu(e, folder, 'folder');
                }}
              >
                <AppleFolderIcon size={Math.round(64 * iconScale)} color={folder.color} />
                <span className="macos-icon-label">{folder.name}</span>
              </div>
            );
          })}

          {/* Files */}
          {files.map((file) => {
            const isSelected = selectedId === file._id;
            return (
              <div
                key={file._id}
                id={`file-item-${file._id}`}
                className={`macos-icon-item ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(file._id, 'file');
                }}
                onDoubleClick={() => onQuickLook(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSelect(file._id, 'file');
                  onContextMenu(e, file, 'file');
                }}
              >
                <AppleFileIcon
                  mimeType={file.mimeType}
                  name={file.name}
                  size={Math.round(54 * iconScale)}
                />
                <span className="macos-icon-label">{file.name}</span>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ─────────────────────────────────────────────────── */
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <table className="macos-list-table">
            <thead>
              <tr className="macos-list-header">
                <th style={{ width: '45%' }}>Name</th>
                <th style={{ width: '22%' }}>Date Modified</th>
                <th style={{ width: '13%' }}>Size</th>
                <th style={{ width: '20%' }}>Kind</th>
              </tr>
            </thead>
            <tbody>
              {/* Folders */}
              {folders.map((folder) => {
                const isSelected = selectedId === folder._id;
                return (
                  <tr
                    key={folder._id}
                    className={`macos-list-row ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(folder._id, 'folder');
                    }}
                    onDoubleClick={() => onOpenFolder(folder._id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onSelect(folder._id, 'folder');
                      onContextMenu(e, folder, 'folder');
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AppleFolderIcon size={20} color={folder.color} withCloud={false} />
                        <span style={{ fontWeight: 500, color: '#fff' }}>{folder.name}</span>
                      </div>
                    </td>
                    <td>{formatDate(folder.updatedAt || folder.createdAt)}</td>
                    <td>--</td>
                    <td>Folder</td>
                  </tr>
                );
              })}

              {/* Files */}
              {files.map((file) => {
                const isSelected = selectedId === file._id;
                return (
                  <tr
                    key={file._id}
                    className={`macos-list-row ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(file._id, 'file');
                    }}
                    onDoubleClick={() => onQuickLook(file)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onSelect(file._id, 'file');
                      onContextMenu(e, file, 'file');
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AppleFileIcon mimeType={file.mimeType} name={file.name} size={18} />
                        <span style={{ fontWeight: 450 }}>{file.name}</span>
                      </div>
                    </td>
                    <td>{formatDate(file.updatedAt || file.createdAt)}</td>
                    <td>{formatBytes(file.size)}</td>
                    <td>{getFileKind(file)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── macOS Finder Bottom Status Bar ───────────────────────────────── */}
      <footer className="macos-status-bar" id="apple-finder-status-bar">
        <div>
          {totalItems} {totalItems === 1 ? 'item' : 'items'}, {formatBytes(availableBytes)} available on iCloud Drive
        </div>

        {/* Zoom Slider in Icon View */}
        {viewMode === 'grid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px' }}>A</span>
            <input
              type="range"
              min="0.75"
              max="1.35"
              step="0.05"
              value={iconScale}
              onChange={(e) => setIconScale(parseFloat(e.target.value))}
              style={{
                width: '75px',
                height: '3px',
                accentColor: 'var(--apple-blue)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: '13px' }}>A</span>
          </div>
        )}
      </footer>
    </main>
  );
};
