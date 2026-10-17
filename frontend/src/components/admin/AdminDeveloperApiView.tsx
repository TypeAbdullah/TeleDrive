import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AdminDeveloperKey } from '../../types/admin';

interface Props {
  keys: AdminDeveloperKey[];
  loading: boolean;
  onRefresh: () => void;
  onCreateKey: (data: { name: string; scopes: string[]; rateLimit?: number }) => Promise<{
    keyId: string;
    rawApiKey: string;
    name: string;
    scopes: string[];
  }>;
  onRevokeKey: (keyId: string) => Promise<void>;
}

export const AdminDeveloperApiView: React.FC<Props> = ({
  keys,
  loading,
  onRefresh,
  onCreateKey,
  onRevokeKey,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['files:read', 'files:write']);
  const [rateLimit, setRateLimit] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<{ rawApiKey: string; name: string } | null>(null);

  const handleToggleScope = (scope: string) => {
    setScopes(prev => (prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      setSubmitting(true);
      const res = await onCreateKey({
        name: keyName.trim(),
        scopes,
        rateLimit: Number(rateLimit) || 60,
      });

      setCreatedKeyData(res);
      setKeyName('');
      onRefresh();
    } catch (err: any) {
      alert(`Failed to create API key: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:code" width="18" height="18" />
            Developer API Keys ({keys.length})
          </div>
          <div className="admin-section-actions">
            <a
              href="/developer/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{ textDecoration: 'none' }}
            >
              <Icon icon="lucide:file-text" width="14" height="14" />
              OpenAPI 3.0 Spec
            </a>
            <button onClick={onRefresh} className="btn-secondary">
              <Icon icon="lucide:refresh-cw" width="14" height="14" />
              Refresh
            </button>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
              <Icon icon="lucide:plus" width="16" height="16" />
              Generate API Key
            </button>
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Key Name</th>
              <th>Identifier (ID)</th>
              <th>Scopes</th>
              <th>Rate Limit</th>
              <th>Last Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.keyId}>
                <td>
                  <strong>{k.name}</strong>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Created {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td>
                  <code style={{ fontSize: '12px', color: '#38bdf8' }}>{k.keyId}</code>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {k.scopes.map(s => (
                      <span key={s} className="badge-pill badge-active" style={{ fontSize: '10.5px' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{k.rateLimit} req/min</td>
                <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}
                </td>
                <td>
                  <button
                    onClick={() => {
                      if (confirm(`Revoke API key "${k.name}" (${k.keyId})? This cannot be undone.`)) {
                        onRevokeKey(k.keyId);
                      }
                    }}
                    className="btn-danger"
                    style={{ padding: '4px 8px', fontSize: '11.5px' }}
                  >
                    <Icon icon="lucide:slash" width="12" height="12" />
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  No developer API keys have been generated.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      {isCreateModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <span>Generate Developer API Key</span>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreatedKeyData(null);
                }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {createdKeyData ? (
              <div className="admin-modal-body">
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#34d399',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '6px' }}>✓ API Key Generated Successfully!</div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    Copy this key now. For your security, it will <strong>never be shown again</strong>.
                  </div>
                </div>

                <div className="admin-input-group">
                  <label className="admin-label">Your Secret API Key</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      readOnly
                      value={createdKeyData.rawApiKey}
                      className="admin-input"
                      style={{ fontFamily: 'monospace', fontSize: '12px', color: '#38bdf8' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(createdKeyData.rawApiKey);
                        alert('Copied to clipboard!');
                      }}
                      className="btn-primary"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreatedKeyData(null);
                    }}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit}>
                <div className="admin-modal-body">
                  <div className="admin-input-group">
                    <label className="admin-label">Key Name / Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CI/CD Backup Service"
                      value={keyName}
                      onChange={e => setKeyName(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Assigned Permissions / Scopes</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {['files:read', 'files:write', 'shares:read', 'shares:write'].map(sc => (
                        <label
                          key={sc}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12.5px',
                            color: '#cbd5e1',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={scopes.includes(sc)}
                            onChange={() => handleToggleScope(sc)}
                          />
                          <code>{sc}</code>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="admin-input-group">
                    <label className="admin-label">Rate Limit (req/min)</label>
                    <input
                      type="number"
                      min={10}
                      max={5000}
                      value={rateLimit}
                      onChange={e => setRateLimit(Number(e.target.value))}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="admin-modal-footer">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-primary">
                    {submitting ? 'Generating...' : 'Generate Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
