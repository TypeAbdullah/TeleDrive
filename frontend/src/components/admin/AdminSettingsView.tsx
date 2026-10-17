import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { AdminSystemSetting } from '../../types/admin';

interface Props {
  settings: AdminSystemSetting[];
  loading: boolean;
  onSaveSetting: (key: string, value: any, expectedVersion: number) => Promise<void>;
  onResetCategory: (category: string) => Promise<void>;
}

const CATEGORIES = [
  { id: 'application', label: 'Application & Core', icon: 'lucide:sliders' },
  { id: 'request_handling', label: 'Request Limits', icon: 'lucide:activity' },
  { id: 'telegram', label: 'Telegram MTProto', icon: 'lucide:send' },
  { id: 'transfers', label: 'Transfers Engine', icon: 'lucide:arrow-up-down' },
  { id: 'gateway', label: 'Cloudflare Gateway', icon: 'lucide:cloud' },
  { id: 'cache', label: 'Cache & TTLs', icon: 'lucide:zap' },
];

export const AdminSettingsView: React.FC<Props> = ({
  settings,
  loading,
  onSaveSetting,
  onResetCategory,
}) => {
  const [activeCategory, setActiveCategory] = useState('application');
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveSuccessKey, setSaveSuccessKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initial settings into state
  useEffect(() => {
    const initial: Record<string, any> = {};
    for (const s of settings) {
      initial[s.key] = s.value;
    }
    setEditValues(initial);
  }, [settings]);

  const categorySettings = settings.filter(s => s.category === activeCategory);

  // Identify unsaved keys
  const unsavedKeys = settings.filter(s => editValues[s.key] !== s.value).map(s => s.key);

  const handleValueChange = (key: string, val: any) => {
    setEditValues(prev => ({ ...prev, [key]: val }));
    setErrorMsg(null);
  };

  const handleSaveIndividual = async (setting: AdminSystemSetting) => {
    try {
      setSavingKey(setting.key);
      setErrorMsg(null);
      await onSaveSetting(setting.key, editValues[setting.key], setting.version);
      setSaveSuccessKey(setting.key);
      setTimeout(() => setSaveSuccessKey(null), 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed saving setting');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAllUnsaved = async () => {
    try {
      setErrorMsg(null);
      for (const key of unsavedKeys) {
        const s = settings.find(item => item.key === key);
        if (s) {
          setSavingKey(s.key);
          await onSaveSetting(s.key, editValues[s.key], s.version);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed saving updates');
    } finally {
      setSavingKey(null);
    }
  };

  const handleDiscardChanges = () => {
    const reset: Record<string, any> = {};
    for (const s of settings) {
      reset[s.key] = s.value;
    }
    setEditValues(reset);
    setErrorMsg(null);
  };

  if (loading && settings.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
        <Icon icon="lucide:loader-2" className="spin-animation" width="32" height="32" />
        <div style={{ marginTop: '12px' }}>Loading configuration schema...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`btn-secondary ${activeCategory === cat.id ? 'active' : ''}`}
            style={{
              backgroundColor: activeCategory === cat.id ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
              color: activeCategory === cat.id ? '#ffffff' : '#94a3b8',
              borderColor: activeCategory === cat.id ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <Icon icon={cat.icon} width="16" height="16" />
            {cat.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#f87171',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon icon="lucide:alert-triangle" width="18" height="18" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Settings List */}
      <div className="admin-section">
        <div className="admin-section-header">
          <div className="admin-section-title">
            <Icon icon="lucide:sliders" width="18" height="18" />
            {CATEGORIES.find(c => c.id === activeCategory)?.label} Settings
          </div>
          <button
            onClick={() => {
              if (confirm(`Reset all settings in "${activeCategory}" to their factory defaults?`)) {
                onResetCategory(activeCategory);
              }
            }}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            <Icon icon="lucide:rotate-ccw" width="14" height="14" />
            Reset Category to Defaults
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {categorySettings.map(setting => {
            const isDirty = editValues[setting.key] !== setting.value;
            const isSaving = savingKey === setting.key;
            const isSuccess = saveSuccessKey === setting.key;

            return (
              <div
                key={setting.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '16px',
                  backgroundColor: isDirty ? 'rgba(59, 130, 246, 0.04)' : 'rgba(0, 0, 0, 0.15)',
                  border: isDirty ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  gap: '24px',
                }}
              >
                {/* Left: Metadata */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '14px' }}>{setting.label}</span>
                    {setting.requiresRestart && (
                      <span className="badge-pill badge-cooldown" style={{ fontSize: '10px' }}>
                        Restart Required
                      </span>
                    )}
                    {isDirty && (
                      <span className="badge-pill badge-active" style={{ fontSize: '10px' }}>
                        Modified
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                    {setting.description}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                    Key: {setting.key} • Default: {String(setting.defaultValue)} • v{setting.version}
                  </div>
                </div>

                {/* Right: Input Control & Individual Save */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '280px', justifyContent: 'flex-end' }}>
                  {setting.valueType === 'boolean' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(editValues[setting.key])}
                        onChange={e => handleValueChange(setting.key, e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '13px', color: '#cbd5e1' }}>
                        {editValues[setting.key] ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  ) : setting.allowedValues && setting.allowedValues.length > 0 ? (
                    <select
                      value={editValues[setting.key] || ''}
                      onChange={e => handleValueChange(setting.key, e.target.value)}
                      className="admin-input"
                      style={{ width: '160px' }}
                    >
                      {setting.allowedValues.map((v: any) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={setting.valueType === 'number' ? 'number' : 'text'}
                      value={editValues[setting.key] ?? ''}
                      min={setting.min}
                      max={setting.max}
                      onChange={e => handleValueChange(setting.key, e.target.value)}
                      className="admin-input"
                      style={{ width: '180px' }}
                    />
                  )}

                  {isDirty && (
                    <button
                      onClick={() => handleSaveIndividual(setting)}
                      disabled={isSaving}
                      className="btn-primary"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      {isSaving ? (
                        <Icon icon="lucide:loader-2" className="spin-animation" width="14" height="14" />
                      ) : (
                        <Icon icon="lucide:check" width="14" height="14" />
                      )}
                      Save
                    </button>
                  )}

                  {isSuccess && (
                    <span style={{ color: '#34d399', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon icon="lucide:check-circle" width="14" height="14" />
                      Saved!
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Unsaved Changes Bar */}
      {unsavedKeys.length > 0 && (
        <div className="unsaved-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon icon="lucide:alert-circle" width="20" height="20" color="#60a5fa" />
            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
              You have {unsavedKeys.length} unsaved configuration change(s).
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleDiscardChanges} className="btn-secondary">
              Discard Changes
            </button>
            <button onClick={handleSaveAllUnsaved} disabled={Boolean(savingKey)} className="btn-primary">
              {savingKey ? (
                <Icon icon="lucide:loader-2" className="spin-animation" width="16" height="16" />
              ) : (
                <Icon icon="lucide:save" width="16" height="16" />
              )}
              Save All Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
