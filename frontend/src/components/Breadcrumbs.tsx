import React from 'react';
import { Icon } from '@iconify/react';
import { BreadcrumbItem } from '../types';

interface BreadcrumbsProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (folderId: string | null) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ breadcrumbs, onNavigate }) => {
  return (
    <nav
      id="breadcrumbs-nav"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 0',
        fontSize: '14px',
        color: 'var(--text-muted)',
      }}
    >
      <button
        id="breadcrumb-root"
        onClick={() => onNavigate(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          color: breadcrumbs.length === 0 ? '#fff' : 'var(--text-muted)',
          fontWeight: breadcrumbs.length === 0 ? 600 : 400,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = breadcrumbs.length === 0 ? '#fff' : 'var(--text-muted)')}
      >
        <Icon icon="lucide:home" width="16" height="16" />
        My Drive
      </button>

      {breadcrumbs.map((crumb, idx) => {
        const isLast = idx === breadcrumbs.length - 1;
        return (
          <React.Fragment key={crumb.id}>
            <Icon icon="lucide:chevron-right" width="14" height="14" color="var(--text-dim)" />
            <button
              id={`breadcrumb-${crumb.id}`}
              onClick={() => onNavigate(crumb.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: isLast ? '#fff' : 'var(--text-muted)',
                fontWeight: isLast ? 600 : 400,
                cursor: isLast ? 'default' : 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { if (!isLast) e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { if (!isLast) e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
