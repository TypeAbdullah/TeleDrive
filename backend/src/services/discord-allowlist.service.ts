import mongoose from 'mongoose';
import { AllowedDiscordUser, IAllowedDiscordUser } from '../models/AllowedDiscordUser.js';
import { createModuleLogger } from '../shared/logger.js';

const log = createModuleLogger('discord-allowlist');

export class DiscordAllowlistService {
  private inMemoryCache: Set<string> = new Set();

  private normalize(username: string): string {
    return (username || '').trim().toLowerCase().replace(/^@/, '');
  }

  private getEnvAllowedUsers(): string[] {
    const raw = process.env.ALLOWED_DISCORD_USERNAMES || '';
    if (!raw.trim()) return [];
    return raw
      .split(',')
      .map(s => this.normalize(s))
      .filter(Boolean);
  }

  async loadCache(): Promise<void> {
    const envUsers = this.getEnvAllowedUsers();
    for (const u of envUsers) {
      this.inMemoryCache.add(u);
    }

    if (mongoose.connection?.readyState === 1) {
      try {
        const docs = await AllowedDiscordUser.find().select('username');
        for (const doc of docs) {
          if (doc.username) {
            this.inMemoryCache.add(this.normalize(doc.username));
          }
        }
      } catch (err: any) {
        log.warn({ err: err?.message }, 'Failed loading allowed Discord users from database');
      }
    }
  }

  /**
   * Check whether a Discord username is permitted to authenticate.
   */
  async isDiscordUsernameAllowed(rawUsername: string): Promise<boolean> {
    const username = this.normalize(rawUsername);
    if (!username) return false;

    // Check env override first
    const envUsers = this.getEnvAllowedUsers();
    if (envUsers.includes(username)) {
      return true;
    }

    // Check in-memory cache
    if (this.inMemoryCache.has(username)) {
      return true;
    }

    // Check MongoDB directly
    if (mongoose.connection?.readyState === 1) {
      try {
        const found = await AllowedDiscordUser.findOne({ username });
        if (found) {
          this.inMemoryCache.add(username);
          return true;
        }
      } catch (err: any) {
        log.error({ err: err?.message, username }, 'Error querying AllowedDiscordUser in database');
      }
    }

    return false;
  }

  /**
   * Add a username to the allowed list.
   */
  async addAllowedUser(
    rawUsername: string,
    addedBy: string = 'cli',
    notes?: string
  ): Promise<IAllowedDiscordUser | null> {
    const username = this.normalize(rawUsername);
    if (!username) throw new Error('Discord username cannot be empty');

    this.inMemoryCache.add(username);

    if (mongoose.connection?.readyState === 1) {
      const existing = await AllowedDiscordUser.findOne({ username });
      if (existing) {
        if (notes) existing.notes = notes;
        await existing.save();
        log.info({ username, addedBy }, 'Allowed Discord username updated');
        return existing;
      }

      const created = await AllowedDiscordUser.create({
        username,
        addedBy,
        notes,
        addedAt: new Date(),
      });
      log.info({ username, addedBy }, 'Allowed Discord username registered');
      return created;
    }

    return null;
  }

  /**
   * Remove a username from the allowed list.
   */
  async removeAllowedUser(rawUsername: string): Promise<boolean> {
    const username = this.normalize(rawUsername);
    if (!username) return false;

    this.inMemoryCache.delete(username);

    if (mongoose.connection?.readyState === 1) {
      const result = await AllowedDiscordUser.deleteOne({ username });
      const removed = result.deletedCount > 0;
      log.info({ username, removed }, 'Allowed Discord username removal processed');
      return removed;
    }

    return true;
  }

  /**
   * List all allowed usernames from DB and env.
   */
  async listAllowedUsers(): Promise<{ username: string; source: 'env' | 'database'; addedAt?: Date; addedBy?: string; notes?: string }[]> {
    const envUsers = this.getEnvAllowedUsers();
    const result: Map<string, { username: string; source: 'env' | 'database'; addedAt?: Date; addedBy?: string; notes?: string }> = new Map();

    for (const u of envUsers) {
      result.set(u, {
        username: u,
        source: 'env',
        addedBy: 'environment-variable',
      });
    }

    if (mongoose.connection?.readyState === 1) {
      const docs = await AllowedDiscordUser.find().sort({ username: 1 });
      for (const d of docs) {
        result.set(d.username, {
          username: d.username,
          source: 'database',
          addedAt: d.addedAt,
          addedBy: d.addedBy,
          notes: d.notes,
        });
      }
    }

    return Array.from(result.values());
  }
}

export const discordAllowlistService = new DiscordAllowlistService();
