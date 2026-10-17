import React from 'react';
import { Icon } from '@iconify/react';
import { TeleFile } from '../types';

interface ThreeDotContextMenuProps {
  file: TeleFile;
  isOpen: boolean;
  onClose: () => void;
  onOpen?: (file: TeleFile) => void;
  onDownload?: (file: TeleFile) => void;
  onShare?: (file: TeleFile) => void;
  onFavorite?: (file: TeleFile) => void;
  onRename?: (file: TeleFile) => void;
  onDelete?: (file: TeleFile) => void;
  onDetails?: (file: TeleFile) => void;
  anchorOrigin?: 'top-right' | 'bottom-right' | 'bottom-left';
}

export const ThreeDotContextMenu: React.FC<ThreeDotContextMenuProps> = ({
  file,
  isOpen,
  onClose,
  onOpen,
  onDownload,
  onShare,
  onFavorite,
  onRename,
  onDelete,
  onDetails,
  anchorOrigin = 'bottom-right',
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Invisible clickaway backdrop */}
      <div
        className="context-menu-backdrop"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      <div
        className={`cloudnest-context-popup ${anchorOrigin}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Open */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            if (onOpen) onOpen(file);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:eye" width="16" height="16" className="popup-item-icon" />
            <span>Open</span>
          </div>
          <span className="popup-item-shortcut">Enter</span>
        </button>

        {/* 2. Open in new tab */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            window.open(`/api/v1/download/${file._id}`, '_blank');
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:external-link" width="16" height="16" className="popup-item-icon" />
            <span>Open in new tab</span>
          </div>
          <span className="popup-item-shortcut">Ctrl + Enter</span>
        </button>

        {/* 3. Download */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            if (onDownload) onDownload(file);
            else window.open(`/api/v1/download/${file._id}`, '_blank');
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:download" width="16" height="16" className="popup-item-icon" />
            <span>Download</span>
          </div>
          <span className="popup-item-shortcut">Ctrl + S</span>
        </button>

        {/* 4. Share */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            if (onShare) onShare(file);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:share-2" width="16" height="16" className="popup-item-icon" />
            <span>Share</span>
          </div>
          <span className="popup-item-shortcut">Ctrl + Shift + S</span>
        </button>

        {/* 5. Add to favorites */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            if (onFavorite) onFavorite(file);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:star" width="16" height="16" className="popup-item-icon" />
            <span>Add to favorites</span>
          </div>
          <Icon icon="lucide:chevron-right" width="14" height="14" className="popup-item-chevron" />
        </button>

        {/* 6. Move to */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            alert(`Move ${file.name} to another folder`);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:folder" width="16" height="16" className="popup-item-icon" />
            <span>Move to</span>
          </div>
          <Icon icon="lucide:chevron-right" width="14" height="14" className="popup-item-chevron" />
        </button>

        {/* 7. Copy */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            navigator.clipboard?.writeText(file.name);
            alert(`Copied ${file.name} to clipboard`);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:copy" width="16" height="16" className="popup-item-icon" />
            <span>Copy</span>
          </div>
          <span className="popup-item-shortcut">Ctrl + C</span>
        </button>

        {/* 8. Rename */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            if (onRename) onRename(file);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:pencil" width="16" height="16" className="popup-item-icon" />
            <span>Rename</span>
          </div>
          <span className="popup-item-shortcut">F2</span>
        </button>

        {/* 9. Get link */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            navigator.clipboard?.writeText(window.location.origin + `/dl/${file._id}`);
            alert('File share link copied to clipboard');
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:link-2" width="16" height="16" className="popup-item-icon" />
            <span>Get link</span>
          </div>
        </button>

        {/* 10. Open with */}
        <button
          className="context-popup-item active-hover"
          onClick={() => {
            onClose();
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:layout-grid" width="16" height="16" className="popup-item-icon" />
            <span>Open with</span>
          </div>
          <Icon icon="lucide:chevron-right" width="14" height="14" className="popup-item-chevron" />
        </button>

        {/* 11. Compress */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            alert(`Compressing ${file.name} into ZIP archive...`);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:archive" width="16" height="16" className="popup-item-icon" />
            <span>Compress</span>
          </div>
          <Icon icon="lucide:chevron-right" width="14" height="14" className="popup-item-chevron" />
        </button>

        {/* 12. Details */}
        <button
          className="context-popup-item"
          onClick={() => {
            onClose();
            if (onDetails) onDetails(file);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:info" width="16" height="16" className="popup-item-icon" />
            <span>Details</span>
          </div>
          <span className="popup-item-shortcut">Ctrl + I</span>
        </button>

        <div className="context-popup-divider" />

        {/* 13. Delete (Red) */}
        <button
          className="context-popup-item danger"
          onClick={() => {
            onClose();
            if (onDelete) onDelete(file);
          }}
        >
          <div className="popup-item-left">
            <Icon icon="lucide:trash-2" width="16" height="16" className="popup-item-icon text-red" />
            <span>Delete</span>
          </div>
        </button>
      </div>
    </>
  );
};
