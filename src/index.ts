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

// Add WebSocket route from BUN
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
    onMessage: async (event, ws) => {
      const rawWs = ws.raw as ServerWebSocket;
      console.warn('Received message:', event.data);

      // Normalize the incoming data to string | BufferSource
      let payload: string | ArrayBuffer | ArrayBufferView;
      if (typeof event.data === 'string') {
        payload = event.data;
      }
      else if (event.data instanceof ArrayBuffer || ArrayBuffer.isView(event.data)) {
        payload = event.data as ArrayBuffer | ArrayBufferView;
      }
      else if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
        // Blob is not a BufferSource; convert to ArrayBuffer first
        payload = await event.data.arrayBuffer();
      }
      else {
        // Fallback: try to stringify unknown types
        try {
          payload = JSON.stringify(event.data);
        }
        catch {
          payload = '';
        }
      }

      // Broadcast message to all subscribers
      {
        // Ensure we pass either a string or an ArrayBuffer (BufferSource) to publish.
        let publishPayload: string | ArrayBuffer;
        if (typeof payload === 'string') {
          publishPayload = payload;
        }
        else if (ArrayBuffer.isView(payload)) {
          const view = payload as ArrayBufferView;
          // Create a new ArrayBuffer that represents only the view's bytes.
          // Copy the bytes into a new ArrayBuffer to ensure it's a plain ArrayBuffer (not SharedArrayBuffer).
          const tmp = new Uint8Array(view.byteLength);
          tmp.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
          publishPayload = tmp.buffer;
        }
        else {
          publishPayload = payload as ArrayBuffer;
        }
        rawWs.publish(topic, publishPayload);
      }
    },
  })),
);

// Use Bun's native server
Bun.serve({
  port,
  hostname: '0.0.0.0', // Listen on all network interfaces for production
  fetch: app.fetch,
  websocket: {
    message(ws: ServerWebSocket, message: string | ArrayBuffer | ArrayBufferView) {
      console.warn('WebSocket message received:', message);

      // Normalize publish payload to string or ArrayBuffer
      if (typeof message === 'string') {
        ws.publish(topic, message);
        return;
      }

      if (message instanceof ArrayBuffer) {
        ws.publish(topic, message);
        return;
      }

      // Handle ArrayBufferView (Uint8Array, DataView, etc.)
      if (ArrayBuffer.isView(message)) {
        const view = message as ArrayBufferView;
        const tmp = new Uint8Array(view.byteLength);
        tmp.set(new Uint8Array((view as any).buffer, (view as any).byteOffset || 0, view.byteLength));
        ws.publish(topic, tmp.buffer);
        return;
      }

      // Fallback for custom Buffer-like wrappers that expose byteLength & buffer
      const bufLike = message as any;
      if (bufLike && typeof bufLike.byteLength === 'number' && bufLike.buffer) {
        const tmp = new Uint8Array(bufLike.byteLength);
        tmp.set(new Uint8Array(bufLike.buffer, bufLike.byteOffset || 0, bufLike.byteLength));
        ws.publish(topic, tmp.buffer);
        return;
      }

      // As a last resort stringify
      try {
        ws.publish(topic, JSON.stringify(message));
      }
      catch {
        ws.publish(topic, '');
      }
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
});

console.warn(`Server is running on port ${env.SERVER_URL}`);
