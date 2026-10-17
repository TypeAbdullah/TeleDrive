import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AdminCacheInfo } from '../../types/admin';

interface Props {
  cache: AdminCacheInfo | null;
  loading: boolean;
  onRefresh: () => void;
  onClearCache: () => Promise<void>;
}

export const AdminCacheView: React.FC<Props> = ({
  cache,
  loading,
  onRefresh,
  onClearCache,
}) => {
  const [clearing, setClearing] = useState(false);
  const [clearedMsg, setClearedMsg] = useState(false);

  const handleClear = async () => {
    if (!confirm('Flush in-memory L1 metadata cache? This will evict cached folder listings and user quotas, forcing fresh reads from MongoDB.')) {
      return;
    }

    try {
      setClearing(true);
      await onClearCache();
      setClearedMsg(true);
      setTimeout(() => setClearedMsg(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert(`Failed clearing cache: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  if (loading && !cache) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        <Icon icon="lucide:loader-2" className="spin-animation" width="32" height="32" />
        <div style={{ marginTop: '12px' }}>Loading cache metrics...</div>
      </div>
    );
  }

  const hitRatioPercent = Math.round((cache?.hitRatio || 0) * 100);

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:zap" width="18" height="18" />
            Cache Hierarchy & Performance
          </div>
          <div className="admin-section-actions">
            <button onClick={onRefresh} className="btn-secondary">
              <Icon icon="lucide:refresh-cw" width="14" height="14" />
              Refresh
            </button>
            <button onClick={handleClear} disabled={clearing} className="btn-danger">
              <Icon icon="lucide:trash-2" width="14" height="14" />
              {clearing ? 'Flushing...' : 'Flush L1 Cache'}
            </button>
          </div>
        </div>

        {clearedMsg && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              color: '#34d399',
              marginBottom: '16px',
            }}
          >
            ✓ In-memory L1 cache flushed cleanly.
          </div>
        )}

        <div className="admin-metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="admin-card">
            <div className="admin-card-header">
              <span>Hit Ratio</span>
              <Icon icon="lucide:pie-chart" width="16" height="16" color="#34d399" />
            </div>
            <div className="admin-card-value">{hitRatioPercent}%</div>
            <div className="admin-card-subtext">Overall lookup efficiency</div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span>Cache Hits</span>
              <Icon icon="lucide:check" width="16" height="16" color="#60a5fa" />
            </div>
            <div className="admin-card-value">{cache?.hits || 0}</div>
            <div className="admin-card-subtext">Avoided database lookups</div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span>Cache Misses</span>
              <Icon icon="lucide:x" width="16" height="16" color="#f87171" />
            </div>
            <div className="admin-card-value">{cache?.misses || 0}</div>
            <div className="admin-card-subtext">Resolved from MongoDB</div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span>L1 Active Entries</span>
              <Icon icon="lucide:layers" width="16" height="16" color="#a78bfa" />
            </div>
            <div className="admin-card-value">{cache?.l1EntryCount || 0}</div>
            <div className="admin-card-subtext">Capacity ceiling: 2000 items</div>
          </div>
        </div>

        {/* Cache Architecture Explainer */}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>Backend Engine</th>
              <th>Scope</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>L1 Cache</strong>
              </td>
              <td>In-Process LRU Memory Map</td>
              <td>Ephemeral metadata, quotas, folder trees (2000 entry ceiling)</td>
              <td>
                <span className="badge-pill badge-active">Active</span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>L2 Cache</strong>
              </td>
              <td>Redis (ioredis)</td>
              <td>Distributed cache, rate limit counters, coordination locks</td>
              <td>
                <span className={`badge-pill ${cache?.redisAvailable ? 'badge-active' : 'badge-disabled'}`}>
                  {cache?.redisAvailable ? 'Connected' : 'Single-Instance Fallback'}
                </span>
              </td>
            </tr>
            <tr>
              <td>
                <strong>L3 Cache</strong>
              </td>
              <td>Cloudflare Edge Cache API</td>
              <td>Immutable public downloads (Cache-Control: 86400s)</td>
              <td>
                <span className="badge-pill badge-active">Edge Enabled</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
