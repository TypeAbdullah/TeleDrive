import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { TeleFile, TeleFolder, StorageAccountInfo, ApiKeyInfo } from '../types';

/* ─── NEW FOLDER MODAL ─────────────────────────────────────────────────── */
export const SaaSNewFolderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}> = ({ isOpen, onClose, onCreate }) => {
  const [folderName, setFolderName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderName.trim()) {
      onCreate(folderName.trim());
      setFolderName('');
      onClose();
    }
  };

  return (
    <div className="saas-modal-overlay" onClick={onClose}>
      <div className="saas-modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon icon="lucide:folder-plus" width="20" height="20" color="var(--primary-blue)" />
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>New Folder</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon icon="lucide:x" width="18" height="18" color="#64748b" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="saas-input"
            placeholder="Folder name"
            autoFocus
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            style={{ marginBottom: '20px' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn-ghost-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="btn-primary-blue"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── RENAME MODAL ─────────────────────────────────────────────────────── */
export const SaaSRenameModal: React.FC<{
  isOpen: boolean;
  item: TeleFile | TeleFolder | null;
  type: 'file' | 'folder';
  onClose: () => void;
  onRename: (newName: string) => void;
}> = ({ isOpen, item, type, onClose, onRename }) => {
  const [name, setName] = useState(item?.name || '');

  React.useEffect(() => {
    if (item) setName(item.name);
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRename(name.trim());
      onClose();
    }
  };

  return (
    <div className="saas-modal-overlay" onClick={onClose}>
      <div className="saas-modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Rename {type === 'folder' ? 'Folder' : 'File'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon icon="lucide:x" width="18" height="18" color="#64748b" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="saas-input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: '20px' }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={onClose} className="btn-ghost-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-primary-blue"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── SHARE & MANAGE ACCESS MODAL ──────────────────────────────────────── */
export const SaaSShareModal: React.FC<{
  isOpen: boolean;
  file: TeleFile | null;
  onClose: () => void;
  onCreateShare: (params: {
    fileId: string;
    accessType?: 'public' | 'password';
    password?: string;
    expiresInDays?: number;
  }) => Promise<{ shareUrl: string }>;
}> = ({ isOpen, file, onClose, onCreateShare }) => {
  const [accessType, setAccessType] = useState<'public' | 'password'>('public');
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !file) return null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await onCreateShare({
        fileId: file._id,
        accessType,
        password: accessType === 'password' ? password : undefined,
        expiresInDays,
      });
      setShareUrl(`${window.location.origin}${res.shareUrl}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="saas-modal-overlay" onClick={onClose}>
      <div className="saas-modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Share "{file.name}"</h3>
            <p style={{ fontSize: '12.5px', color: '#64748b' }}>Generate secure download link</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon icon="lucide:x" width="18" height="18" color="#64748b" />
          </button>
        </div>

        {shareUrl ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '16px',
              }}
            >
              <input
                readOnly
                value={shareUrl}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0f172a',
                  width: '100%',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button onClick={handleCopy} className="btn-primary-blue" style={{ padding: '6px 12px' }}>
                <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} width="14" height="14" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button onClick={onClose} className="btn-ghost-secondary" style={{ width: '100%' }}>
              Done
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setAccessType('public')}
                className={accessType === 'public' ? 'btn-primary-blue' : 'btn-ghost-secondary'}
                style={{ flex: 1 }}
              >
                Public Link
              </button>
              <button
                type="button"
                onClick={() => setAccessType('password')}
                className={accessType === 'password' ? 'btn-primary-blue' : 'btn-ghost-secondary'}
                style={{ flex: 1 }}
              >
                Password Protected
              </button>
            </div>

            {accessType === 'password' && (
              <input
                type="password"
                placeholder="Enter download password"
                className="saas-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ marginBottom: '14px' }}
              />
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                Expiration
              </label>
              <select
                className="saas-input"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
              >
                <option value={1}>Expires in 24 Hours</option>
                <option value={7}>Expires in 7 Days</option>
                <option value={30}>Expires in 30 Days</option>
                <option value={0}>Never Expires</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={onClose} className="btn-ghost-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading || (accessType === 'password' && !password)}
                className="btn-primary-blue"
              >
                {loading ? 'Generating...' : 'Create Link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── STORAGE ACCOUNTS MANAGEMENT MODAL ────────────────────────────────── */
export const SaaSAccountsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  accounts: StorageAccountInfo[];
  onAddAccount: (data: { label: string; botToken: string; storagePeerId?: string }) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
}> = ({ isOpen, onClose, accounts, onAddAccount, onDeleteAccount }) => {
  const [label, setLabel] = useState('');
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !botToken.trim()) return;

    setLoading(true);
    try {
      await onAddAccount({
        label: label.trim(),
        botToken: botToken.trim(),
        storagePeerId: channelId.trim() || 'me',
      });
      setLabel('');
      setBotToken('');
      setChannelId('');
      setIsAdding(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="saas-modal-overlay" onClick={onClose}>
      <div className="saas-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Storage Nodes & Accounts</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>Configure multi-account storage pool</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon icon="lucide:x" width="18" height="18" color="#64748b" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
          {accounts.map((acc) => (
            <div
              key={acc._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{acc.label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: acc.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: acc.status === 'active' ? '#16a34a' : '#dc2626',
                    }}
                  >
                    {acc.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Target: {String(acc.storagePeerId)}
                </div>
              </div>

              {acc._id !== 'local_storage' && (
                <button
                  onClick={() => onDeleteAccount(acc._id)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                >
                  <Icon icon="lucide:trash-2" width="16" height="16" />
                </button>
              )}
            </div>
          ))}
        </div>

        {isAdding ? (
          <form onSubmit={handleAdd} style={{ padding: '14px', background: '#f8fafc', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px' }}>Attach New Bot Account</h4>
            <input
              type="text"
              placeholder="Account Label (e.g. Storage Bot 1)"
              className="saas-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{ marginBottom: '8px' }}
              required
            />
            <input
              type="text"
              placeholder="Bot Token (from @BotFather)"
              className="saas-input"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              style={{ marginBottom: '8px' }}
              required
            />
            <input
              type="text"
              placeholder="Channel/Peer ID (default: 'me')"
              className="saas-input"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              style={{ marginBottom: '14px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" onClick={() => setIsAdding(false)} className="btn-ghost-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary-blue">
                {loading ? 'Connecting...' : 'Add Account'}
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setIsAdding(true)} className="btn-ghost-secondary" style={{ width: '100%' }}>
            + Add Storage Account
          </button>
        )}
      </div>
    </div>
  );
};

/* ─── DEVELOPER API KEYS MODAL ─────────────────────────────────────────── */
export const SaaSDeveloperModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeyInfo[];
  onCreateKey: (name: string) => Promise<{ secretKey: string }>;
  onRevokeKey: (keyId: string) => Promise<void>;
}> = ({ isOpen, onClose, apiKeys, onCreateKey, onRevokeKey }) => {
  const [name, setName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await onCreateKey(name.trim());
      setCreatedSecret(res.secretKey);
      setName('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="saas-modal-overlay" onClick={onClose}>
      <div className="saas-modal-card" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Developer API Keys</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>Manage API access tokens for external apps</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Icon icon="lucide:x" width="18" height="18" color="#64748b" />
          </button>
        </div>

        {createdSecret && (
          <div style={{ padding: '12px', background: '#ecfdf5', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '12.5px', fontWeight: 600, color: '#059669', marginBottom: '6px' }}>
              Secret Key Created:
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input readOnly value={createdSecret} className="saas-input" style={{ fontFamily: 'monospace' }} />
              <button onClick={handleCopy} className="btn-primary-blue">
                <Icon icon={copied ? 'lucide:check' : 'lucide:copy'} width="14" height="14" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
          {apiKeys.map((k) => (
            <div
              key={k._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{k.name}</span>
                <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>{k.keyPreview}</div>
              </div>
              <button
                onClick={() => onRevokeKey(k.keyId)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
              >
                <Icon icon="lucide:trash-2" width="16" height="16" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Key Name (e.g. Webhook API)"
            className="saas-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" disabled={loading || !name.trim()} className="btn-primary-blue">
            Create Key
          </button>
        </form>
      </div>
    </div>
  );
};
