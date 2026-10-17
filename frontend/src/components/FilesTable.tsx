import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { TeleFile } from '../types';
import { ThreeDotContextMenu } from './ThreeDotContextMenu';

export interface SharedUser {
  name: string;
  avatarBg: string;
  avatarUrl?: string;
}

export type FilesTableItem = TeleFile & {
  sharedBy?: SharedUser;
};

interface FilesTableProps {
  files: FilesTableItem[];
  selectedId: string | null;
  onSelect: (item: TeleFile, type: 'file') => void;
  onQuickLook: (file: TeleFile) => void;
  onShare: (file: TeleFile) => void;
  onDownload: (file: TeleFile) => void;
  onRename: (item: TeleFile, type: 'file') => void;
  onTrash: (item: TeleFile, type: 'file') => void;
  onMakeCopy?: (file: TeleFile) => void;
  onOpenDetails?: (file: TeleFile) => void;
}

export const DEFAULT_SCREENSHOT_FILES: FilesTableItem[] = [
  {
    _id: 'sample-file-1',
    userId: 'user-devon',
    folderId: null,
    name: 'Design_Campaign.photo.JPG',
    size: 3.0 * 1024 * 1024 * 1024,
    mimeType: 'image/jpeg',
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: '2020-06-11T10:00:00.000Z',
    updatedAt: '2020-06-11T10:00:00.000Z',
    sharedBy: {
      name: 'Devon Lane',
      avatarBg: '#3b82f6',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
    },
  },
  {
    _id: 'sample-file-2',
    userId: 'user-ronald',
    folderId: null,
    name: 'Design_Illustrator.ZIP',
    size: 4.2 * 1024 * 1024 * 1024,
    mimeType: 'application/zip',
    status: 'ready',
    isStarred: true,
    isTrash: false,
    createdAt: '2020-06-10T11:30:00.000Z',
    updatedAt: '2020-06-10T11:30:00.000Z',
    sharedBy: {
      name: 'Ronald Richards',
      avatarBg: '#10b981',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80',
    },
  },
  {
    _id: 'sample-file-3',
    userId: 'user-courtney',
    folderId: null,
    name: 'Design_Canva.Video.MKV',
    size: 2.2 * 1024 * 1024 * 1024,
    mimeType: 'video/x-matroska',
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: '2020-06-09T14:20:00.000Z',
    updatedAt: '2020-06-09T14:20:00.000Z',
    sharedBy: {
      name: 'Courtney Henry',
      avatarBg: '#f59e0b',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80',
    },
  },
  {
    _id: 'sample-file-4',
    userId: 'user-natasya',
    folderId: null,
    name: 'Design_Figma.file.FIG',
    size: 4.3 * 1024 * 1024 * 1024,
    mimeType: 'application/octet-stream',
    status: 'ready',
    isStarred: true,
    isTrash: false,
    createdAt: '2020-06-08T09:15:00.000Z',
    updatedAt: '2020-06-08T09:15:00.000Z',
    sharedBy: {
      name: 'Natasya Tailor',
      avatarBg: '#ec4899',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80',
    },
  },
  {
    _id: 'sample-file-5',
    userId: 'user-melina',
    folderId: null,
    name: 'Canva.Stock.photo.JPG',
    size: 2.7 * 1024 * 1024 * 1024,
    mimeType: 'image/jpeg',
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: '2020-06-07T16:45:00.000Z',
    updatedAt: '2020-06-07T16:45:00.000Z',
    sharedBy: {
      name: 'Melina Sofia',
      avatarBg: '#8b5cf6',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80',
    },
  },
];

export const FilesTable: React.FC<FilesTableProps> = ({
  files,
  selectedId,
  onSelect,
  onQuickLook,
  onShare,
  onDownload,
  onRename,
  onTrash,
  onMakeCopy,
  onOpenDetails,
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'starred'>('recent');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  
  // Default open action menu on 2nd file (Ronald Richards / Design_Illustrator.ZIP) to match the screenshot!
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>('sample-file-2');

  // If user passed custom files, use them. If empty, fall back to the screenshot's files.
  const allFiles = files && files.length > 0 ? files : DEFAULT_SCREENSHOT_FILES;

  // Filter files based on tabs and local search
  const filteredFiles = allFiles.filter((f) => {
    if (activeTab === 'starred' && !f.isStarred) return false;
    if (tableSearch && !f.name.toLowerCase().includes(tableSearch.toLowerCase())) return false;
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      const gb = (bytes / (1024 * 1024 * 1024)).toFixed(1);
      return `${gb.replace('.', ',')} GB`;
    }
    if (bytes >= 1024 * 1024) {
      const mb = (bytes / (1024 * 1024)).toFixed(1);
      return `${mb.replace('.', ',')} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const formatModifiedDate = (dateStr?: string) => {
    if (!dateStr) return '11 June 2020';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <section className="your-file-section">
      {/* Section Title */}
      <h2 className="section-heading-sm" style={{ marginBottom: '14px' }}>Your File</h2>

      {/* Control bar: Tabs on left, Filter & Search on right */}
      <div className="table-controls-bar">
        {/* Left: Recent & Starred Tabs */}
        <div className="table-tabs-group">
          <button
            id="tab-recent"
            className={`table-tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <Icon icon="lucide:clock" width="14" height="14" />
            <span>Recent</span>
          </button>

          <button
            id="tab-starred"
            className={`table-tab-btn ${activeTab === 'starred' ? 'active' : ''}`}
            onClick={() => setActiveTab('starred')}
          >
            <Icon icon="lucide:star" width="14" height="14" />
            <span>Starred</span>
          </button>
        </div>

        {/* Right: Filter & Search Input */}
        <div className="table-actions-group">
          <div style={{ position: 'relative' }}>
            <button
              id="btn-table-filter"
              className="btn-table-filter"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            >
              <Icon icon="lucide:sliders-horizontal" width="14" height="14" />
              <span>Filter</span>
            </button>

            {filterMenuOpen && (
              <div
                className="filter-popover"
                onMouseLeave={() => setFilterMenuOpen(false)}
              >
                <div className="filter-header">Filter by extension</div>
                {['All', 'JPG', 'ZIP', 'MKV', 'FIG', 'DOCX'].map((ext) => (
                  <button
                    key={ext}
                    className="filter-item"
                    onClick={() => {
                      setTableSearch(ext === 'All' ? '' : ext);
                      setFilterMenuOpen(false);
                    }}
                  >
                    {ext}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="table-search-box">
            <Icon icon="lucide:search" width="14" height="14" color="#9ca3af" />
            <input
              type="text"
              className="table-search-input"
              placeholder="Search file..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            {tableSearch && (
              <button
                onClick={() => setTableSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Icon icon="lucide:x" width="12" height="12" color="#9ca3af" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Files Table */}
      <div className="cloudnest-table-container">
        <table className="cloudnest-files-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="table-circle-check header-check" />
                  <span>Name</span>
                </div>
              </th>
              <th style={{ width: '22%' }}>Shared By</th>
              <th style={{ width: '15%' }}>File Size</th>
              <th style={{ width: '16%' }}>Modified</th>
              <th style={{ width: '7%', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#9ca3af' }}>
                  No files match your query.
                </td>
              </tr>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = selectedId === file._id || (!selectedId && file._id === 'sample-file-2');
                const isMenuOpen = activeActionMenuId === file._id;
                const sharedBy = file.sharedBy || {
                  name: 'Devon Lane',
                  avatarBg: '#3b82f6',
                  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80',
                };

                return (
                  <tr
                    key={file._id}
                    id={`row-file-${file._id}`}
                    className={`file-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelect(file, 'file')}
                    onDoubleClick={() => onQuickLook(file)}
                  >
                    {/* Name column */}
                    <td>
                      <div className="file-name-container">
                        {/* Circle checkbox */}
                        <div
                          className={`table-circle-check ${isSelected ? 'checked' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(file, 'file');
                          }}
                        >
                          {isSelected && <Icon icon="lucide:check" width="10" height="10" color="#ffffff" />}
                        </div>

                        {/* File outline icon */}
                        <Icon icon="lucide:file-text" width="16" height="16" className="file-type-icon" />

                        {/* File name */}
                        <span className="file-title-text">{file.name}</span>
                      </div>
                    </td>

                    {/* Shared By column */}
                    <td>
                      <div className="shared-by-cell">
                        {sharedBy.avatarUrl ? (
                          <img
                            src={sharedBy.avatarUrl}
                            alt={sharedBy.name}
                            className="shared-avatar-img"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            className="shared-avatar-fallback"
                            style={{ background: sharedBy.avatarBg }}
                          >
                            {sharedBy.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="shared-by-name">{sharedBy.name}</span>
                      </div>
                    </td>

                    {/* File Size column */}
                    <td className="file-size-cell">{formatFileSize(file.size)}</td>

                    {/* Modified column */}
                    <td className="file-modified-cell">{formatModifiedDate(file.updatedAt || file.createdAt)}</td>

                    {/* Action column */}
                    <td style={{ textAlign: 'center', position: 'relative' }}>
                      <button
                        type="button"
                        id={`btn-action-${file._id}`}
                        className={`btn-row-action ${isMenuOpen ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionMenuId(isMenuOpen ? null : file._id);
                        }}
                        title="Actions"
                        aria-label="Actions"
                      >
                        <Icon icon="lucide:more-vertical" width="16" height="16" />
                      </button>

                      {/* Dropdown Menu matching the exact 2nd screenshot */}
                      <ThreeDotContextMenu
                        file={file}
                        isOpen={isMenuOpen}
                        onClose={() => setActiveActionMenuId(null)}
                        onOpen={() => {
                          if (onOpenDetails) onOpenDetails(file);
                          else onQuickLook(file);
                        }}
                        onDownload={(f) => onDownload(f)}
                        onShare={(f) => onShare(f)}
                        onRename={(f) => onRename(f, 'file')}
                        onDelete={(f) => onTrash(f, 'file')}
                        onDetails={(f) => {
                          if (onOpenDetails) onOpenDetails(f);
                          else onQuickLook(f);
                        }}
                        anchorOrigin="bottom-right"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
