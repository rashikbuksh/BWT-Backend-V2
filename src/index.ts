import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';

import app from './app';
import env from './env';
import { initializeSocket } from './lib/socket';

const port = env.PORT;

// Create HTTP server that handles requests
const httpServer = createServer(async (req, res) => {
  const url = `http://${req.headers.host}${req.url}`;

  // Handle body properly for POST/PUT/PATCH requests
  let body: BodyInit | null = null;
  if (req.method && !['GET', 'POST', 'HEAD'].includes(req.method)) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    body = Buffer.concat(chunks);
  }

  const request = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body,
  });

  const response = await app.fetch(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (response.body) {
    const reader = response.body.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(value);
      return pump();
    };
    pump();
  }
  else {
    res.end();
  }
});

// Initialize Socket.IO on the HTTP server
initializeSocket(httpServer);

// Start the server
httpServer.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running on port ${env.SERVER_URL}`);
});

// import { serve } from '@hono/node-server';

// import app from './app';
// import env from './env';

// const port = env.PORT;
// // eslint-disable-next-line no-console
// console.log(`Server is running on port ${env.SERVER_URL}`);

// serve({
//   fetch: app.fetch,
//   port,
//   // hostname: "localhost",
// });
