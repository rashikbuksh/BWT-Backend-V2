import { bearerAuth } from 'hono/bearer-auth';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';

import { configureOpenAPI } from '@/lib/configure_open_api';
import createApp from '@/lib/create_app';
import { ALLOWED_ROUTES, isPublicRoute, VerifyToken } from '@/middlewares/auth';
import zktecoRouter from '@/routes/zkteco';
import { serveStatic } from '@hono/node-server/serve-static';

import env from './env';
import routes from './routes/index.route';

const app = createApp();

configureOpenAPI(app);

// Apply 50 MB limit to all routes
// app.use('*', bodyLimit({
//   maxSize: 50 * 1024 * 1024, // 50 MB
//   onError: c => c.text('File too large Greater Than 50 MB', 413),
// }));

app.use('*', (c, next) => {
  if (c.req.path === '/v1/report/bulk-send-to-email') {
    return next(); // Skip bodyLimit for this specific route
  }
  return bodyLimit({
    maxSize: 50 * 1024 * 1024, // 50 MB
    onError: c => c.text('File too large Greater Than 50 MB', 413),
  })(c, next);
});

app.use('/iclock', bodyLimit({
  maxSize: 50 * 1024 * 1024, // 50 MB
  onError: c => c.text('File too large Greater Than 50 MB', 413),
}));

// ! don't put a trailing slash
export const basePath = '/v1';
const isDev = env.NODE_ENV === 'development';
const isVps = env.NODE_ENV === 'vps';

// Serve static files from the 'uploads' directory
app.use('/uploads/*', serveStatic({ root: isDev ? './src/' : isVps ? './dist/src/' : './' }));

// IP information debug endpoint with enhanced detection
app.get('/ip-info', (c) => {
  const allHeaders: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });

  // Enhanced IP detection (same logic as middleware)
  const xForwardedFor = c.req.header('x-forwarded-for');
  const xRealIp = c.req.header('x-real-ip');
  const cfConnectingIp = c.req.header('cf-connecting-ip');
  const xClientIp = c.req.header('x-client-ip');
  const xOriginalForwardedFor = c.req.header('x-original-forwarded-for');
  const trueClientIp = c.req.header('true-client-ip');
  const xClusterClientIp = c.req.header('x-cluster-client-ip');
  const forwardedFor = c.req.header('forwarded-for');
  const forwarded = c.req.header('forwarded');

  let detectedIp = 'unknown';
  let detectionMethod = 'none';

  if (xForwardedFor) {
    detectedIp = xForwardedFor.split(',')[0].trim();
    detectionMethod = 'x-forwarded-for';
  }
  else if (xRealIp) {
    detectedIp = xRealIp;
    detectionMethod = 'x-real-ip';
  }
  else if (cfConnectingIp) {
    detectedIp = cfConnectingIp;
    detectionMethod = 'cf-connecting-ip';
  }
  else if (trueClientIp) {
    detectedIp = trueClientIp;
    detectionMethod = 'true-client-ip';
  }
  else if (xClientIp) {
    detectedIp = xClientIp;
    detectionMethod = 'x-client-ip';
  }
  else if (xOriginalForwardedFor) {
    detectedIp = xOriginalForwardedFor.split(',')[0].trim();
    detectionMethod = 'x-original-forwarded-for';
  }
  else if (xClusterClientIp) {
    detectedIp = xClusterClientIp;
    detectionMethod = 'x-cluster-client-ip';
  }
  else if (forwardedFor) {
    detectedIp = forwardedFor.split(',')[0].trim();
    detectionMethod = 'forwarded-for';
  }
  else if (forwarded) {
    const forMatch = forwarded.match(/for=([^;,\s]+)/);
    if (forMatch) {
      detectedIp = forMatch[1].replace(/"/g, '');
      detectionMethod = 'forwarded';
    }
  }

  return c.json({
    client_info: {
      detected_ip: detectedIp,
      detection_method: detectionMethod,
      all_ip_headers: {
        'x-forwarded-for': xForwardedFor,
        'x-real-ip': xRealIp,
        'cf-connecting-ip': cfConnectingIp,
        'x-client-ip': xClientIp,
        'x-original-forwarded-for': xOriginalForwardedFor,
        'true-client-ip': trueClientIp,
        'x-cluster-client-ip': xClusterClientIp,
        'forwarded-for': forwardedFor,
        'forwarded': forwarded,
      },
      user_agent: c.req.header('user-agent'),
      origin: c.req.header('origin'),
      referer: c.req.header('referer'),
      host: c.req.header('host'),
      connection: c.req.header('connection'),
      accept: c.req.header('accept'),
      accept_language: c.req.header('accept-language'),
      accept_encoding: c.req.header('accept-encoding'),
    },
    server_info: {
      environment: env.NODE_ENV,
      server_url: env.NODE_ENV === 'development' ? env.SERVER_URL : env.PRODUCTION_URL,
      port: env.PORT,
    },
    request_info: {
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
      query: c.req.query(),
    },
    all_headers: allHeaders,
    timestamp: new Date().toISOString(),
  });
});

app.use(`${basePath}/*`, cors({
  origin: ALLOWED_ROUTES,
  maxAge: 600,
  credentials: true,
}));

// Add CORS support for OpenAPI documentation routes
app.use('/reference', cors({
  origin: ALLOWED_ROUTES,
  maxAge: 600,
  credentials: true,
}));

app.use('/doc', cors({
  origin: ALLOWED_ROUTES,
  maxAge: 600,
  credentials: true,
}));

if (!isDev) {
  app.use(`${basePath}/*`, async (c, next) => {
    if (
      isPublicRoute(c.req.path, c.req.method)
    ) {
      return next();
    }
    return bearerAuth({
      verifyToken: VerifyToken,
      // Custom error message for unauthorized/expired tokens
      realm: 'Protected Area',
      // Custom response for invalid/expired tokens
      invalidTokenMessage: 'Token expired or invalid. Please login again.',
    })(c, next);
  });
}

routes.forEach((route) => {
  app.route(basePath, route);
});

// WebSocket test page route
app.get('/ws-test', async (c) => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const htmlPath = path.resolve(process.cwd(), 'websocket_test.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    return c.html(htmlContent);
  }
  catch (error) {
    console.error('Error serving websocket_test.html:', error);
    return c.text('WebSocket test file not found', 404);
  }
});

// WebSocket room chat test page route
app.get('/ws-room-test', async (c) => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const htmlPath = path.resolve(process.cwd(), 'websocket_room_test.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    return c.html(htmlContent);
  }
  catch (error) {
    console.error('Error serving websocket_room_test.html:', error);
    return c.text('WebSocket room test file not found', 404);
  }
});

// Native WebSocket room chat test page route (no Socket.IO dependency)
app.get('/ws-native-test', async (c) => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const htmlPath = path.resolve(process.cwd(), 'websocket_native_room_test.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    return c.html(htmlContent);
  }
  catch (error) {
    console.error('Error serving websocket_native_room_test.html:', error);
    return c.text('Native WebSocket room test file not found', 404);
  }
});

// Serve chat demo HTML
app.get('/chat-demo', async (c) => {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const htmlPath = path.resolve(process.cwd(), 'websocket_chat_demo.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    return c.html(htmlContent);
  }
  catch (error) {
    console.error('Error serving websocket_chat_demo.html:', error);
    return c.text('Chat demo file not found', 404);
  }
});

// zkteco routes
app.route('/', zktecoRouter);

export default app;
