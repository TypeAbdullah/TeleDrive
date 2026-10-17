import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import mongoose from 'mongoose';
import { getConfig } from '../../config/index.js';
import { createModuleLogger } from '../../shared/logger.js';
import { discordAllowlistService } from '../../services/discord-allowlist.service.js';
import { UserMeta } from '../../models/UserMeta.js';

const log = createModuleLogger('auth');

let _auth: any = null;

/**
 * Initialize and return the Better Auth instance.
 * Must be called AFTER Mongoose is connected.
 */
export function initAuth() {
  if (_auth) return _auth;

  const config = getConfig();
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('Mongoose must be connected before initializing Better Auth');
  }

  log.info('Initializing Better Auth with Discord OAuth...');

  _auth = betterAuth({
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: mongodbAdapter(db),
    trustedOrigins: config.CORS_ORIGINS.split(',').map(s => s.trim()),

    socialProviders: {
      discord: {
        clientId: config.DISCORD_CLIENT_ID,
        clientSecret: config.DISCORD_CLIENT_SECRET,
        mapProfileToUser: async (profile: any) => {
          const rawUsername = profile.username || profile.id;
          const allowed = await discordAllowlistService.isDiscordUsernameAllowed(rawUsername);
          if (!allowed) {
            log.warn(
              { username: rawUsername, discordId: profile.id },
              'Discord login REJECTED: User is not in the allowed Discord usernames whitelist'
            );
            throw new Error(`Access denied: Discord account @${rawUsername} is not authorized to access TeleDrive.`);
          }

          log.info({ username: rawUsername }, 'Discord login ACCEPTED: User is in allowed whitelist');
          return {
            name: profile.global_name || profile.username,
            email: profile.email,
            image: profile.image_url,
          };
        },
      },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (user: any) => {
            try {
              const meta = await UserMeta.findOne({ userId: user.id });
              if (!meta) {
                await UserMeta.create({
                  userId: user.id,
                  role: 'user',
                  discordUsername: (user.name || '').toLowerCase(),
                });
              }
            } catch (err: any) {
              log.error({ err: err?.message }, 'Failed updating user meta on user create');
            }
          },
        },
      },
      session: {
        create: {
          before: async (session: any) => {
            try {
              const meta = await UserMeta.findOne({ userId: session.userId });
              if (meta?.discordUsername) {
                const isAllowed = await discordAllowlistService.isDiscordUsernameAllowed(meta.discordUsername);
                if (!isAllowed) {
                  log.warn({ userId: session.userId, discordUsername: meta.discordUsername }, 'Session creation BLOCKED: user no longer allowed');
                  return false;
                }
              }
              return true;
            } catch (err: any) {
              log.error({ err: err?.message }, 'Error checking user allowlist in session create hook');
              return true;
            }
          },
        },
      },
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    },

    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
    },
  });

  log.info('Better Auth initialized successfully');
  return _auth;
}

/**
 * Get the initialized Better Auth instance.
 */
export function getAuth() {
  if (!_auth) {
    throw new Error('Auth not initialized. Call initAuth() after MongoDB connects.');
  }
  return _auth;
}
