import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AdminAuditLog } from '../../types/admin';

interface Props {
  auditData: {
    items: AdminAuditLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  } | null;
  loading: boolean;
  onRefresh: (page: number, category?: string) => void;
}

export const AdminAuditView: React.FC<Props> = ({
  auditData,
  loading,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeDiffItem, setActiveDiffItem] = useState<AdminAuditLog | null>(null);

  const handleCategoryFilter = (cat: string) => {
    setSelectedCategory(cat);
    onRefresh(1, cat || undefined);
  };

  const handlePageChange = (newPage: number) => {
    onRefresh(newPage, selectedCategory || undefined);
  };

  const items = auditData?.items || [];
  const pagination = auditData?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:shield-check" width="18" height="18" />
            Audit Trail & Configuration History ({pagination.total} events)
          </div>

          <div className="admin-section-actions">
            {/* Filter by Category */}
            <select
              value={selectedCategory}
              onChange={e => handleCategoryFilter(e.target.value)}
              className="admin-input"
              style={{ width: '160px', padding: '6px 10px', fontSize: '12.5px' }}
            >
              <option value="">All Categories</option>
              <option value="application">Application</option>
              <option value="telegram">Telegram</option>
              <option value="transfers">Transfers</option>
              <option value="security">Security</option>
              <option value="cache">Cache</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <button onClick={() => onRefresh(pagination.page, selectedCategory || undefined)} className="btn-secondary">
              <Icon icon="lucide:refresh-cw" width="14" height="14" />
              Refresh
            </button>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Administrator</th>
              <th>Action</th>
              <th>Category</th>
              <th>Resource</th>
              <th>Status</th>
              <th>Changes / Details</th>
            </tr>
          </thead>
          <tbody>
            {items.map(log => (
              <tr key={log._id}>
                <td style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{log.actorEmail}</span>
                </td>
                <td>
                  <code style={{ fontSize: '12px', color: '#38bdf8' }}>{log.action}</code>
                </td>
                <td>
                  <span className="badge-pill badge-active" style={{ fontSize: '10.5px' }}>
                    {log.category}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{log.resourceId || '—'}</span>
                </td>
                <td>
                  <span className={`badge-pill ${log.status === 'success' ? 'badge-active' : 'badge-error'}`}>
                    {log.status}
                  </span>
                </td>
                <td>
                  {log.changes ? (
                    <button
                      onClick={() => setActiveDiffItem(log)}
                      className="btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                    >
                      <Icon icon="lucide:diff" width="12" height="12" />
                      View Diff
                    </button>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '11px' }}>No diff</span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  No audit log entries recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px' }}
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="btn-secondary"
                style={{ padding: '5px 12px', fontSize: '12px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Diff Details Modal */}
      {activeDiffItem && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '640px' }}>
            <div className="admin-modal-header">
              <span>Change Diff: {activeDiffItem.resourceId}</span>
              <button
                onClick={() => setActiveDiffItem(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="admin-modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#f87171', marginBottom: '6px' }}>
                    Before:
                  </div>
                  <pre
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#fca5a5',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(activeDiffItem.changes?.before, null, 2)}
                  </pre>
                </div>

                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', marginBottom: '6px' }}>
                    After:
                  </div>
                  <pre
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#6ee7b7',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(activeDiffItem.changes?.after, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button onClick={() => setActiveDiffItem(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
