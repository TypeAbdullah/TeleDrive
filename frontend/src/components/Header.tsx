import React, { useState } from 'react';
import { Icon } from '@iconify/react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onInviteMember?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onInviteMember,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="cloudnest-header" id="top-header">
      {/* Search Input Bar */}
      <div className="cloudnest-search-wrapper">
        <Icon icon="lucide:search" width="17" height="17" className="search-icon" />
        <input
          id="main-search-input"
          type="text"
          className="cloudnest-search-input"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="search-clear-btn"
            title="Clear search"
          >
            <Icon icon="lucide:x" width="14" height="14" />
          </button>
        )}
      </div>

      {/* Right Action Buttons */}
      <div className="header-right-actions">
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            id="btn-notifications"
            className="btn-header-icon"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            title="Notifications"
          >
            <Icon icon="lucide:bell" width="18" height="18" />
          </button>

          {notificationsOpen && (
            <div
              className="notifications-popover"
              onMouseLeave={() => setNotificationsOpen(false)}
            >
              <div className="popover-header">Notifications</div>
              <div className="popover-item">
                <Icon icon="lucide:check-circle-2" width="15" height="15" color="#10b981" />
                <div>
                  <p className="popover-text">Sync with Telegram cluster active</p>
                  <span className="popover-time">Just now</span>
                </div>
              </div>
              <div className="popover-item">
                <Icon icon="lucide:user-plus" width="15" height="15" color="#3b82f6" />
                <div>
                  <p className="popover-text">Ronald Richards shared a file with you</p>
                  <span className="popover-time">2 hours ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invite Member Button */}
        <button
          id="btn-invite-member"
          className="btn-invite-member"
          onClick={() => {
            if (onInviteMember) onInviteMember();
            else alert('Invite link copied: https://cloudnest.com/invite/teledrive');
          }}
        >
          <Icon icon="lucide:plus" width="15" height="15" />
          <span>Invite member</span>
        </button>
      </div>
    </header>
  );
};
