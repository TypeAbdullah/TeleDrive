import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { TeleFolder, StorageStats, TeleUser } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  user: TeleUser | null;
  folders: TeleFolder[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  storageStats: StorageStats | null;
  onOpenAccounts?: () => void;
  onOpenDeveloper?: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  user,
  folders,
  currentFolderId,
  onSelectFolder,
  storageStats,
  onOpenAccounts,
  onOpenDeveloper,
  onOpenAdmin,
  onSignOut,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Folders matching Image 1 & 2
  const sidebarFolders = ['Landing Page', 'Mobile', 'Dashboard', 'E-book'];

  const userName = user?.name || 'Martin Mickael';
  const userEmail = user?.email || 'martin@cloudnest.com';
  const userAvatar = user?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80';

  return (
    <aside className="cloudnest-sidebar" id="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand-row">
        <div className="sidebar-brand-icon">
          <Icon icon="lucide:cloud" width="18" height="18" color="#ffffff" />
        </div>
        <span className="sidebar-brand-title">Cloudnest</span>
      </div>

      {/* User Profile Card */}
      <div className="sidebar-user-card-wrapper">
        <div
          className="sidebar-user-card"
          onClick={() => setProfileMenuOpen(!profileMenuOpen)}
        >
          <div className="sidebar-user-avatar-wrap">
            <img
              src={userAvatar}
              alt={userName}
              className="sidebar-user-avatar"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{userName}</div>
            <div className="sidebar-user-email">{userEmail}</div>
          </div>
          <Icon icon="lucide:chevron-right" width="16" height="16" className="sidebar-user-chevron" />
        </div>

        {/* Profile Dropdown */}
        {profileMenuOpen && (
          <div
            className="sidebar-profile-dropdown"
            onMouseLeave={() => setProfileMenuOpen(false)}
          >
            <div className="profile-dropdown-header">
              <strong>{userName}</strong>
              <span>{userEmail}</span>
            </div>
            {onOpenAccounts && (
              <button
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenAccounts();
                }}
              >
                <Icon icon="lucide:server" width="14" height="14" />
                Storage Nodes & Bots
              </button>
            )}
            {onOpenDeveloper && (
              <button
                className="profile-dropdown-item"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenDeveloper();
                }}
              >
                <Icon icon="lucide:key" width="14" height="14" />
                Developer API
              </button>
            )}
            {onOpenAdmin && (
              <button
                className="profile-dropdown-item"
                style={{ color: '#3b82f6', fontWeight: 600 }}
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenAdmin();
                }}
              >
                <Icon icon="lucide:shield" width="14" height="14" color="#3b82f6" />
                Admin Dashboard
              </button>
            )}
            {onSignOut && (
              <button
                className="profile-dropdown-item danger"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onSignOut();
                }}
              >
                <Icon icon="lucide:log-out" width="14" height="14" />
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Nav Items matching Screenshots */}
      <nav className="sidebar-nav-list">
        <button
          id="nav-all-files"
          className={`sidebar-nav-btn ${currentTab === 'all-files' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('all-files');
            onSelectFolder(null);
          }}
        >
          <Icon icon="lucide:layout-grid" width="17" height="17" />
          <span>All Files</span>
        </button>

        <button
          id="nav-photos"
          className={`sidebar-nav-btn ${currentTab === 'photos' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('photos');
            onSelectFolder(null);
          }}
        >
          <Icon icon="lucide:image" width="17" height="17" />
          <span>Photos</span>
        </button>

        <button
          id="nav-favorites"
          className={`sidebar-nav-btn ${currentTab === 'favorites' ? 'active' : ''}`}
          onClick={() => onTabChange('favorites')}
        >
          <Icon icon="lucide:star" width="17" height="17" />
          <span>Favorites</span>
        </button>

        <button
          id="nav-shared"
          className={`sidebar-nav-btn ${currentTab === 'shared' ? 'active' : ''}`}
          onClick={() => onTabChange('shared')}
        >
          <Icon icon="lucide:users" width="17" height="17" />
          <span>Shared Files</span>
        </button>

        <button
          id="nav-deleted"
          className={`sidebar-nav-btn ${currentTab === 'deleted' ? 'active' : ''}`}
          onClick={() => onTabChange('deleted')}
        >
          <Icon icon="lucide:trash-2" width="17" height="17" />
          <span>Deleted Files</span>
        </button>

        <button
          id="nav-folders"
          className={`sidebar-nav-btn ${currentTab === 'folders' ? 'active' : ''}`}
          onClick={() => {
            onTabChange('folders');
            onSelectFolder(null);
          }}
        >
          <Icon icon="lucide:folder" width="17" height="17" />
          <span>Folders</span>
        </button>

        <button
          id="nav-settings"
          className={`sidebar-nav-btn ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <Icon icon="lucide:settings" width="17" height="17" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Folders List */}
      <div className="sidebar-section-title">Folders</div>
      <div className="sidebar-folders-list">
        {sidebarFolders.map((name) => (
          <button
            key={name}
            className={`sidebar-folder-item ${currentTab === `folder-${name}` ? 'active' : ''}`}
            onClick={() => onTabChange(`folder-${name}`)}
          >
            <Icon icon="lucide:folder" width="15" height="15" color="#f59e0b" />
            <span>{name}</span>
          </button>
        ))}
      </div>

      {/* Bottom Storage Meter Widget (Image 1 & 2 design) */}
      <div className="sidebar-storage-widget">
        <div className="storage-legend-grid">
          <div className="storage-legend-item">
            <span className="storage-dot" style={{ background: '#3b82f6' }} />
            <span className="storage-legend-label">Photos</span>
            <span className="storage-legend-val">12.4 GB</span>
          </div>
          <div className="storage-legend-item">
            <span className="storage-dot" style={{ background: '#8b5cf6' }} />
            <span className="storage-legend-label">Videos</span>
            <span className="storage-legend-val">18.7 GB</span>
          </div>
          <div className="storage-legend-item">
            <span className="storage-dot" style={{ background: '#10b981' }} />
            <span className="storage-legend-label">Documents</span>
            <span className="storage-legend-val">9.1 GB</span>
          </div>
          <div className="storage-legend-item">
            <span className="storage-dot" style={{ background: '#9ca3af' }} />
            <span className="storage-legend-label">Files & Others</span>
            <span className="storage-legend-val">4.5 GB</span>
          </div>
        </div>

        {/* Status text */}
        <div className="storage-status-text">44.7 GB / 100 GB</div>

        {/* Progress bar track */}
        <div className="storage-progress-track">
          <div className="storage-segment" style={{ width: '12.4%', background: '#3b82f6' }} />
          <div className="storage-segment" style={{ width: '18.7%', background: '#8b5cf6' }} />
          <div className="storage-segment" style={{ width: '9.1%', background: '#10b981' }} />
          <div className="storage-segment" style={{ width: '4.5%', background: '#9ca3af' }} />
        </div>

        {/* Upgrade Plan Button */}
        <button
          className="btn-upgrade-premium"
          onClick={() => alert('Storage cluster active: 100 GB Telegram MTProto orchestrator.')}
        >
          Upgrade Plan
        </button>
      </div>
    </aside>
  );
};
