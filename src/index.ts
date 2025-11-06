// import { Buffer } from 'node:buffer';
// import { createServer } from 'node:http';

// import app, { initializeSocketIO } from './app';
// import env from './env';

// const port = env.PORT;

// // Create HTTP server that handles requests
// const httpServer = createServer(async (req, res) => {
//   const url = `http://${req.headers.host}${req.url}`;

//   // Handle body properly for POST/PUT/PATCH requests
//   let body: BodyInit | null = null;
//   if (req.method && !['GET', 'HEAD'].includes(req.method)) {
//     const chunks: Buffer[] = [];
//     for await (const chunk of req) {
//       chunks.push(chunk);
//     }
//     body = Buffer.concat(chunks);
//   }

//   const request = new Request(url, {
//     method: req.method,
//     headers: req.headers as HeadersInit,
//     body,
//   });

//   const response = await app.fetch(request);

//   res.statusCode = response.status;
//   response.headers.forEach((value, key) => {
//     res.setHeader(key, value);
//   });

//   if (response.body) {
//     const reader = response.body.getReader();
//     const pump = async (): Promise<void> => {
//       const { done, value } = await reader.read();
//       if (done) {
//         res.end();
//         return;
//       }
//       res.write(value);
//       return pump();
//     };
//     pump();
//   }
//   else {
//     res.end();
//   }
// });

// // Initialize Socket.IO
// initializeSocketIO(httpServer);

// // Start the server
// httpServer.listen(port, () => {
//   // eslint-disable-next-line no-console
//   console.log(`Server is running on port ${env.SERVER_URL}`);
// });

import type { ServerWebSocket } from 'bun';

import { upgradeWebSocket } from 'hono/bun';

import app from './app';
import env from './env';

const port = env.PORT;
const topic = 'anonymous-chat-room';

// Add WebSocket route
app.get(
  '/ws',
  upgradeWebSocket(_ => ({
    onOpen(_, ws) {
      const rawWs = ws.raw as ServerWebSocket;
      rawWs.subscribe(topic);
      console.warn(`WebSocket server opened and subscribed to topic '${topic}'`);
    },
    onClose(_, ws) {
      const rawWs = ws.raw as ServerWebSocket;
      rawWs.unsubscribe(topic);
      console.warn(`WebSocket server closed and unsubscribed from topic '${topic}'`);
    },
    onMessage(event, ws) {
      const rawWs = ws.raw as ServerWebSocket;
      console.warn('Received message:', event.data);
      // Broadcast message to all subscribers
      rawWs.publish(topic, event.data);
    },
  })),
);

// Use Bun's native server
export default {
  port,
  fetch: app.fetch,
  websocket: {
    message(ws: ServerWebSocket, message: string | ArrayBuffer) {
      console.warn('WebSocket message received:', message);
      ws.publish(topic, message);
    },
    open(ws: ServerWebSocket) {
      console.warn('WebSocket connection opened');
      ws.subscribe(topic);
    },
    close(ws: ServerWebSocket) {
      console.warn('WebSocket connection closed');
      ws.unsubscribe(topic);
    },
  },
};

console.warn(`Server is running on port ${env.SERVER_URL}`);
