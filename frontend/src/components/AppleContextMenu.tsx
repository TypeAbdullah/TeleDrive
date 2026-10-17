import React from 'react';
import { Icon } from '@iconify/react';
import { TeleFile, TeleFolder } from '../types';

interface AppleContextMenuProps {
  x: number;
  y: number;
  item: TeleFile | TeleFolder | null;
  type: 'file' | 'folder';
  onClose: () => void;
  onQuickLook: (file: TeleFile) => void;
  onShare: (file: TeleFile) => void;
  onDownload: (file: TeleFile) => void;
  onStar: (file: TeleFile) => void;
  onRename: (item: TeleFile | TeleFolder, type: 'file' | 'folder') => void;
  onTrash: (item: TeleFile | TeleFolder, type: 'file' | 'folder') => void;
}

export const AppleContextMenu: React.FC<AppleContextMenuProps> = ({
  x,
  y,
  item,
  type,
  onClose,
  onQuickLook,
  onShare,
  onDownload,
  onStar,
  onRename,
  onTrash,
}) => {
  if (!item) return null;

  const isFile = type === 'file';
  const file = isFile ? (item as TeleFile) : null;

  const menuWidth = 190;
  const menuHeight = 220;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 20);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 20);

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      <div
        className="macos-context-menu"
        id="apple-context-menu"
        style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      >
        {isFile && file && (
          <>
            <button
              className="macos-menu-item"
              onClick={() => {
                onClose();
                onQuickLook(file);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon="lucide:eye" width="14" height="14" color="var(--apple-blue)" />
                <span>Quick Look</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Space</span>
            </button>

            <button
              className="macos-menu-item"
              onClick={() => {
                onClose();
                onShare(file);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon="lucide:share-2" width="14" height="14" color="var(--apple-teal)" />
                <span>Share...</span>
              </div>
            </button>

            <button
              className="macos-menu-item"
              onClick={() => {
                onClose();
                onDownload(file);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon icon="lucide:download" width="14" height="14" />
                <span>Download</span>
              </div>
            </button>

            <button
              className="macos-menu-item"
              onClick={() => {
                onClose();
                onStar(file);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon
                  icon="lucide:star"
                  width="14"
                  height="14"
                  color={file.isStarred ? 'var(--apple-yellow)' : 'var(--text-secondary)'}
                />
                <span>{file.isStarred ? 'Unstar' : 'Add to Starred'}</span>
              </div>
            </button>

            <div className="macos-menu-separator" />
          </>
        )}

        <button
          className="macos-menu-item"
          onClick={() => {
            onClose();
            onRename(item, type);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon icon="lucide:edit-3" width="14" height="14" />
            <span>Rename</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Return</span>
        </button>

        <div className="macos-menu-separator" />

        <button
          className="macos-menu-item"
          style={{ color: '#ff6961' }}
          onClick={() => {
            onClose();
            onTrash(item, type);
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon icon="lucide:trash-2" width="14" height="14" />
            <span>Move to Trash</span>
          </div>
          <span style={{ fontSize: '11px', color: '#ff6961', opacity: 0.7 }}>⌫</span>
        </button>
      </div>
    </>
  );
};
