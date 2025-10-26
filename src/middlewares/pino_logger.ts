import { pinoLogger as logger } from 'hono-pino';
import pino from 'pino';
import pretty from 'pino-pretty';

import env from '@/env';

export function pinoLogger() {
  return logger({
    pino: pino({
      level: env.LOG_LEVEL || 'info',
    }, env.NODE_ENV === 'production' || env.NODE_ENV === 'vps' ? undefined : pretty()),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}
