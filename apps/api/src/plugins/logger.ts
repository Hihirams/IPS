import pino from 'pino';

export function setupLogger(env: string): pino.LoggerOptions {
  const isProduction = env === 'production';

  return {
    level: isProduction ? 'info' : 'debug',
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
    formatters: {
      level: (label: string) => ({ level: label.toUpperCase() }),
    },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'secret'],
      remove: true,
    },
  };
}
