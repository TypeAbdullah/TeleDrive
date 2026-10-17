import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { FolderCardIcon } from './FolderCardIcon';
import { TeleFolder } from '../types';

interface FolderItem {
  id: string;
  name: string;
  itemCount: number;
  modified: string;
  iconName: string;
}

const DEFAULT_15_FOLDERS: FolderItem[] = [
  { id: 'f-design', name: 'Design', itemCount: 12, modified: '2 days ago', iconName: 'lucide:image' },
  { id: 'f-dev', name: 'Development', itemCount: 8, modified: '5 days ago', iconName: 'lucide:code-2' },
  { id: 'f-personal', name: 'Personal', itemCount: 21, modified: '1 week ago', iconName: 'lucide:user' },
  { id: 'f-work', name: 'Work', itemCount: 14, modified: '3 days ago', iconName: 'lucide:briefcase' },
  { id: 'f-school', name: 'School', itemCount: 9, modified: '6 days ago', iconName: 'lucide:graduation-cap' },
  { id: 'f-anime', name: 'Anime', itemCount: 32, modified: '2 days ago', iconName: 'lucide:tv' },
  { id: 'f-music', name: 'Music', itemCount: 18, modified: '4 days ago', iconName: 'lucide:music' },
  { id: 'f-movies', name: 'Movies', itemCount: 27, modified: '5 days ago', iconName: 'lucide:play' },
  { id: 'f-wallpapers', name: 'Wallpapers', itemCount: 16, modified: '3 days ago', iconName: 'lucide:image-plus' },
  { id: 'f-games', name: 'Games', itemCount: 11, modified: '1 week ago', iconName: 'lucide:gamepad-2' },
  { id: 'f-projects', name: 'Projects', itemCount: 6, modified: '2 days ago', iconName: 'lucide:folder' },
  { id: 'f-backup', name: 'Backup', itemCount: 13, modified: '4 days ago', iconName: 'lucide:cloud-upload' },
  { id: 'f-archive', name: 'Archive', itemCount: 9, modified: '5 days ago', iconName: 'lucide:archive' },
  { id: 'f-downloads', name: 'Downloads', itemCount: 25, modified: '6 days ago', iconName: 'lucide:download' },
  { id: 'f-misc', name: 'Misc', itemCount: 7, modified: '1 week ago', iconName: 'lucide:more-horizontal' },
];

interface FoldersViewProps {
  realFolders: TeleFolder[];
  onOpenFolder: (folderId: string) => void;
  onNewFolderClick: () => void;
  onUploadClick: () => void;
  onRenameFolder?: (folder: TeleFolder) => void;
  onDeleteFolder?: (folder: TeleFolder) => void;
}

export const FoldersView: React.FC<FoldersViewProps> = ({
  realFolders,
  onOpenFolder,
  onNewFolderClick,
  onUploadClick,
  onRenameFolder,
  onDeleteFolder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOption, setSortOption] = useState<'name' | 'modified' | 'items'>('name');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Merge real folders with default 15 folders
  const allFolders: FolderItem[] = [
    ...realFolders.map((rf, idx) => ({
      id: rf._id,
      name: rf.name,
      itemCount: 4 + (idx % 12),
      modified: 'Just now',
      iconName: 'lucide:folder',
    })),
    ...DEFAULT_15_FOLDERS.filter(
      (df) => !realFolders.some((rf) => rf.name.toLowerCase() === df.name.toLowerCase())
    ),
  ];

  const filteredFolders = allFolders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="folders-view-container">
      {/* Top Header Bar */}
      <header className="folders-view-topbar">
        {/* Search Bar */}
        <div className="folders-search-wrapper">
          <Icon icon="lucide:search" width="16" height="16" className="search-icon" />
          <input
            type="text"
            className="folders-search-input"
            placeholder="Search folders, files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="search-clear-btn"
              title="Clear"
            >
              <Icon icon="lucide:x" width="13" height="13" />
            </button>
          )}
        </div>

        {/* Top Right Actions */}
        <div className="folders-topbar-actions">
          <button className="btn-header-icon" title="Notifications">
            <Icon icon="lucide:bell" width="18" height="18" />
          </button>

          <button
            id="btn-folders-new-folder"
            className="btn-primary-dark"
            onClick={onNewFolderClick}
          >
            <Icon icon="lucide:folder-plus" width="16" height="16" />
            <span>New Folder</span>
          </button>

          <button
            id="btn-folders-upload"
            className="btn-outline-white"
            onClick={onUploadClick}
          >
            <Icon icon="lucide:upload" width="15" height="15" />
            <span>Upload</span>
          </button>
        </div>
      </header>

      {/* Folders View Title & Controls Bar */}
      <div className="folders-page-header">
        <div className="folders-title-group">
          {/* Yellow Folder Badge */}
          <div className="folders-header-badge">
            <Icon icon="lucide:folder" width="22" height="22" color="#ffffff" />
          </div>
          <div>
            <h1 className="folders-page-title">Folders</h1>
            <p className="folders-page-subtitle">Organize your files with folders.</p>
          </div>
        </div>

        {/* Right Sorting & View Mode Buttons */}
        <div className="folders-header-controls">
          {/* Sort Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="folders-control-btn"
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
            >
              <Icon icon="lucide:arrow-up-down" width="14" height="14" />
              <span>Sort</span>
              <Icon icon="lucide:chevron-down" width="13" height="13" color="#9ca3af" />
            </button>

            {sortMenuOpen && (
              <div
                className="filter-popover"
                onMouseLeave={() => setSortMenuOpen(false)}
              >
                <div className="filter-header">Sort By</div>
                <button
                  className={`filter-item ${sortOption === 'name' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('name');
                    setSortMenuOpen(false);
                  }}
                >
                  Name (A-Z)
                </button>
                <button
                  className={`filter-item ${sortOption === 'modified' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('modified');
                    setSortMenuOpen(false);
                  }}
                >
                  Date Modified
                </button>
                <button
                  className={`filter-item ${sortOption === 'items' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('items');
                    setSortMenuOpen(false);
                  }}
                >
                  Item Count
                </button>
              </div>
            )}
          </div>

          {/* View Dropdown */}
          <button className="folders-control-btn">
            <Icon icon="lucide:layout-grid" width="14" height="14" />
            <span>View</span>
            <Icon icon="lucide:chevron-down" width="13" height="13" color="#9ca3af" />
          </button>

          {/* Grid / List Mode Switcher */}
          <div className="folders-view-switcher">
            <button
              className={`switcher-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Icon icon="lucide:layout-grid" width="15" height="15" />
            </button>
            <button
              className={`switcher-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <Icon icon="lucide:list" width="15" height="15" />
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="folders-breadcrumbs">
        <span className="crumb-root">All Files</span>
        <Icon icon="lucide:chevron-right" width="13" height="13" color="#9ca3af" />
        <span className="crumb-active">Folders</span>
      </div>

      {/* Folder Cards Grid */}
      <div className="folders-grid-layout">
        {filteredFolders.map((folder) => (
          <div
            key={folder.id}
            id={`folder-card-${folder.id}`}
            className="folder-large-card"
            onClick={() => onOpenFolder(folder.id)}
          >
            {/* Top row with options 3-dots */}
            <div className="folder-card-top" style={{ position: 'relative' }}>
              <button
                className="folder-more-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === folder.id ? null : folder.id);
                }}
                title="Options"
              >
                <Icon icon="lucide:more-vertical" width="16" height="16" />
              </button>

              {activeMenuId === folder.id && (
                <div
                  className="folder-dropdown-menu"
                  onMouseLeave={() => setActiveMenuId(null)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      onOpenFolder(folder.id);
                    }}
                    className="folder-menu-item"
                  >
                    <Icon icon="lucide:folder-open" width="13" height="13" />
                    Open
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      if (onRenameFolder) {
                        onRenameFolder({
                          _id: folder.id,
                          name: folder.name,
                          userId: 'user-me',
                          parentId: null,
                          color: '#f59e0b',
                          isTrash: false,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className="folder-menu-item"
                  >
                    <Icon icon="lucide:pencil" width="13" height="13" />
                    Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(null);
                      if (onDeleteFolder) {
                        onDeleteFolder({
                          _id: folder.id,
                          name: folder.name,
                          userId: 'user-me',
                          parentId: null,
                          color: '#f59e0b',
                          isTrash: false,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        });
                      }
                    }}
                    className="folder-menu-item danger"
                  >
                    <Icon icon="lucide:trash-2" width="13" height="13" />
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Folder Graphic with Custom Badge */}
            <div className="folder-card-graphic-wrap">
              <FolderCardIcon iconName={folder.iconName} width={100} height={76} />
            </div>

            {/* Folder Name & Info */}
            <div className="folder-card-info">
              <h3 className="folder-card-name">{folder.name}</h3>
              <p className="folder-card-meta">
                {folder.itemCount} items · Modified {folder.modified}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info & Pagination */}
      <div className="folders-view-footer">
        <span className="folders-count-text">
          Showing {filteredFolders.length} folders
        </span>

        <div className="folders-pagination">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <Icon icon="lucide:chevron-left" width="14" height="14" />
          </button>
          <button
            className={`pagination-btn ${currentPage === 1 ? 'active' : ''}`}
            onClick={() => setCurrentPage(1)}
          >
            1
          </button>
          <button
            className={`pagination-btn ${currentPage === 2 ? 'active' : ''}`}
            onClick={() => setCurrentPage(2)}
          >
            2
          </button>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            <Icon icon="lucide:chevron-right" width="14" height="14" />
          </button>
        </div>
      </div>
    </div>
  );
};
