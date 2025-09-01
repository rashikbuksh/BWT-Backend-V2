import { bearerAuth } from 'hono/bearer-auth';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import configureOpenAPI from '@/lib/configure_open_api';
import createApp from '@/lib/create_app';
import { ALLOWED_ROUTES, isPublicRoute, VerifyToken } from '@/middlewares/auth';
import routes from '@/routes/index.route';
import { serveStatic } from '@hono/node-server/serve-static';

import env from './env';
import { auth } from './lib/auth';

const app = createApp();

configureOpenAPI(app);

// Apply 50 MB limit to all routes
app.use('*', bodyLimit({
  maxSize: 50 * 1024 * 1024, // 50 MB
  onError: c => c.text('File too large Greater Than 50 MB', 413),
}));

// ! don't put a trailing slash
export const basePath = '/v1';
export const basePath2 = '/v2';
const isDev = env.NODE_ENV === 'development';
const isVps = env.NODE_ENV === 'vps';

// Serve static files from the 'uploads' directory
app.use('/uploads/*', serveStatic({ root: isDev ? './src/' : isVps ? './dist/src/' : './' }));

app.use(`${basePath}/*`, cors({
  origin: ALLOWED_ROUTES,
  maxAge: 600,
  credentials: true,
}));

if (!isDev) {
  app.use(`${basePath}/*`, async (c, next) => {
    if (isPublicRoute(c.req.path, c.req.method))
      return next();

    return bearerAuth({ verifyToken: VerifyToken })(c, next);
  });
}

// const allRoutes = [auth_router, ...routes] as const;

app.use('/api/auth/*', cors({
  origin: ALLOWED_ROUTES,
  maxAge: 600,
  credentials: true,
}));

app.on(['POST', 'GET', 'OPTIONS'], '/api/auth/**', c => auth.handler(c.req.raw));

routes.forEach((route) => {
  app.route(basePath, route);
});

export default app;
