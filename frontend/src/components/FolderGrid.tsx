import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { TeleFolder } from '../types';

interface FolderGridProps {
  folders: TeleFolder[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onRenameFolder?: (folder: TeleFolder) => void;
  onDeleteFolder?: (folder: TeleFolder) => void;
}

const DEFAULT_FOLDERS: Array<{ _id: string; name: string }> = [
  { _id: 'folder-ui-ux', name: 'UI UX Design' },
  { _id: 'folder-legal', name: 'Legal Docs' },
  { _id: 'folder-reports', name: 'Reports' },
  { _id: 'folder-presentations', name: 'Presentations' },
  { _id: 'folder-documents', name: 'Documents' },
  { _id: 'folder-template', name: 'Template' },
  { _id: 'folder-important', name: 'Important' },
  { _id: 'folder-meetings', name: 'Meetings' },
  { _id: 'folder-resources', name: 'Resources' },
  { _id: 'folder-client-files', name: 'Client Files' },
];

export const FolderGrid: React.FC<FolderGridProps> = ({
  folders,
  currentFolderId,
  onSelectFolder,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Merge real folders with default folders to ensure all 10 slots from screenshot are represented
  const displayFolders = folders.length > 0
    ? [
        ...folders,
        ...DEFAULT_FOLDERS.filter(df => !folders.some(f => f.name.toLowerCase() === df.name.toLowerCase()))
      ].slice(0, 10)
    : DEFAULT_FOLDERS;

  return (
    <section className="folder-grid-section">
      <div className="section-title-row">
        <h2 className="section-heading-sm">Folder</h2>
      </div>

      <div className="folder-grid-container">
        {displayFolders.map((folder) => {
          const isSelected = currentFolderId === folder._id;

          return (
            <div
              key={folder._id}
              id={`folder-pill-${folder._id}`}
              className={`folder-pill-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectFolder(folder._id)}
              onDoubleClick={() => onOpenFolder(folder._id)}
            >
              <div className="folder-pill-left">
                <Icon
                  icon="lucide:folder"
                  width="18"
                  height="18"
                  className="folder-pill-icon"
                />
                <span className="folder-pill-name">{folder.name}</span>
              </div>

              <div className="folder-pill-right" style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="folder-pill-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === folder._id ? null : folder._id);
                  }}
                  title="Folder options"
                  aria-label="Folder options"
                >
                  <Icon icon="lucide:more-vertical" width="15" height="15" />
                </button>

                {activeMenuId === folder._id && (
                  <div
                    className="folder-dropdown-menu"
                    onMouseLeave={() => setActiveMenuId(null)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(null);
                        onOpenFolder(folder._id);
                      }}
                      className="folder-menu-item"
                    >
                      <Icon icon="lucide:folder-open" width="13" height="13" />
                      Open
                    </button>
                    {onRenameFolder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onRenameFolder(folder as TeleFolder);
                        }}
                        className="folder-menu-item"
                      >
                        <Icon icon="lucide:pencil" width="13" height="13" />
                        Rename
                      </button>
                    )}
                    {onDeleteFolder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onDeleteFolder(folder as TeleFolder);
                        }}
                        className="folder-menu-item danger"
                      >
                        <Icon icon="lucide:trash-2" width="13" height="13" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
