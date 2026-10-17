import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { signOut } from '../lib/auth-client';
import { StorageStats, TeleUser } from '../types';

interface NavbarProps {
  user: TeleUser | null;
  storageStats: StorageStats | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAccounts: () => void;
  onOpenDeveloper: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  storageStats,
  searchQuery,
  onSearchChange,
  onOpenAccounts,
  onOpenDeveloper,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <header
      id="main-navbar"
      style={{
        height: '64px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(8, 12, 20, 0.75)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
          }}
        >
          <Icon icon="lucide:cloud" width="22" height="22" color="#ffffff" />
        </div>
        <div>
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '19px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 40%, #a5b4fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TeleDrive
          </span>
          <span
            style={{
              marginLeft: '6px',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            MTPROTO
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div style={{ flex: 1, maxWidth: '580px', margin: '0 24px', position: 'relative' }}>
        <Icon
          icon="lucide:search"
          width="18"
          height="18"
          color="var(--text-dim)"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          id="global-search-input"
          type="text"
          placeholder="Search files, documents, and media..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="input"
          style={{
            paddingLeft: '42px',
            paddingRight: searchQuery ? '36px' : '14px',
            background: 'rgba(15, 23, 42, 0.7)',
            borderColor: 'var(--border-subtle)',
            borderRadius: '12px',
            height: '40px',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)',
            }}
          >
            <Icon icon="lucide:x" width="16" height="16" />
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Storage pill */}
        {storageStats && (
          <div
            title={`${formatBytes(storageStats.usedBytes)} of ${formatBytes(storageStats.quotaBytes)} used`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '20px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            <Icon icon="lucide:hard-drive" width="15" height="15" color="var(--primary)" />
            <div style={{ width: '70px', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, storageStats.percentUsed)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                  borderRadius: '3px',
                }}
              />
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {storageStats.percentUsed}%
            </span>
          </div>
        )}

        {/* Profile Avatar / Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            id="profile-dropdown-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '24px',
            }}
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user.name || 'User'}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '2px solid rgba(99, 102, 241, 0.5)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </button>

          {profileOpen && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                width: '240px',
                padding: '12px',
                zIndex: 100,
                animation: 'slideUp 0.15s ease-out',
              }}
            >
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>{user?.name || 'User'}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </p>
              </div>

              <button
                onClick={() => { setProfileOpen(false); onOpenAccounts(); }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', marginBottom: '6px', fontSize: '13px' }}
              >
                <Icon icon="lucide:sparkles" width="16" height="16" color="var(--primary)" />
                Telegram Accounts
              </button>

              <button
                onClick={() => { setProfileOpen(false); onOpenDeveloper(); }}
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', marginBottom: '8px', fontSize: '13px' }}
              >
                <Icon icon="lucide:user" width="16" height="16" color="var(--accent-cyan)" />
                Developer API
              </button>

              <button
                id="sign-out-btn"
                onClick={() => signOut()}
                className="btn-danger"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 12px', fontSize: '13px' }}
              >
                <Icon icon="lucide:log-out" width="16" height="16" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
