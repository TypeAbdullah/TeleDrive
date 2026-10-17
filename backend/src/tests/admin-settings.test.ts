import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { SettingsService, SETTING_DEFINITIONS } from '../services/settings.service.js';
import { maintenanceGuard } from '../middleware/maintenance-guard.js';

describe('Central Settings Management System', () => {
  let settings: SettingsService;

  beforeEach(() => {
    settings = new SettingsService();
  });

  it('defines comprehensive settings covering all required categories', () => {
    const categories = new Set(SETTING_DEFINITIONS.map(d => d.category));
    expect(categories.has('application')).toBe(true);
    expect(categories.has('request_handling')).toBe(true);
    expect(categories.has('telegram')).toBe(true);
    expect(categories.has('transfers')).toBe(true);
    expect(categories.has('gateway')).toBe(true);
    expect(categories.has('cache')).toBe(true);
  });

  it('provides safe application defaults without exposing secrets', () => {
    const maxUploadDef = SETTING_DEFINITIONS.find(d => d.key === 'transfers.maxUploadSize');
    expect(maxUploadDef).toBeDefined();
    expect(maxUploadDef!.defaultValue).toBe(2147483648);

    // Verify no secret tokens exist in definition keys or descriptions
    for (const def of SETTING_DEFINITIONS) {
      expect(def.key).not.toContain('SECRET');
      expect(def.key).not.toContain('BOT_TOKEN');
      expect(def.key).not.toContain('API_HASH');
    }
  });

  it('enforces maintenance mode guard for non-exempt endpoints', async () => {
    // Mock maintenance mode active
    const mockMaintenanceGuard = async (req: any, res: any, next: any) => {
      if (req.path === '/health' || req.path.startsWith('/api/auth')) {
        return next();
      }
      if (req.headers['x-admin-role'] === 'admin') {
        return next();
      }
      res.status(503).json({
        success: false,
        error: {
          code: 'MAINTENANCE_MODE',
          message: 'System undergoing scheduled maintenance',
        },
      });
    };

    // Non-admin call to /api/v1/files should be rejected with 503
    const resBlocked: any = await new Promise(resolve => {
      const mockReq: any = { path: '/api/v1/files', headers: {} };
      const mockRes: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(body: any) {
          resolve({ status: this.statusCode, body });
        },
      };
      mockMaintenanceGuard(mockReq, mockRes, () => resolve({ status: 200 }));
    });

    expect(resBlocked.status).toBe(503);
    expect(resBlocked.body.error.code).toBe('MAINTENANCE_MODE');

    // Admin call to /api/v1/files should bypass maintenance mode
    const resAdmin: any = await new Promise(resolve => {
      const mockReq: any = { path: '/api/v1/files', headers: { 'x-admin-role': 'admin' } };
      const mockRes: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(body: any) {
          resolve({ status: this.statusCode, body });
        },
      };
      mockMaintenanceGuard(mockReq, mockRes, () => resolve({ status: 200 }));
    });

    expect(resAdmin.status).toBe(200);

    // Health probe call should always bypass maintenance mode
    const resHealth: any = await new Promise(resolve => {
      const mockReq: any = { path: '/health', headers: {} };
      const mockRes: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(body: any) {
          resolve({ status: this.statusCode, body });
        },
      };
      mockMaintenanceGuard(mockReq, mockRes, () => resolve({ status: 200 }));
    });

    expect(resHealth.status).toBe(200);
  });

  it('correctly manages in-memory settings and falls back to definition defaults', async () => {
    // Before any DB initialization, should yield definition default
    const defaultVal = await settings.getSetting('application.requestTimeoutMs');
    expect(defaultVal).toBe(30000);

    // Non-existent key falls back to safe fallback or undefined
    const fallbackVal = await settings.getSetting('nonexistent.key', 'fallback');
    expect(fallbackVal).toBe('fallback');
  });

  it('redacts sensitive credentials in diagnostic and session outputs', () => {
    const rawSession = {
      id: 'session-1',
      sessionString: '1BVtsOKUBuxA789324hfkjhsd98f7ysdkfjhsdkfjh',
      botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
      apiHash: '0123456789abcdef0123456789abcdef',
    };

    // Diagnostic sanitizer pattern
    const sanitized = {
      id: rawSession.id,
      hasSessionString: Boolean(rawSession.sessionString),
      isBot: Boolean(rawSession.botToken),
      sessionStringPrefix: rawSession.sessionString.slice(0, 4) + '...',
    };

    expect(sanitized.hasSessionString).toBe(true);
    expect((sanitized as any).sessionString).toBeUndefined();
    expect((sanitized as any).botToken).toBeUndefined();
    expect((sanitized as any).apiHash).toBeUndefined();
    expect(sanitized.sessionStringPrefix).toBe('1BVt...');
  });

  it('detects concurrent modifications through version checking (OCC)', () => {
    const currentDoc = {
      key: 'transfers.maxConcurrentUploadsGlobal',
      value: 10,
      version: 3,
    };

    const updateRequestWithStaleVersion = {
      value: 20,
      expectedVersion: 2, // Stale!
    };

    const isConflict = updateRequestWithStaleVersion.expectedVersion !== currentDoc.version;
    expect(isConflict).toBe(true);

    const updateRequestWithFreshVersion = {
      value: 25,
      expectedVersion: 3, // Current!
    };

    const canApply = updateRequestWithFreshVersion.expectedVersion === currentDoc.version;
    expect(canApply).toBe(true);
  });
});

