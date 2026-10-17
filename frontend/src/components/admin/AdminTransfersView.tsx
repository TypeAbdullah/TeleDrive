import React from 'react';
import { Icon } from '@iconify/react';
import { AdminOverview } from '../../types/admin';

interface Props {
  overview: AdminOverview | null;
  onNavigateToSettings: (category: string) => void;
}

export const AdminTransfersView: React.FC<Props> = ({ overview, onNavigateToSettings }) => {
  const transfers = overview?.transfers;

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:arrow-up-down" width="18" height="18" />
            Transfers Engine & Bounded Streaming Telemetry
          </div>
          <button onClick={() => onNavigateToSettings('transfers')} className="btn-secondary">
            <Icon icon="lucide:settings" width="14" height="14" />
            Configure Transfer Limits
          </button>
        </div>

        {/* Live Concurrency Gauges */}
        <div className="admin-metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="admin-card">
            <div className="admin-card-header">
              <span>Active Uploads</span>
              <Icon icon="lucide:upload-cloud" width="16" height="16" color="#3b82f6" />
            </div>
            <div className="admin-card-value">{transfers?.activeUploads ?? 0}</div>
            <div className="admin-card-subtext">Ephemeral disk-streamed chunks</div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span>Active Downloads</span>
              <Icon icon="lucide:download-cloud" width="16" height="16" color="#10b981" />
            </div>
            <div className="admin-card-value">{transfers?.activeDownloads ?? 0}</div>
            <div className="admin-card-subtext">Backpressured Web Streams</div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span>Queue Depth</span>
              <Icon icon="lucide:list" width="16" height="16" color="#f59e0b" />
            </div>
            <div className="admin-card-value">{transfers?.queueDepth ?? 0}</div>
            <div className="admin-card-subtext">Avg Queue Wait: {transfers?.avgQueueWaitMs ?? 0} ms</div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span>Completed Transfers</span>
              <Icon icon="lucide:check-circle" width="16" height="16" color="#6366f1" />
            </div>
            <div className="admin-card-value">{transfers?.totalCompleted ?? 0}</div>
            <div className="admin-card-subtext">Failures: {transfers?.totalFailed ?? 0}</div>
          </div>
        </div>

        {/* Transfer Safety Policies */}
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', color: '#f1f5f9', marginBottom: '12px' }}>Operational Enforcement Policies</h4>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Protection Layer</th>
                <th>Enforcement Mechanism</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Memory-Bounded Streaming</strong>
                </td>
                <td>
                  Chunks streamed via backpressured async iterables with bounded buffer windows. Zero whole-file memory caching.
                </td>
                <td>
                  <span className="badge-pill badge-active">Active</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>RFC 7233 HTTP Range Slicing</strong>
                </td>
                <td>
                  Exact byte-offset sub-range queries. Only intersecting Telegram message parts are downloaded.
                </td>
                <td>
                  <span className="badge-pill badge-active">Active</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Client Disconnect Cleanup</strong>
                </td>
                <td>
                  Upstream MTProto streams and socket resources destroyed promptly when client closes connection.
                </td>
                <td>
                  <span className="badge-pill badge-active">Active</span>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Idempotent Upload Pipeline</strong>
                </td>
                <td>
                  `Idempotency-Key` headers tracked with replay caching. Safe retries without duplicate chunk files.
                </td>
                <td>
                  <span className="badge-pill badge-active">Active</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
