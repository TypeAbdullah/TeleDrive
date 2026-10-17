import React from 'react';
import { Icon } from '@iconify/react';
import { AdminOverview } from '../../types/admin';

interface Props {
  data: AdminOverview | null;
  loading: boolean;
  onRefresh: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${seconds % 60}s`;
}

export const AdminOverviewView: React.FC<Props> = ({ data, loading, onRefresh }) => {
  if (loading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        <Icon icon="lucide:loader-2" className="spin-animation" width="32" height="32" />
        <div style={{ marginTop: '12px' }}>Loading real-time infrastructure telemetry...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#f87171' }}>
        <Icon icon="lucide:alert-circle" width="32" height="32" />
        <div style={{ marginTop: '12px' }}>Failed to load system overview</div>
        <button onClick={onRefresh} className="btn-secondary" style={{ marginTop: '16px' }}>
          Retry
        </button>
      </div>
    );
  }

  const { system, memory, dependencies, transfers, storage, cache } = data;
  const rssMb = Math.round(memory.rssBytes / (1024 * 1024));
  const heapMb = Math.round(memory.heapUsedBytes / (1024 * 1024));

  return (
    <div>
      {/* ── Key Metrics Cards ────────────────────────────────────────────── */}
      <div className="admin-metrics-grid">
        <div className="admin-card">
          <div className="admin-card-header">
            <span>System Uptime</span>
            <Icon icon="lucide:clock" width="16" height="16" color="#60a5fa" />
          </div>
          <div className="admin-card-value">{formatUptime(system.uptimeSeconds)}</div>
          <div className="admin-card-subtext">
            <span>Node {system.nodeEnv}</span> • <span>v{system.version}</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <span>Memory (RSS / Heap)</span>
            <Icon icon="lucide:cpu" width="16" height="16" color="#a78bfa" />
          </div>
          <div className="admin-card-value">
            {rssMb} <span style={{ fontSize: '15px', color: '#94a3b8' }}>MB RSS</span>
          </div>
          <div className="admin-card-subtext">
            <span>Heap Used: {heapMb} MB</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <span>Active Transfers</span>
            <Icon icon="lucide:arrow-up-down" width="16" height="16" color="#34d399" />
          </div>
          <div className="admin-card-value">
            {transfers.activeUploads + transfers.activeDownloads}
          </div>
          <div className="admin-card-subtext">
            <span>↑ {transfers.activeUploads} uploads</span> • <span>↓ {transfers.activeDownloads} downloads</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <span>Transfer Queue</span>
            <Icon icon="lucide:list-ordered" width="16" height="16" color="#fbbf24" />
          </div>
          <div className="admin-card-value">{transfers.queueDepth}</div>
          <div className="admin-card-subtext">
            <span>Wait: {transfers.avgQueueWaitMs} ms</span> • <span>{transfers.totalCompleted} done</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <span>Total Stored Payload</span>
            <Icon icon="lucide:database" width="16" height="16" color="#38bdf8" />
          </div>
          <div className="admin-card-value">{formatBytes(storage.totalBytesStored)}</div>
          <div className="admin-card-subtext">
            <span>{storage.totalFiles} logical files</span>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <span>Cache Hit Ratio</span>
            <Icon icon="lucide:zap" width="16" height="16" color="#f472b6" />
          </div>
          <div className="admin-card-value">
            {Math.round(cache.hitRatio * 100)}%
          </div>
          <div className="admin-card-subtext">
            <span>{cache.hits} hits</span> • <span>{cache.misses} misses</span>
          </div>
        </div>
      </div>

      {/* ── Subsystems Status Grid ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Core Dependencies */}
        <div className="admin-section" style={{ margin: 0 }}>
          <div className="admin-section-header">
            <div className="admin-section-title">
              <Icon icon="lucide:server" width="18" height="18" />
              Infrastructure Dependencies
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Latency</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>MongoDB Atlas</strong>
                </td>
                <td>
                  <span className={`badge-pill ${dependencies.mongodb.status === 'healthy' ? 'badge-active' : 'badge-error'}`}>
                    {dependencies.mongodb.status}
                  </span>
                </td>
                <td>{dependencies.mongodb.latencyMs !== undefined ? `${dependencies.mongodb.latencyMs} ms` : '—'}</td>
                <td>Primary metadata store</td>
              </tr>
              <tr>
                <td>
                  <strong>Redis Coordinator</strong>
                </td>
                <td>
                  <span className={`badge-pill ${dependencies.redis.status === 'healthy' ? 'badge-active' : 'badge-disabled'}`}>
                    {dependencies.redis.status}
                  </span>
                </td>
                <td>{dependencies.redis.latencyMs !== undefined ? `${dependencies.redis.latencyMs} ms` : '—'}</td>
                <td>Distributed locks & queues</td>
              </tr>
              <tr>
                <td>
                  <strong>Telegram MTProto Pool</strong>
                </td>
                <td>
                  <span className={`badge-pill ${dependencies.telegramPool.healthyCount > 0 ? 'badge-active' : 'badge-error'}`}>
                    {dependencies.telegramPool.healthyCount > 0 ? 'operational' : 'degraded'}
                  </span>
                </td>
                <td>—</td>
                <td>
                  {dependencies.telegramPool.healthyCount} / {dependencies.telegramPool.totalCount} accounts active
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Cloudflare Worker Gateway</strong>
                </td>
                <td>
                  <span className={`badge-pill ${dependencies.gateway.enabled ? 'badge-active' : 'badge-disabled'}`}>
                    {dependencies.gateway.enabled ? 'enabled' : 'direct mode'}
                  </span>
                </td>
                <td>—</td>
                <td>{dependencies.gateway.url}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Telegram Storage Sessions Real-time Snapshot */}
        <div className="admin-section" style={{ margin: 0 }}>
          <div className="admin-section-header">
            <div className="admin-section-title">
              <Icon icon="lucide:send" width="18" height="18" />
              Active Telegram Accounts
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              {dependencies.telegramPool.accounts.length} nodes registered
            </div>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Score</th>
                <th>Status</th>
                <th>Circuit</th>
                <th>Load</th>
              </tr>
            </thead>
            <tbody>
              {dependencies.telegramPool.accounts.map((acc: any) => (
                <tr key={acc.accountId}>
                  <td>
                    <strong>{acc.label}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{acc.accountId}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: acc.score > 70 ? '#34d399' : acc.score > 30 ? '#fbbf24' : '#f87171' }}>
                      {acc.score}/100
                    </span>
                  </td>
                  <td>
                    <span className={`badge-pill badge-${acc.status}`}>
                      {acc.status}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '11.5px', color: acc.circuitBreaker === 'closed' ? '#94a3b8' : '#f87171' }}>
                      {acc.circuitBreaker}
                    </span>
                  </td>
                  <td>
                    ↑ {acc.activeUploads || 0} • ↓ {acc.activeDownloads || 0}
                  </td>
                </tr>
              ))}
              {dependencies.telegramPool.accounts.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '24px' }}>
                    No Telegram accounts registered. Local disk fallback active.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
