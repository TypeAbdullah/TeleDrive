import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AdminGatewayInfo } from '../../types/admin';

interface Props {
  gateway: AdminGatewayInfo | null;
  loading: boolean;
  onRefresh: () => void;
  onTestGateway: () => Promise<{
    status: string;
    httpStatus?: number;
    latencyMs: number;
    testedUrl: string;
    error?: string;
  }>;
}

export const AdminGatewayView: React.FC<Props> = ({
  gateway,
  loading,
  onRefresh,
  onTestGateway,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTest = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await onTestGateway();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ status: 'error', error: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading && !gateway) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        <Icon icon="lucide:loader-2" className="spin-animation" width="32" height="32" />
        <div style={{ marginTop: '12px' }}>Loading Cloudflare Gateway configuration...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:cloud" width="18" height="18" />
            Cloudflare Worker Streaming Gateway
          </div>
          <div className="admin-section-actions">
            <button onClick={onRefresh} className="btn-secondary">
              <Icon icon="lucide:refresh-cw" width="14" height="14" />
              Refresh
            </button>
            <button onClick={handleTest} disabled={testing} className="btn-primary">
              {testing ? (
                <Icon icon="lucide:loader-2" className="spin-animation" width="14" height="14" />
              ) : (
                <Icon icon="lucide:activity" width="14" height="14" />
              )}
              Run Connectivity Probe
            </button>
          </div>
        </div>

        {/* Diagnostic Probe Result Card */}
        {testResult && (
          <div
            style={{
              padding: '16px',
              backgroundColor: testResult.status === 'healthy' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${testResult.status === 'healthy' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: testResult.status === 'healthy' ? '#34d399' : '#f87171' }}>
              <Icon icon={testResult.status === 'healthy' ? 'lucide:check-circle' : 'lucide:alert-circle'} width="18" height="18" />
              <span>
                Gateway Connectivity Test: {testResult.status === 'healthy' ? 'REACHABLE & HEALTHY' : 'UNREACHABLE'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
              Target Probe URL: <code>{testResult.testedUrl}</code> • Latency: {testResult.latencyMs} ms
              {testResult.httpStatus && ` • HTTP Status: ${testResult.httpStatus}`}
            </div>
            {testResult.error && (
              <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>
                Error Diagnostic: {testResult.error}
              </div>
            )}
          </div>
        )}

        {/* Configuration Details Table */}
        <table className="admin-table">
          <thead>
            <tr>
              <th>Property</th>
              <th>Current Value</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Gateway URL</strong>
              </td>
              <td>
                <code>{gateway?.gatewayUrl}</code>
              </td>
              <td>Public hostname where Worker is served (e.g. https://download.example.com)</td>
            </tr>
            <tr>
              <td>
                <strong>Download Redirect</strong>
              </td>
              <td>
                <span className={`badge-pill ${gateway?.enabled ? 'badge-active' : 'badge-disabled'}`}>
                  {gateway?.enabled ? 'Redirect to Worker' : 'Direct Origin (Fallback)'}
                </span>
              </td>
              <td>Directs web downloads through Cloudflare Worker rather than Node.js origin</td>
            </tr>
            <tr>
              <td>
                <strong>Token Validity Lifetime</strong>
              </td>
              <td>{gateway?.tokenTtlSeconds} seconds ({Math.round((gateway?.tokenTtlSeconds || 0) / 60)} min)</td>
              <td>HMAC authorization token lifetime before automatic expiry</td>
            </tr>
            <tr>
              <td>
                <strong>Primary Signing Secret</strong>
              </td>
              <td>
                <span className="badge-pill badge-active">
                  {gateway?.secrets.primaryConfigured ? '✓ Configured' : 'Missing'}
                </span>
              </td>
              <td>HMAC-SHA-256 secret for cryptographic token signing (redacted for security)</td>
            </tr>
            <tr>
              <td>
                <strong>Rotation Secret (Secondary)</strong>
              </td>
              <td>
                <span className={`badge-pill ${gateway?.secrets.rotationConfigured ? 'badge-active' : 'badge-disabled'}`}>
                  {gateway?.secrets.rotationConfigured ? '✓ Active' : 'None (Single Key)'}
                </span>
              </td>
              <td>Secondary key used for zero-downtime signing secret rotation</td>
            </tr>
            <tr>
              <td>
                <strong>Internal Streaming Secret</strong>
              </td>
              <td>
                <span className="badge-pill badge-active">
                  {gateway?.secrets.internalConfigured ? '✓ Configured' : 'Missing'}
                </span>
              </td>
              <td>Shared secret protecting /api/v1/internal/download-stream against unauthorized access</td>
            </tr>
          </tbody>
        </table>

        {/* Deployment Guidance */}
        <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <h4 style={{ fontSize: '13px', color: '#f1f5f9', marginBottom: '8px' }}>
            <Icon icon="lucide:terminal" width="14" height="14" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Cloudflare Worker Deployment
          </h4>
          <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
            The Cloudflare Worker streaming gateway is implemented as a standalone, zero-dependency file in{' '}
            <code style={{ color: '#60a5fa' }}>workers/worker.js</code>. It can be deployed in one command:
          </p>
          <pre style={{ background: '#090d16', padding: '10px 14px', borderRadius: '6px', fontSize: '12px', color: '#38bdf8', marginTop: '8px', overflowX: 'auto' }}>
            npx wrangler deploy worker.js --name teledrive-gateway
          </pre>
        </div>
      </div>
    </div>
  );
};
