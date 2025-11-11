import { notFound, onError, serveEmojiFavicon } from 'stoker/middlewares';
import { defaultHook } from 'stoker/openapi';

import { pinoLogger } from '@/middlewares/pino_logger';
import { OpenAPIHono } from '@hono/zod-openapi';

import type { AppBindings, AppOpenAPI } from './types';

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();

  app.use(serveEmojiFavicon('📝'));

  // IP logging middleware - runs before pino logger
  app.use(async (c, next) => {
    const ip = c.req.header('x-forwarded-for')
      || c.req.header('x-real-ip')
      || c.req.header('cf-connecting-ip')
      || c.req.header('x-client-ip')
      || 'unknown';

    const userAgent = c.req.header('user-agent') || 'unknown';
    const origin = c.req.header('origin') || 'direct';
    const referer = c.req.header('referer') || 'none';

    console.warn(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
    console.warn(`  IP: ${ip} | Origin: ${origin} | Referer: ${referer}`);
    console.warn(`  User-Agent: ${userAgent.substring(0, 100)}${userAgent.length > 100 ? '...' : ''}`);

    await next();
  });

  app.use(pinoLogger());

  app.notFound(notFound);
  app.onError(onError);

  return app;
}

export function createTestApp<R extends AppOpenAPI>(router: R) {
  return createApp().route('/', router);
}
