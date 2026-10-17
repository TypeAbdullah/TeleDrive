import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  // Redact sensitive fields from ever appearing in logs
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'secret',
      'apiSecret',
      'sessionString',
      'encryptedSession',
      'telegramSessionKey',
      'BETTER_AUTH_SECRET',
      'DISCORD_CLIENT_SECRET',
      'TELEGRAM_SESSION_ENCRYPTION_KEY',
    ],
    censor: '[REDACTED]',
  },
});

/**
 * Create a child logger scoped to a specific module.
 */
export function createModuleLogger(module: string) {
  return logger.child({ module });
}
