import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { AdminJobInfo } from '../../types/admin';

interface Props {
  jobs: AdminJobInfo[];
  loading: boolean;
  onRefresh: () => void;
  onRunJob: (jobId: string) => Promise<{ message: string; result: any }>;
}

export const AdminJobsView: React.FC<Props> = ({
  jobs,
  loading,
  onRefresh,
  onRunJob,
}) => {
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ id: string; message: string; result: any } | null>(null);

  const handleRun = async (jobId: string) => {
    try {
      setRunningJobId(jobId);
      setLastResult(null);
      const res = await onRunJob(jobId);
      setLastResult({ id: jobId, ...res });
    } catch (err: any) {
      alert(`Job execution failed: ${err.message}`);
    } finally {
      setRunningJobId(null);
    }
  };

  return (
    <div>
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:clock" width="18" height="18" />
            Background Maintenance Tasks ({jobs.length})
          </div>
          <button onClick={onRefresh} className="btn-secondary">
            <Icon icon="lucide:refresh-cw" width="14" height="14" />
            Refresh
          </button>
        </div>

        {lastResult && (
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              color: '#34d399',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <strong>{lastResult.message}:</strong>{' '}
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{JSON.stringify(lastResult.result)}</span>
            </div>
            <button
              onClick={() => setLastResult(null)}
              style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Job Name</th>
              <th>Description</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(j => {
              const isRunning = runningJobId === j.id;

              return (
                <tr key={j.id}>
                  <td>
                    <strong>{j.name}</strong>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{j.id}</div>
                  </td>
                  <td style={{ fontSize: '12.5px', color: '#cbd5e1', maxWidth: '350px' }}>{j.description}</td>
                  <td>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>{j.interval}</span>
                  </td>
                  <td>
                    <span className="badge-pill badge-active">{j.status}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleRun(j.id)}
                      disabled={isRunning}
                      className="btn-primary"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      {isRunning ? (
                        <Icon icon="lucide:loader-2" className="spin-animation" width="14" height="14" />
                      ) : (
                        <Icon icon="lucide:play" width="14" height="14" />
                      )}
                      Run Now
                    </button>
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && !loading && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                  No background maintenance jobs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
