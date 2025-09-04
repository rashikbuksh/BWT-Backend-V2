import { bearerAuth } from 'hono/bearer-auth';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import { auth } from '@/lib/auth';
import configureOpenAPI from '@/lib/configure_open_api';
import createApp from '@/lib/create_app';
import { ALLOWED_ROUTES, isPublicRoute, VerifyToken } from '@/middlewares/auth';
// import authRouter from '@/routes/auth_user/index';
import { serveStatic } from '@hono/node-server/serve-static';

import env from './env';
import routes from './routes/index.route';

const app = createApp();

const app2 = createApp();

configureOpenAPI(app);

// Apply 50 MB limit to all routes
app.use('*', bodyLimit({
  maxSize: 50 * 1024 * 1024, // 50 MB
  onError: c => c.text('File too large Greater Than 50 MB', 413),
}));

app2.use('*', bodyLimit({
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

app2.use(`/api/auth/*`, cors({
  origin: ALLOWED_ROUTES,
  maxAge: 600,
  credentials: true,
}));

if (!isDev) {
  app.use(`${basePath}/*`, async (c, next) => {
    if (isPublicRoute(c.req.path, c.req.method) || c.req.path.startsWith('/v2/api/auth/'))
      return next();

    return bearerAuth({ verifyToken: VerifyToken })(c, next);
  });
}

// const allRouter = [authRouter, ...routes];

// Register better-auth wildcard handler for /api/auth/**
app2.on(['POST', 'GET', 'OPTIONS'], '/api/auth/**', c => auth.handler(c.req.raw));

// app2.route(basePath2, authRouter);

routes.forEach((route) => {
  app.route(basePath, route);
});

export default app;
export { app2 };
