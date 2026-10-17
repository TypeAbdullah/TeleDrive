import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AdminTelegramSession } from '../../types/admin';

interface Props {
  sessions: AdminTelegramSession[];
  loading: boolean;
  onRefresh: () => void;
  onAddSession: (data: any) => Promise<void>;
  onToggleSession: (id: string, status: 'active' | 'disabled') => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
  onTestSession: (id: string) => Promise<{ latencyMs: number; isReady: boolean }>;
  onReconnectSession: (id: string) => Promise<void>;
}

export const AdminTelegramView: React.FC<Props> = ({
  sessions,
  loading,
  onRefresh,
  onAddSession,
  onToggleSession,
  onDeleteSession,
  onTestSession,
  onReconnectSession,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; latencyMs: number; isReady: boolean } | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [botToken, setBotToken] = useState('');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [storagePeerId, setStoragePeerId] = useState('me');
  const [priority, setPriority] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    try {
      setTestingId(id);
      setTestResult(null);
      const res = await onTestSession(id);
      setTestResult({ id, ...res });
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setErrorMsg('Label is required');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await onAddSession({
        label: label.trim(),
        botToken: botToken.trim() || undefined,
        apiId: apiId ? Number(apiId) : undefined,
        apiHash: apiHash.trim() || undefined,
        storagePeerId: storagePeerId.trim() || 'me',
        priority: Number(priority) || 1,
      });

      setIsAddModalOpen(false);
      setLabel('');
      setBotToken('');
      setApiId('');
      setApiHash('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed adding account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:send" width="18" height="18" />
            Telegram MTProto Storage Nodes ({sessions.length})
          </div>
          <div className="admin-section-actions">
            <button onClick={onRefresh} className="btn-secondary" style={{ padding: '6px 12px' }}>
              <Icon icon="lucide:refresh-cw" width="14" height="14" />
              Refresh
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="btn-primary">
              <Icon icon="lucide:plus" width="16" height="16" />
              Add Storage Node
            </button>
          </div>
        </div>

        {testResult && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              color: '#34d399',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              <strong>Connectivity Diagnostic Passed:</strong> Ping response received in {testResult.latencyMs} ms
              (Ready: {testResult.isReady ? 'Yes' : 'No'}).
            </span>
            <button onClick={() => setTestResult(null)} style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        )}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Node / Account</th>
              <th>Health Score</th>
              <th>Status</th>
              <th>Circuit Breaker</th>
              <th>Workload</th>
              <th>Throughput & Latency</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(acc => {
              const isTesting = testingId === acc._id;
              const isCoolingDown = acc.status === 'cooldown' && acc.floodWaitUntil;

              return (
                <tr key={acc._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{acc.label}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {acc._id} • Peer: {acc.storagePeerId}
                    </div>
                    {acc.botTokenMasked && (
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Token: {acc.botTokenMasked}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '15px',
                          color: acc.score > 70 ? '#34d399' : acc.score > 30 ? '#fbbf24' : '#f87171',
                        }}
                      >
                        {acc.score}/100
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge-pill badge-${acc.status}`}>
                      {acc.status}
                    </span>
                    {isCoolingDown && (
                      <div style={{ fontSize: '10.5px', color: '#fbbf24', marginTop: '4px' }}>
                        Wait until {new Date(acc.floodWaitUntil!).toLocaleTimeString()}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          acc.circuitBreaker === 'closed'
                            ? 'rgba(100, 116, 139, 0.2)'
                            : acc.circuitBreaker === 'half-open'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        color:
                          acc.circuitBreaker === 'closed'
                            ? '#94a3b8'
                            : acc.circuitBreaker === 'half-open'
                            ? '#fbbf24'
                            : '#f87171',
                      }}
                    >
                      {acc.circuitBreaker}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: '#cbd5e1' }}>
                      ↑ {acc.activeUploads} active • ↓ {acc.activeDownloads} active
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{acc.avgLatencyMs} ms avg</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {(acc.throughputBytesPerSec / (1024 * 1024)).toFixed(2)} MB/s EMA
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleTest(acc._id)}
                        disabled={isTesting}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        title="Test latency and connectivity"
                      >
                        {isTesting ? (
                          <Icon icon="lucide:loader-2" className="spin-animation" width="12" height="12" />
                        ) : (
                          <Icon icon="lucide:zap" width="12" height="12" />
                        )}
                        Test
                      </button>

                      <button
                        onClick={() => onReconnectSession(acc._id)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        title="Reconnect MTProto client with jittered backoff"
                      >
                        <Icon icon="lucide:refresh-cw" width="12" height="12" />
                      </button>

                      <button
                        onClick={() => onToggleSession(acc._id, acc.status === 'active' ? 'disabled' : 'active')}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        title={acc.status === 'active' ? 'Disable session' : 'Enable session'}
                      >
                        <Icon icon={acc.status === 'active' ? 'lucide:pause' : 'lucide:play'} width="12" height="12" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Remove storage account "${acc.label}" permanently?`)) {
                            onDeleteSession(acc._id);
                          }
                        }}
                        className="btn-danger"
                        style={{ padding: '4px 8px', fontSize: '11.5px' }}
                        title="Remove account from pool"
                      >
                        <Icon icon="lucide:trash-2" width="12" height="12" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {sessions.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  No MTProto storage accounts registered. System is currently operating on Local Disk Fallback.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Session Modal */}
      {isAddModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <span>Register MTProto Storage Node</span>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="admin-modal-body">
                {errorMsg && (
                  <div style={{ color: '#f87171', fontSize: '12.5px' }}>{errorMsg}</div>
                )}

                <div className="admin-input-group">
                  <label className="admin-label">Account Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EU Bot Node #1"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    className="admin-input"
                  />
                </div>

                <div className="admin-input-group">
                  <label className="admin-label">Telegram Bot Token *</label>
                  <input
                    type="password"
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={botToken}
                    onChange={e => setBotToken(e.target.value)}
                    className="admin-input"
                  />
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Stored encrypted with AES-256 using TELEGRAM_SESSION_ENCRYPTION_KEY.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group">
                    <label className="admin-label">Telegram API ID (Optional)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1234567"
                      value={apiId}
                      onChange={e => setApiId(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Telegram API Hash (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. a1b2c3d4..."
                      value={apiHash}
                      onChange={e => setApiHash(e.target.value)}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="admin-input-group">
                    <label className="admin-label">Target Peer ID</label>
                    <input
                      type="text"
                      value={storagePeerId}
                      onChange={e => setStoragePeerId(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Priority (1-10)</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={priority}
                      onChange={e => setPriority(Number(e.target.value))}
                      className="admin-input"
                    />
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Registering...' : 'Register Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
