import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager } from '../infrastructure/cache/cache-manager.js';

describe('CacheManager (L1 LRU & Multi-Tier Cache)', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager(3); // Small capacity of 3 to test LRU eviction
  });

  it('stores and retrieves cached items in L1 memory', async () => {
    await cache.set('file:1', { name: 'document.pdf', size: 1000 }, 60);

    const result = await cache.get<{ name: string; size: number }>('file:1');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('document.pdf');
    expect(result?.size).toBe(1000);
  });

  it('evicts oldest accessed key when reaching capacity (LRU)', async () => {
    await cache.set('key-1', 'val-1', 60);
    await cache.set('key-2', 'val-2', 60);
    await cache.set('key-3', 'val-3', 60);

    // Access key-1 to refresh its LRU position
    await cache.get('key-1');

    // Add 4th item, exceeding capacity 3. key-2 should be evicted!
    await cache.set('key-4', 'val-4', 60);

    expect(await cache.get('key-1')).toBe('val-1');
    expect(await cache.get('key-2')).toBeNull(); // Evicted!
    expect(await cache.get('key-3')).toBe('val-3');
    expect(await cache.get('key-4')).toBe('val-4');
  });

  it('expires items past their TTL', async () => {
    // 0-second TTL (expires immediately)
    await cache.set('temp', 'data', -1);
    expect(await cache.get('temp')).toBeNull();
  });

  it('tracks hit and miss metrics accurately', async () => {
    await cache.set('hit-item', 'present', 60);

    await cache.get('hit-item'); // Hit
    await cache.get('hit-item'); // Hit
    await cache.get('missing-1'); // Miss
    await cache.get('missing-2'); // Miss

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(2);
    expect(metrics.misses).toBe(2);
    expect(metrics.hitRatio).toBe(0.5);
  });

  it('invalidates entries on mutation', async () => {
    await cache.set('meta:file-99', { status: 'ready' }, 60);
    expect(await cache.get('meta:file-99')).not.toBeNull();

    await cache.invalidate('meta:file-99');
    expect(await cache.get('meta:file-99')).toBeNull();
  });
});
