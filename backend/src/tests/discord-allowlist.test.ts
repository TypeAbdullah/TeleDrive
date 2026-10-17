import { describe, it, expect, beforeEach } from 'vitest';
import { DiscordAllowlistService } from '../services/discord-allowlist.service.js';

describe('Discord Allowlist Service', () => {
  let service: DiscordAllowlistService;

  beforeEach(() => {
    service = new DiscordAllowlistService();
    process.env.ALLOWED_DISCORD_USERNAMES = 'TypeAbdullah,AdminUser';
  });

  it('normalizes and matches usernames case-insensitively', async () => {
    expect(await service.isDiscordUsernameAllowed('typeabdullah')).toBe(true);
    expect(await service.isDiscordUsernameAllowed('TYPEABDULLAH')).toBe(true);
    expect(await service.isDiscordUsernameAllowed('@typeabdullah')).toBe(true);
    expect(await service.isDiscordUsernameAllowed('adminuser')).toBe(true);
  });

  it('rejects unauthorized Discord usernames', async () => {
    expect(await service.isDiscordUsernameAllowed('random_hacker')).toBe(false);
    expect(await service.isDiscordUsernameAllowed('unauthorized_user')).toBe(false);
    expect(await service.isDiscordUsernameAllowed('')).toBe(false);
  });

  it('allows adding and removing usernames dynamically in memory', async () => {
    expect(await service.isDiscordUsernameAllowed('new_contributor')).toBe(false);

    // Simulate in-memory addition when DB is offline
    await service.addAllowedUser('New_Contributor', 'test-suite');
    expect(await service.isDiscordUsernameAllowed('new_contributor')).toBe(true);
    expect(await service.isDiscordUsernameAllowed('@new_contributor')).toBe(true);

    // Removal
    await service.removeAllowedUser('new_contributor');
    expect(await service.isDiscordUsernameAllowed('new_contributor')).toBe(false);
  });
});
