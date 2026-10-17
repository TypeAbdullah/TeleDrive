import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { ThreeDotContextMenu } from './ThreeDotContextMenu';
import { TeleFile } from '../types';

interface FileDetailsViewProps {
  file: TeleFile;
  onBack: () => void;
  onDownload: (file: TeleFile) => void;
  onShare: (file: TeleFile) => void;
  onRename: (file: TeleFile) => void;
  onTrash: (file: TeleFile) => void;
  onQuickLook: (file: TeleFile) => void;
}

const THUMBNAIL_STRIP = [
  { id: 't1', name: 'mountain-view.jpg', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=80' },
  { id: 't2', name: 'lake-sunset.jpg', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80' },
  { id: 't3', name: 'japan-alps.jpg', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80' },
  { id: 't4', name: 'forest-trail.jpg', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80' },
];

export const FileDetailsView: React.FC<FileDetailsViewProps> = ({
  file,
  onBack,
  onDownload,
  onShare,
  onRename,
  onTrash,
  onQuickLook,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'preview' | 'activity'>('details');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentPhoto = THUMBNAIL_STRIP[selectedPhotoIndex] || THUMBNAIL_STRIP[0];
  const downloadUrl = `/api/v1/download/${file._id}`;
  const displayImageUrl = file.mimeType.startsWith('image/') && !file._id.startsWith('sample-') && !file._id.startsWith('p-')
    ? downloadUrl
    : currentPhoto.url;

  return (
    <div className="file-details-view-container">
      {/* Top Search & Actions Bar */}
      <header className="file-details-topbar">
        <div className="file-details-search-wrapper">
          <Icon icon="lucide:search" width="16" height="16" className="search-icon" />
          <input
            type="text"
            className="file-details-search-input"
            placeholder="Search files, folders, or anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="file-details-topbar-actions">
          <button className="btn-header-icon" title="Notifications">
            <Icon icon="lucide:bell" width="18" height="18" />
          </button>
          <button className="btn-primary-dark" onClick={() => onDownload(file)}>
            <Icon icon="lucide:upload" width="16" height="16" />
            <span>Upload</span>
          </button>
        </div>
      </header>

      {/* Main Body Split (Left content + Right details inspector) */}
      <div className="file-details-body-layout">
        {/* Left Column */}
        <div className="file-details-main-col">
          {/* Breadcrumbs */}
          <div className="file-details-breadcrumbs">
            <span className="crumb-link" onClick={onBack}>All Files</span>
            <Icon icon="lucide:chevron-right" width="13" height="13" color="#9ca3af" />
            <span className="crumb-link">Photos</span>
            <Icon icon="lucide:chevron-right" width="13" height="13" color="#9ca3af" />
            <span className="crumb-link">Nature</span>
            <Icon icon="lucide:chevron-right" width="13" height="13" color="#9ca3af" />
            <span className="crumb-current">{file.name}</span>
          </div>

          {/* Header Row: Badge + Title + Meta + Action Buttons */}
          <div className="file-details-header-row">
            <div className="file-details-title-group">
              <div className="file-details-badge">
                <Icon icon="lucide:image" width="22" height="22" color="#ffffff" />
              </div>
              <div>
                <h1 className="file-details-title">{file.name}</h1>
                <p className="file-details-submeta">
                  Image · 2.4 MB · Oct 16, 2026 · 12:48 PM
                </p>
              </div>
            </div>

            {/* Right Buttons: Download, Share, 3-dots */}
            <div className="file-details-header-actions">
              <button
                className="btn-outline-action"
                onClick={() => onDownload(file)}
              >
                <Icon icon="lucide:download" width="15" height="15" />
                <span>Download</span>
              </button>

              <button
                className="btn-outline-action"
                onClick={() => onShare(file)}
              >
                <Icon icon="lucide:share-2" width="15" height="15" />
                <span>Share</span>
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  id="btn-file-details-more"
                  className="btn-outline-icon"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  title="More options"
                >
                  <Icon icon="lucide:more-vertical" width="16" height="16" />
                </button>

                {/* Exact 3-dot context menu from Image 2 */}
                <ThreeDotContextMenu
                  file={file}
                  isOpen={isMoreMenuOpen}
                  onClose={() => setIsMoreMenuOpen(false)}
                  onOpen={() => onQuickLook(file)}
                  onDownload={onDownload}
                  onShare={onShare}
                  onFavorite={() => setIsFavorite(!isFavorite)}
                  onRename={onRename}
                  onDelete={onTrash}
                  onDetails={() => setIsRightPanelOpen(true)}
                />
              </div>
            </div>
          </div>

          {/* Large Hero Preview Image */}
          <div className="file-details-hero-card">
            <img
              src={displayImageUrl}
              alt={file.name}
              className="file-details-hero-img"
              onClick={() => onQuickLook(file)}
            />

            {/* Top Right Zoom / Expand Overlay Buttons */}
            <div className="hero-img-controls">
              <button
                className="hero-control-btn"
                title="Zoom in"
                onClick={() => onQuickLook(file)}
              >
                <Icon icon="lucide:zoom-in" width="15" height="15" />
              </button>
              <button
                className="hero-control-btn"
                title="Fullscreen"
                onClick={() => onQuickLook(file)}
              >
                <Icon icon="lucide:maximize-2" width="15" height="15" />
              </button>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="file-details-thumb-strip">
            {THUMBNAIL_STRIP.map((item, idx) => (
              <div
                key={item.id}
                className={`thumb-strip-item ${selectedPhotoIndex === idx ? 'selected' : ''}`}
                onClick={() => setSelectedPhotoIndex(idx)}
              >
                <img src={item.url} alt={item.name} className="thumb-strip-img" />
              </div>
            ))}
            {/* +2 Extra Thumbnails Pill */}
            <div className="thumb-strip-more" onClick={() => onQuickLook(file)}>
              <span>+2</span>
            </div>
          </div>

          {/* Tab Navigation: Details, Preview, Activity */}
          <div className="file-details-tabs-bar">
            <button
              className={`file-tab-item ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`file-tab-item ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
            <button
              className={`file-tab-item ${activeTab === 'activity' ? 'active' : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
          </div>

          {/* Tab Content: Details */}
          {activeTab === 'details' && (
            <div className="file-details-info-table">
              <div className="info-table-row">
                <div className="info-table-label">
                  <Icon icon="lucide:file-text" width="16" height="16" className="info-icon" />
                  <span>Name</span>
                </div>
                <div className="info-table-val">
                  <span>{file.name}</span>
                  <button
                    className="btn-pencil-edit"
                    onClick={() => onRename(file)}
                    title="Rename"
                  >
                    <Icon icon="lucide:pencil" width="13" height="13" />
                  </button>
                </div>
              </div>

              <div className="info-table-row">
                <div className="info-table-label">
                  <Icon icon="lucide:image" width="16" height="16" className="info-icon" />
                  <span>Type</span>
                </div>
                <div className="info-table-val">Image (JPG)</div>
              </div>

              <div className="info-table-row">
                <div className="info-table-label">
                  <Icon icon="lucide:hard-drive" width="16" height="16" className="info-icon" />
                  <span>Size</span>
                </div>
                <div className="info-table-val">2.4 MB</div>
              </div>

              <div className="info-table-row">
                <div className="info-table-label">
                  <Icon icon="lucide:folder" width="16" height="16" className="info-icon" />
                  <span>Location</span>
                </div>
                <div className="info-table-val link-blue">
                  <Icon icon="lucide:folder" width="14" height="14" color="#f59e0b" />
                  <span>Photos / Nature</span>
                </div>
              </div>

              <div className="info-table-row">
                <div className="info-table-label">
                  <Icon icon="lucide:clock" width="16" height="16" className="info-icon" />
                  <span>Created</span>
                </div>
                <div className="info-table-val">Oct 16, 2026 · 12:48 PM</div>
              </div>

              <div className="info-table-row">
                <div className="info-table-label">
                  <Icon icon="lucide:calendar" width="16" height="16" className="info-icon" />
                  <span>Modified</span>
                </div>
                <div className="info-table-val">Oct 16, 2026 · 12:48 PM</div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div style={{ padding: '24px 0', color: '#6b7280', fontSize: '13.5px' }}>
              Full resolution preview enabled with MTProto streaming cache.
            </div>
          )}

          {activeTab === 'activity' && (
            <div style={{ padding: '24px 0', color: '#6b7280', fontSize: '13.5px' }}>
              Uploaded by Martin Mickael on Oct 16, 2026.
            </div>
          )}
        </div>

        {/* Right Column: File Details Inspector Panel (Image 1 Right Side) */}
        {isRightPanelOpen && (
          <aside className="file-details-sidebar-panel">
            {/* Panel Title Row */}
            <div className="sidebar-panel-header">
              <h2 className="sidebar-panel-title">File Details</h2>
              <button
                className="panel-close-btn"
                onClick={() => setIsRightPanelOpen(false)}
                title="Close Details"
              >
                <Icon icon="lucide:x" width="16" height="16" />
              </button>
            </div>

            {/* Thumbnail Preview Card */}
            <div className="sidebar-panel-thumb-card">
              <img src={displayImageUrl} alt={file.name} className="panel-thumb-img" />
              <div className="panel-thumb-meta">
                <h4 className="panel-thumb-name" title={file.name}>{file.name}</h4>
                <span className="panel-thumb-sub">2.4 MB · JPG</span>
              </div>
            </div>

            {/* 4 Action Buttons Grid */}
            <div className="sidebar-panel-action-grid">
              <button className="panel-action-btn" onClick={() => onDownload(file)}>
                <Icon icon="lucide:download" width="16" height="16" />
                <span>Download</span>
              </button>

              <button className="panel-action-btn" onClick={() => onShare(file)}>
                <Icon icon="lucide:share-2" width="16" height="16" />
                <span>Share</span>
              </button>

              <button
                className={`panel-action-btn ${isFavorite ? 'active' : ''}`}
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Icon
                  icon="lucide:star"
                  width="16"
                  height="16"
                  color={isFavorite ? '#f59e0b' : '#374151'}
                />
                <span>Favorite</span>
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  className="panel-action-btn"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                >
                  <Icon icon="lucide:more-horizontal" width="16" height="16" />
                  <span>More</span>
                </button>
              </div>
            </div>

            {/* Information Section */}
            <div className="sidebar-panel-section">
              <h3 className="panel-section-heading">Information</h3>

              <div className="panel-info-row">
                <span className="panel-info-label">Name</span>
                <div className="panel-info-val">
                  <span>{file.name}</span>
                  <button
                    className="btn-pencil-edit"
                    onClick={() => onRename(file)}
                    title="Rename"
                  >
                    <Icon icon="lucide:pencil" width="13" height="13" />
                  </button>
                </div>
              </div>

              <div className="panel-info-row">
                <span className="panel-info-label">Type</span>
                <span className="panel-info-val">Image (JPG)</span>
              </div>

              <div className="panel-info-row">
                <span className="panel-info-label">Size</span>
                <span className="panel-info-val">2.4 MB</span>
              </div>

              <div className="panel-info-row">
                <span className="panel-info-label">Resolution</span>
                <span className="panel-info-val">3840 × 2160</span>
              </div>

              <div className="panel-info-row">
                <span className="panel-info-label">Location</span>
                <div className="panel-info-val link-blue">
                  <Icon icon="lucide:folder" width="13" height="13" color="#f59e0b" />
                  <span>Photos / Nature</span>
                </div>
              </div>

              <div className="panel-info-row">
                <span className="panel-info-label">Created</span>
                <span className="panel-info-val">Oct 16, 2026 · 12:48 PM</span>
              </div>

              <div className="panel-info-row">
                <span className="panel-info-label">Modified</span>
                <span className="panel-info-val">Oct 16, 2026 · 12:48 PM</span>
              </div>
            </div>

            {/* Sharing & Permissions Section */}
            <div className="sidebar-panel-section">
              <h3 className="panel-section-heading">Sharing & Permissions</h3>

              <div className="panel-privacy-row">
                <div className="privacy-lock-icon">
                  <Icon icon="lucide:lock" width="15" height="15" color="#6b7280" />
                </div>
                <div>
                  <h5 className="privacy-title">Private</h5>
                  <p className="privacy-desc">Only you can access this file</p>
                </div>
              </div>

              <button
                className="btn-manage-sharing"
                onClick={() => onShare(file)}
              >
                <Icon icon="lucide:users" width="15" height="15" />
                <span>Manage Sharing</span>
              </button>
            </div>

            {/* Tags Section */}
            <div className="sidebar-panel-section">
              <h3 className="panel-section-heading">Tags</h3>

              <div className="panel-tags-container">
                <button
                  className="btn-add-tag"
                  onClick={() => {
                    const tag = prompt('Enter new tag:');
                    if (tag) alert(`Tag "${tag}" added`);
                  }}
                >
                  <Icon icon="lucide:plus" width="13" height="13" />
                  <span>Add Tag</span>
                </button>

                <span className="tag-pill tag-green">nature</span>
                <span className="tag-pill tag-blue">mountain</span>
                <span className="tag-pill tag-purple">travel</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
