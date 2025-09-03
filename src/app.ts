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

routes.forEach((route) => {
  app.route(basePath, route); // e.g., /v1/...
});

app.use(`/api/auth/*`, cors({
  origin: ALLOWED_ROUTES,
  maxAge: 600,
  credentials: true,
}));

// Register better-auth wildcard handler for /api/auth/**
// Specific debug forward for sign-in to confirm request reaches better-auth
// app.on(['POST'], '/api/auth/sign-in/email', async (c) => {
//   console.log('DEBUG: /api/auth/sign-in/email hit', { path: c.req.path, method: c.req.method, url: c.req.raw.url });
//   const res = await auth.handler(c.req.raw as Request);

//   const headers: Record<string, string> = {};
//   res.headers.forEach((value, key) => {
//     headers[key] = value;
//   });

//   const body = await res.arrayBuffer();
//   return new Response(body, { status: res.status, headers });
// });

// Register better-auth wildcard handler for /api/auth/**
app.on(['POST', 'GET', 'OPTIONS'], '/api/auth/**', async (c) => {
  console.log('DEBUG: wildcard /api/auth/** hit', { path: c.req.path, method: c.req.method });
  const res = await auth.handler(c.req.raw as Request);
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers });
});

export default app;
