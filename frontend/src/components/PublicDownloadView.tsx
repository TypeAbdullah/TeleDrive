import React, { useState, useEffect } from 'react';
import { AppleCloudIcon, AppleFileIcon, TrafficLights } from './AppleIcons';
import { Icon } from '@iconify/react';

export const PublicDownloadView: React.FC<{ token: string }> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [fileData, setFileData] = useState<any>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchMetadata = async (pass?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = pass ? `?password=${encodeURIComponent(pass)}` : '';
      const res = await fetch(`/dl/${token}${query}`);
      const body = await res.json();

      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'File not found or link expired');
      }

      if (body.data.requiresPassword) {
        setRequiresPassword(true);
      } else {
        setFileData(body.data.file);
        setRequiresPassword(false);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    fetchMetadata(password);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const downloadUrl = `/dl/${token}/file${password ? `?password=${encodeURIComponent(password)}` : ''}`;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0b0c10 0%, #1f2833 100%)',
        padding: '20px',
      }}
    >
      <div
        className="macos-window"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(30, 30, 32, 0.85)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Title Bar */}
        <div
          style={{
            height: '42px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            position: 'relative',
          }}
        >
          <TrafficLights />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            TeleDrive Share
          </div>
        </div>

        {/* Content Box */}
        <div style={{ padding: '36px 30px', textAlign: 'center' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <AppleCloudIcon size={52} className="skeleton" />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Connecting to Telegram MTProto storage cluster...
              </p>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <Icon icon="lucide:alert-circle" width="44" height="44" color="var(--apple-red)" />
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Unable to Download File</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
            </div>
          ) : requiresPassword ? (
            <form onSubmit={handlePasswordSubmit} style={{ width: '100%' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Icon icon="lucide:lock" width="26" height="26" color="var(--apple-blue)" />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 600, marginBottom: '6px' }}>
                Password Protected File
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                This file requires a password to download.
              </p>

              <input
                type="password"
                placeholder="Enter Password"
                className="input"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ marginBottom: '16px' }}
              />

              <button
                type="submit"
                disabled={!password.trim()}
                className="macos-btn macos-btn-primary"
                style={{ width: '100%', height: '38px', justifyContent: 'center' }}
              >
                Unlock & Download
              </button>
            </form>
          ) : (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <AppleFileIcon
                  mimeType={fileData?.mimeType || ''}
                  name={fileData?.name || 'file'}
                  size={96}
                />
              </div>

              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  wordBreak: 'break-word',
                }}
              >
                {fileData?.name}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
                {formatBytes(fileData?.size || 0)} • Stored on Telegram MTProto
              </p>

              <a
                href={downloadUrl}
                download={fileData?.name}
                className="macos-btn macos-btn-primary"
                style={{
                  width: '100%',
                  height: '42px',
                  fontSize: '14.5px',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  boxShadow: '0 4px 15px rgba(0, 122, 255, 0.4)',
                }}
              >
                <Icon icon="lucide:download" width="16" height="16" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
