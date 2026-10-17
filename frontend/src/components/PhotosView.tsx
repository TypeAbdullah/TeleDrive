import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { TeleFile } from '../types';
import { ThreeDotContextMenu } from './ThreeDotContextMenu';

export interface PhotoItem {
  id: string;
  name: string;
  url: string;
  date: string;
  sizeStr: string;
  sizeBytes: number;
  mimeType: string;
}

interface PhotoSection {
  title: string;
  count: number;
  photos: PhotoItem[];
}

const DEFAULT_PHOTO_SECTIONS: PhotoSection[] = [
  {
    title: 'Today',
    count: 6,
    photos: [
      {
        id: 'p-1',
        name: 'mountain-view.jpg',
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
        date: 'Oct 16, 2026',
        sizeStr: '2.4 MB',
        sizeBytes: 2.4 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-2',
        name: 'sunset-beach.jpg',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
        date: 'Oct 16, 2026',
        sizeStr: '1.8 MB',
        sizeBytes: 1.8 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-3',
        name: 'cat.jpg',
        url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
        date: 'Oct 16, 2026',
        sizeStr: '1.2 MB',
        sizeBytes: 1.2 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-4',
        name: 'japan-street.jpg',
        url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&auto=format&fit=crop&q=80',
        date: 'Oct 16, 2026',
        sizeStr: '2.7 MB',
        sizeBytes: 2.7 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-5',
        name: 'ramen.jpg',
        url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
        date: 'Oct 16, 2026',
        sizeStr: '1.6 MB',
        sizeBytes: 1.6 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-6',
        name: 'tokyo-night.jpg',
        url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=600&auto=format&fit=crop&q=80',
        date: 'Oct 16, 2026',
        sizeStr: '2.1 MB',
        sizeBytes: 2.1 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
    ],
  },
  {
    title: 'September 2026',
    count: 8,
    photos: [
      {
        id: 'p-7',
        name: 'forest-road.jpg',
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 28, 2026',
        sizeStr: '3.2 MB',
        sizeBytes: 3.2 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-8',
        name: 'cliff.jpg',
        url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 26, 2026',
        sizeStr: '2.8 MB',
        sizeBytes: 2.8 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-9',
        name: 'leaves.jpg',
        url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 24, 2026',
        sizeStr: '1.4 MB',
        sizeBytes: 1.4 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-10',
        name: 'portrait.jpg',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 21, 2026',
        sizeStr: '2.6 MB',
        sizeBytes: 2.6 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-11',
        name: 'sleepy-cat.jpg',
        url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 18, 2026',
        sizeStr: '1.1 MB',
        sizeBytes: 1.1 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-12',
        name: 'coffee.jpg',
        url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 16, 2026',
        sizeStr: '1.9 MB',
        sizeBytes: 1.9 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-13',
        name: 'city-skyline.jpg',
        url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 12, 2026',
        sizeStr: '2.3 MB',
        sizeBytes: 2.3 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-14',
        name: 'nature.jpg',
        url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80',
        date: 'Sep 10, 2026',
        sizeStr: '3.0 MB',
        sizeBytes: 3.0 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
    ],
  },
  {
    title: 'August 2026',
    count: 5,
    photos: [
      {
        id: 'p-15',
        name: 'cherry-blossom.jpg',
        url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&auto=format&fit=crop&q=80',
        date: 'Aug 28, 2026',
        sizeStr: '1.8 MB',
        sizeBytes: 1.8 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-16',
        name: 'coast-town.jpg',
        url: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600&auto=format&fit=crop&q=80',
        date: 'Aug 24, 2026',
        sizeStr: '2.4 MB',
        sizeBytes: 2.4 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-17',
        name: 'food.jpg',
        url: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&auto=format&fit=crop&q=80',
        date: 'Aug 20, 2026',
        sizeStr: '1.7 MB',
        sizeBytes: 1.7 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-18',
        name: 'hill.jpg',
        url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&auto=format&fit=crop&q=80',
        date: 'Aug 17, 2026',
        sizeStr: '2.9 MB',
        sizeBytes: 2.9 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
      {
        id: 'p-19',
        name: 'travel.jpg',
        url: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=600&auto=format&fit=crop&q=80',
        date: 'Aug 14, 2026',
        sizeStr: '2.1 MB',
        sizeBytes: 2.1 * 1024 * 1024,
        mimeType: 'image/jpeg',
      },
    ],
  },
];

interface PhotosViewProps {
  realFiles: TeleFile[];
  onUploadClick: () => void;
  onQuickLook: (file: TeleFile) => void;
  onDownload: (file: TeleFile) => void;
  onShare: (file: TeleFile) => void;
  onTrash: (file: TeleFile) => void;
  onOpenDetails?: (file: TeleFile) => void;
}

export const PhotosView: React.FC<PhotosViewProps> = ({
  realFiles,
  onUploadClick,
  onQuickLook,
  onDownload,
  onShare,
  onTrash,
  onOpenDetails,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<'recent' | 'name' | 'size'>('recent');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // Merge real image files if any
  const realImages: PhotoItem[] = realFiles
    .filter((f) => f.mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name))
    .map((f) => ({
      id: f._id,
      name: f.name,
      url: `/api/v1/download/${f._id}`,
      date: 'Today',
      sizeStr: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      sizeBytes: f.size,
      mimeType: f.mimeType,
    }));

  const sections: PhotoSection[] = DEFAULT_PHOTO_SECTIONS.map((sec, idx) => {
    if (idx === 0 && realImages.length > 0) {
      return {
        ...sec,
        count: sec.photos.length + realImages.length,
        photos: [...realImages, ...sec.photos],
      };
    }
    return sec;
  });

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toTeleFile = (photo: PhotoItem): TeleFile => ({
    _id: photo.id,
    userId: 'user-me',
    folderId: null,
    name: photo.name,
    size: photo.sizeBytes,
    mimeType: photo.mimeType,
    status: 'ready',
    isStarred: false,
    isTrash: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return (
    <div className="photos-view-container">
      {/* Top Header Bar */}
      <header className="photos-view-topbar">
        {/* Search Input */}
        <div className="photos-search-wrapper">
          <Icon icon="lucide:search" width="16" height="16" className="search-icon" />
          <input
            type="text"
            className="photos-search-input"
            placeholder="Search photos..."
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
        <div className="photos-topbar-actions">
          <button className="btn-header-icon" title="Notifications">
            <Icon icon="lucide:bell" width="18" height="18" />
          </button>

          <button
            id="btn-photos-upload"
            className="btn-primary-dark"
            onClick={onUploadClick}
          >
            <Icon icon="lucide:upload" width="16" height="16" />
            <span>Upload</span>
          </button>
        </div>
      </header>

      {/* Photos Title & Action Controls */}
      <div className="photos-page-header">
        <div className="photos-title-group">
          {/* Yellow Photo Icon Badge */}
          <div className="photos-header-badge">
            <Icon icon="lucide:image" width="22" height="22" color="#ffffff" />
          </div>
          <div>
            <h1 className="photos-page-title">Photos</h1>
            <p className="photos-page-subtitle">Your photos, all in one place.</p>
          </div>
        </div>

        {/* Controls Right */}
        <div className="photos-header-controls">
          {/* Sort Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="photos-control-btn"
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
                  className={`filter-item ${sortOption === 'recent' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('recent');
                    setSortMenuOpen(false);
                  }}
                >
                  Newest First
                </button>
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
                  className={`filter-item ${sortOption === 'size' ? 'active' : ''}`}
                  onClick={() => {
                    setSortOption('size');
                    setSortMenuOpen(false);
                  }}
                >
                  File Size
                </button>
              </div>
            )}
          </div>

          {/* Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              className="photos-control-btn"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            >
              <Icon icon="lucide:filter" width="14" height="14" />
              <span>Filter</span>
              <Icon icon="lucide:chevron-down" width="13" height="13" color="#9ca3af" />
            </button>

            {filterMenuOpen && (
              <div
                className="filter-popover"
                onMouseLeave={() => setFilterMenuOpen(false)}
              >
                <div className="filter-header">Format</div>
                {['All Photos', 'JPEG', 'PNG', 'WEBP', 'RAW'].map((fmt) => (
                  <button
                    key={fmt}
                    className="filter-item"
                    onClick={() => setFilterMenuOpen(false)}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid / List Switcher */}
          <div className="photos-view-switcher">
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

      {/* Timeline Grouped Photo Grid */}
      <div className="photos-timeline-scroll">
        {sections.map((sec) => {
          const visiblePhotos = sec.photos.filter((p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (visiblePhotos.length === 0) return null;

          return (
            <section key={sec.title} className="photos-timeline-section">
              {/* Section Header with Count Badge */}
              <div className="photos-section-header">
                <h2 className="photos-section-title">{sec.title}</h2>
                <span className="photos-section-count">{visiblePhotos.length}</span>
              </div>

              {/* Photos Cards Row */}
              <div className="photos-cards-grid">
                {visiblePhotos.map((photo) => {
                  const isChecked = selectedPhotoIds.includes(photo.id);
                  const isMenuOpen = activeMenuId === photo.id;

                  return (
                    <div
                      key={photo.id}
                      id={`photo-card-${photo.id}`}
                      className={`photo-card-item ${isChecked ? 'selected' : ''}`}
                      onClick={() => {
                        if (onOpenDetails) onOpenDetails(toTeleFile(photo));
                        else onQuickLook(toTeleFile(photo));
                      }}
                    >
                      {/* Thumbnail Container */}
                      <div className="photo-thumb-container">
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="photo-thumb-img"
                          loading="lazy"
                        />

                        {/* Top-left checkbox */}
                        <div
                          className={`photo-check-box ${isChecked ? 'checked' : ''}`}
                          onClick={(e) => toggleSelect(photo.id, e)}
                        >
                          {isChecked && (
                            <Icon icon="lucide:check" width="11" height="11" color="#ffffff" strokeWidth="3" />
                          )}
                        </div>

                        {/* Top-right 3-dots Menu */}
                        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                          <button
                            className="photo-more-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(isMenuOpen ? null : photo.id);
                            }}
                            title="Actions"
                          >
                            <Icon icon="lucide:more-vertical" width="15" height="15" />
                          </button>

                          <ThreeDotContextMenu
                            file={toTeleFile(photo)}
                            isOpen={isMenuOpen}
                            onClose={() => setActiveMenuId(null)}
                            onOpen={() => {
                              if (onOpenDetails) onOpenDetails(toTeleFile(photo));
                              else onQuickLook(toTeleFile(photo));
                            }}
                            onDownload={() => onDownload(toTeleFile(photo))}
                            onShare={() => onShare(toTeleFile(photo))}
                            onDelete={() => onTrash(toTeleFile(photo))}
                            onDetails={() => {
                              if (onOpenDetails) onOpenDetails(toTeleFile(photo));
                              else onQuickLook(toTeleFile(photo));
                            }}
                            anchorOrigin="bottom-right"
                          />
                        </div>
                      </div>

                      {/* Photo Name & Meta below */}
                      <div className="photo-card-info">
                        <span className="photo-card-name" title={photo.name}>
                          {photo.name}
                        </span>
                        <span className="photo-card-meta">
                          {photo.date} · {photo.sizeStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
