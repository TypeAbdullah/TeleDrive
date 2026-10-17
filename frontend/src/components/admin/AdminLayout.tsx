import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { adminApi } from '../../lib/admin-api';
import {
  AdminOverview,
  AdminSystemSetting,
  AdminTelegramSession,
  AdminGatewayInfo,
  AdminCacheInfo,
  AdminDatabaseInfo,
  AdminDeveloperKey,
  AdminJobInfo,
  AdminAuditLog,
} from '../../types/admin';
import { AdminOverviewView } from './AdminOverviewView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminTelegramView } from './AdminTelegramView';
import { AdminTransfersView } from './AdminTransfersView';
import { AdminGatewayView } from './AdminGatewayView';
import { AdminCacheView } from './AdminCacheView';
import { AdminDatabaseView } from './AdminDatabaseView';
import { AdminDeveloperApiView } from './AdminDeveloperApiView';
import { AdminJobsView } from './AdminJobsView';
import { AdminAuditView } from './AdminAuditView';
import './admin.css';

interface Props {
  onExitAdmin: () => void;
}

export type AdminTab =
  | 'overview'
  | 'settings'
  | 'telegram'
  | 'transfers'
  | 'gateway'
  | 'cache'
  | 'database'
  | 'developer-api'
  | 'jobs'
  | 'audit';

export const AdminLayout: React.FC<Props> = ({ onExitAdmin }) => {
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isStreamingLive, setIsStreamingLive] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Data states
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [settings, setSettings] = useState<AdminSystemSetting[]>([]);
  const [telegramSessions, setTelegramSessions] = useState<AdminTelegramSession[]>([]);
  const [gatewayInfo, setGatewayInfo] = useState<AdminGatewayInfo | null>(null);
  const [cacheInfo, setCacheInfo] = useState<AdminCacheInfo | null>(null);
  const [databaseInfo, setDatabaseInfo] = useState<AdminDatabaseInfo | null>(null);
  const [developerKeys, setDeveloperKeys] = useState<AdminDeveloperKey[]>([]);
  const [jobs, setJobs] = useState<AdminJobInfo[]>([]);
  const [auditData, setAuditData] = useState<{
    items: AdminAuditLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load active tab data
  const loadTabData = async (tab: AdminTab) => {
    setLoading(true);
    try {
      if (tab === 'overview' || !overview) {
        const ov = await adminApi.getOverview().catch(() => null);
        if (ov) setOverview(ov);
      }
      if (tab === 'settings') {
        const s = await adminApi.getSettings().catch(() => []);
        setSettings(s);
      } else if (tab === 'telegram') {
        const sess = await adminApi.getTelegramSessions().catch(() => []);
        setTelegramSessions(sess);
      } else if (tab === 'gateway') {
        const gw = await adminApi.getGateway().catch(() => null);
        if (gw) setGatewayInfo(gw);
      } else if (tab === 'cache') {
        const c = await adminApi.getCache().catch(() => null);
        if (c) setCacheInfo(c);
      } else if (tab === 'database') {
        const db = await adminApi.getDatabase().catch(() => null);
        if (db) setDatabaseInfo(db);
      } else if (tab === 'developer-api') {
        const keys = await adminApi.getDeveloperKeys().catch(() => []);
        setDeveloperKeys(keys);
      } else if (tab === 'jobs') {
        const j = await adminApi.getJobs().catch(() => []);
        setJobs(j);
      } else if (tab === 'audit') {
        const a = await adminApi.getAuditLogs().catch(() => null);
        if (a) setAuditData(a);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(currentTab);
  }, [currentTab]);

  // Connect Server-Sent Events (SSE) for live stream
  useEffect(() => {
    try {
      const sse = new EventSource('/api/v1/admin/stream');
      sseRef.current = sse;

      sse.onopen = () => setIsStreamingLive(true);
      sse.onmessage = event => {
        try {
          const streamData = JSON.parse(event.data);
          setOverview(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              transfers: {
                ...prev.transfers,
                activeTotal: streamData.scheduler.activeTotal,
                activeUploads: streamData.scheduler.activeUploads,
                activeDownloads: streamData.scheduler.activeDownloads,
                queueDepth: streamData.scheduler.queueDepth,
                avgQueueWaitMs: streamData.scheduler.avgQueueWaitMs,
                totalCompleted: streamData.scheduler.totalCompleted,
                totalFailed: streamData.scheduler.totalFailed,
                bytesStreamed: streamData.download.totalBytesStreamed,
                activeStreams: streamData.download.activeStreams,
              },
              dependencies: {
                ...prev.dependencies,
                telegramPool: {
                  ...prev.dependencies.telegramPool,
                  accounts: streamData.accounts || prev.dependencies.telegramPool.accounts,
                },
              },
            };
          });
        } catch {}
      };

      sse.onerror = () => setIsStreamingLive(false);

      return () => {
        sse.close();
      };
    } catch {
      setIsStreamingLive(false);
    }
  }, []);

  return (
    <div className="admin-viewport">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className={`admin-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          {!isSidebarCollapsed && (
            <div className="admin-brand">
              <div className="admin-brand-icon">
                <Icon icon="lucide:shield" width="18" height="18" color="#ffffff" />
              </div>
              <span>TeleDrive Admin</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
            }}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon icon={isSidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'} width="18" height="18" />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-group-title">{!isSidebarCollapsed && 'Telemetry'}</div>
          <button
            onClick={() => setCurrentTab('overview')}
            className={`admin-nav-item ${currentTab === 'overview' ? 'active' : ''}`}
            title="System Overview"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:layout-dashboard" />
            </span>
            {!isSidebarCollapsed && 'System Overview'}
          </button>

          <div className="admin-nav-group-title">{!isSidebarCollapsed && 'Configuration'}</div>
          <button
            onClick={() => setCurrentTab('settings')}
            className={`admin-nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            title="Backend Settings"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:settings-2" />
            </span>
            {!isSidebarCollapsed && 'Settings & Config'}
          </button>

          <button
            onClick={() => setCurrentTab('transfers')}
            className={`admin-nav-item ${currentTab === 'transfers' ? 'active' : ''}`}
            title="Transfers Engine"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:arrow-up-down" />
            </span>
            {!isSidebarCollapsed && 'Transfers Engine'}
          </button>

          <div className="admin-nav-group-title">{!isSidebarCollapsed && 'Infrastructure'}</div>
          <button
            onClick={() => setCurrentTab('telegram')}
            className={`admin-nav-item ${currentTab === 'telegram' ? 'active' : ''}`}
            title="Telegram MTProto"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:send" />
            </span>
            {!isSidebarCollapsed && 'Telegram MTProto'}
          </button>

          <button
            onClick={() => setCurrentTab('gateway')}
            className={`admin-nav-item ${currentTab === 'gateway' ? 'active' : ''}`}
            title="Cloudflare Gateway"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:cloud" />
            </span>
            {!isSidebarCollapsed && 'Cloudflare Gateway'}
          </button>

          <button
            onClick={() => setCurrentTab('cache')}
            className={`admin-nav-item ${currentTab === 'cache' ? 'active' : ''}`}
            title="Cache & Performance"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:zap" />
            </span>
            {!isSidebarCollapsed && 'Cache Hierarchy'}
          </button>

          <button
            onClick={() => setCurrentTab('database')}
            className={`admin-nav-item ${currentTab === 'database' ? 'active' : ''}`}
            title="Database & Storage"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:database" />
            </span>
            {!isSidebarCollapsed && 'Database & Storage'}
          </button>

          <div className="admin-nav-group-title">{!isSidebarCollapsed && 'Operations'}</div>
          <button
            onClick={() => setCurrentTab('developer-api')}
            className={`admin-nav-item ${currentTab === 'developer-api' ? 'active' : ''}`}
            title="Developer API"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:code" />
            </span>
            {!isSidebarCollapsed && 'Developer API Keys'}
          </button>

          <button
            onClick={() => setCurrentTab('jobs')}
            className={`admin-nav-item ${currentTab === 'jobs' ? 'active' : ''}`}
            title="Background Jobs"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:clock" />
            </span>
            {!isSidebarCollapsed && 'Maintenance Tasks'}
          </button>

          <button
            onClick={() => setCurrentTab('audit')}
            className={`admin-nav-item ${currentTab === 'audit' ? 'active' : ''}`}
            title="Audit Trail"
          >
            <span className="admin-nav-item-icon">
              <Icon icon="lucide:shield-check" />
            </span>
            {!isSidebarCollapsed && 'Audit Trail'}
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button onClick={onExitAdmin} className="admin-return-btn">
            <Icon icon="lucide:arrow-left" width="14" height="14" />
            {!isSidebarCollapsed && 'Exit to Cloud Drive'}
          </button>
        </div>
      </aside>

      {/* ── Main Panel ───────────────────────────────────────────────────── */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <div className="admin-breadcrumbs">
              <span>Admin</span>
              <span>/</span>
              <span className="active" style={{ textTransform: 'capitalize' }}>
                {currentTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="admin-topbar-right">
            {/* Live SSE Pulse */}
            <div className="stream-pulse" title="Server-Sent Events Real-Time Connection">
              <span className="stream-pulse-dot" style={{ backgroundColor: isStreamingLive ? '#10b981' : '#f59e0b' }} />
              <span>{isStreamingLive ? 'Live Telemetry' : 'Polling'}</span>
            </div>

            {/* Environment Badge */}
            <span className="badge-env">
              {overview?.system.nodeEnv || 'development'}
            </span>

            {/* Health Badge */}
            <span className={`badge-status ${overview?.system.maintenanceMode ? 'maintenance' : 'healthy'}`}>
              <span className="badge-status-dot" />
              <span>{overview?.system.maintenanceMode ? 'Maintenance' : 'Operational'}</span>
            </span>
          </div>
        </header>

        {/* Maintenance Mode Banner */}
        {overview?.system.maintenanceMode && (
          <div className="admin-maintenance-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon icon="lucide:alert-triangle" width="16" height="16" />
              <span>
                <strong>Maintenance Mode Active:</strong> Non-admin user requests are currently blocked.
              </span>
            </div>
            <button
              onClick={() => setCurrentTab('settings')}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Configure
            </button>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: '80px',
              right: '24px',
              padding: '12px 18px',
              backgroundColor: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon icon={toastMessage.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width="18" height="18" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Content View Router */}
        <div className="admin-content-area">
          {currentTab === 'overview' && (
            <AdminOverviewView
              data={overview}
              loading={loading}
              onRefresh={() => loadTabData('overview')}
            />
          )}

          {currentTab === 'settings' && (
            <AdminSettingsView
              settings={settings}
              loading={loading}
              onSaveSetting={async (key, val, expectedVersion) => {
                await adminApi.updateSetting(key, val, expectedVersion);
                showToast(`Setting "${key}" updated successfully!`);
                loadTabData('settings');
              }}
              onResetCategory={async cat => {
                await adminApi.resetSettings(cat);
                showToast(`Category "${cat}" reset to defaults!`);
                loadTabData('settings');
              }}
            />
          )}

          {currentTab === 'transfers' && (
            <AdminTransfersView
              overview={overview}
              onNavigateToSettings={_category => setCurrentTab('settings')}
            />
          )}

          {currentTab === 'telegram' && (
            <AdminTelegramView
              sessions={telegramSessions}
              loading={loading}
              onRefresh={() => loadTabData('telegram')}
              onAddSession={async data => {
                await adminApi.addTelegramSession(data);
                showToast('Storage node registered into MTProto pool!');
              }}
              onToggleSession={async (id, status) => {
                await adminApi.toggleTelegramSession(id, status);
                showToast(`Session status changed to ${status}`);
                loadTabData('telegram');
              }}
              onDeleteSession={async id => {
                await adminApi.deleteTelegramSession(id);
                showToast('Session removed from pool');
                loadTabData('telegram');
              }}
              onTestSession={async id => {
                return adminApi.testTelegramSession(id);
              }}
              onReconnectSession={async id => {
                await adminApi.reconnectTelegramSession(id);
                showToast('Reconnection dispatched');
                loadTabData('telegram');
              }}
            />
          )}

          {currentTab === 'gateway' && (
            <AdminGatewayView
              gateway={gatewayInfo}
              loading={loading}
              onRefresh={() => loadTabData('gateway')}
              onTestGateway={() => adminApi.testGateway()}
            />
          )}

          {currentTab === 'cache' && (
            <AdminCacheView
              cache={cacheInfo}
              loading={loading}
              onRefresh={() => loadTabData('cache')}
              onClearCache={async () => {
                await adminApi.clearCache();
                showToast('L1 cache cleared successfully');
              }}
            />
          )}

          {currentTab === 'database' && (
            <AdminDatabaseView
              db={databaseInfo}
              loading={loading}
              onRefresh={() => loadTabData('database')}
            />
          )}

          {currentTab === 'developer-api' && (
            <AdminDeveloperApiView
              keys={developerKeys}
              loading={loading}
              onRefresh={() => loadTabData('developer-api')}
              onCreateKey={async data => {
                const res = await adminApi.createDeveloperKey(data);
                showToast('API key generated');
                return res;
              }}
              onRevokeKey={async keyId => {
                await adminApi.revokeDeveloperKey(keyId);
                showToast('API key revoked');
                loadTabData('developer-api');
              }}
            />
          )}

          {currentTab === 'jobs' && (
            <AdminJobsView
              jobs={jobs}
              loading={loading}
              onRefresh={() => loadTabData('jobs')}
              onRunJob={async jobId => {
                const res = await adminApi.runJob(jobId);
                showToast(`Job ${jobId} executed`);
                return res;
              }}
            />
          )}

          {currentTab === 'audit' && (
            <AdminAuditView
              auditData={auditData}
              loading={loading}
              onRefresh={(page, cat) => {
                adminApi.getAuditLogs(page, 50, cat).then(setAuditData);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
