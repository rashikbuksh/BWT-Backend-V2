import { bearerAuth } from 'hono/bearer-auth';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { Server } from 'socket.io';

import { configureOpenAPI } from '@/lib/configure_open_api';
import createApp from '@/lib/create_app';
import { ALLOWED_ROUTES, isPublicRoute, VerifyToken } from '@/middlewares/auth';
import zktecoRouter from '@/routes/zkteco';
import { serveStatic } from '@hono/node-server/serve-static';

import env from './env';
import routes from './routes/index.route';

const app = createApp();

configureOpenAPI(app);

// Socket.IO will be initialized in index.ts with the HTTP server
let io: Server | null = null;

// Function to initialize Socket.IO with HTTP server
export function initializeSocketIO(httpServer: any) {
  console.warn('🔌 Initializing Socket.IO server...');

  // Check environment
  const isDevelopment = env.NODE_ENV === 'development';

  // Get allowed origins from environment
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:3005',
    'http://localhost:4000',
    'http://192.168.10.175:5090',
    'http://103.147.163.46:5090',
    'http://192.168.10.175:4070',
    'http://103.147.163.46:4070',
    'http://192.168.10.175:4076',
    'http://103.147.163.46:4076',
    'http://103.147.163.46:5095',
    'https://synap-erp-starter.vercel.app',
    'https://bwt-frontend.fortunezip.com',
    'https://bwt-web.fortunezip.com',
    'https://bwt-admin.synaptech.cloud',
    'https://bwt-web.synaptech.cloud',
  ];

  console.warn(`🌐 Socket.IO CORS origins: ${isDevelopment ? '*' : allowedOrigins.join(', ')}`);

  app.use('/socket-debug');

  io = new Server(httpServer, {
    cors: {
      origin: isDevelopment ? '*' : allowedOrigins, // Restrict origins in production
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    // Enhanced Socket.IO configuration for production
    transports: ['polling', 'websocket'], // Start with polling for better compatibility
    pingTimeout: isDevelopment ? 60000 : 120000, // Longer timeout in production
    pingInterval: isDevelopment ? 25000 : 30000, // Less frequent pings in production
    upgradeTimeout: isDevelopment ? 30000 : 60000, // More time for upgrade in production
    maxHttpBufferSize: 1e6, // 1MB
    allowUpgrades: true,
    perMessageDeflate: false,
    httpCompression: true,
    // Additional production settings
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    },
    // Enable detailed logging for debugging
    path: '/socket.io/',
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.warn(`✅ User connected: ${socket.id}`);

    // Initialize socket data
    socket.data = {
      user_uuid: socket.id,
      username: `User_${socket.id.substring(0, 8)}`,
      authenticated: true,
      rooms: new Set(),
    };

    // Set user information
    socket.on('set_user', (data) => {
      socket.data.user_uuid = data.user_uuid || socket.id;
      socket.data.username = data.username || `User_${socket.id.substring(0, 8)}`;

      console.warn(`👤 User info set: ${socket.data.username} (${socket.data.user_uuid})`);

      socket.emit('user_set', {
        user_uuid: socket.data.user_uuid,
        username: socket.data.username,
      });

      // Notify all clients about new user
      socket.broadcast.emit('user_online', {
        user_uuid: socket.data.user_uuid,
        username: socket.data.username,
      });
    });

    // Room management
    socket.on('join_room', (room) => {
      socket.join(room);
      socket.data.rooms?.add(room);

      console.warn(`🏠 ${socket.data.username} joined room: ${room}`);

      socket.to(room).emit('user_joined', {
        username: socket.data.username,
        user_uuid: socket.data.user_uuid,
        room,
      });
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      socket.data.rooms?.delete(room);

      console.warn(`🚪 ${socket.data.username} left room: ${room}`);

      socket.to(room).emit('user_left', {
        username: socket.data.username,
        user_uuid: socket.data.user_uuid,
        room,
      });
    });

    // Message handling
    socket.on('send_message', (data) => {
      const messageData = {
        id: `msg_${Date.now()}_${socket.id}`,
        message: data.message,
        from_user_uuid: socket.data.user_uuid,
        from_username: socket.data.username,
        room: data.room,
        timestamp: new Date().toISOString(),
      };

      if (data.room) {
        // Send to room
        socket.to(data.room).emit('new_message', messageData);
        console.warn(`💬 Message sent to room ${data.room}: ${data.message}`);
      }
      else if (data.to_user_uuid) {
        // Private message - find target socket
        const targetSocket = Array.from(io?.sockets.sockets.values() || [])
          .find(s => s.data.user_uuid === data.to_user_uuid);

        if (targetSocket) {
          targetSocket.emit('new_message', messageData);
          console.warn(`💬 Private message sent to ${data.to_user_uuid}: ${data.message}`);
        }
      }

      socket.emit('message_sent', { id: messageData.id });
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const typingData = {
        from_user_uuid: socket.data.user_uuid,
        from_username: socket.data.username,
        room: data.room,
      };

      if (data.room) {
        socket.to(data.room).emit('typing', typingData);
      }
    });

    // Get online users
    socket.on('request_online_users', (room) => {
      let sockets;

      if (room) {
        // Get users in specific room
        sockets = Array.from(io?.sockets.adapter.rooms.get(room) || [])
          .map(socketId => io?.sockets.sockets.get(socketId))
          .filter(Boolean);
      }
      else {
        // Get all connected users
        sockets = Array.from(io?.sockets.sockets.values() || []);
      }

      const users = sockets.map(s => ({
        user_uuid: s?.data.user_uuid || s?.id,
        username: s?.data.username || 'Unknown',
        socket_id: s?.id,
      }));

      socket.emit('online_users', { users, room });
    });

    // Handle chat message (backward compatibility)
    socket.on('chat message', (msg) => {
      io?.emit('chat message', {
        message: msg,
        from: socket.data.username,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.warn(`❌ User disconnected: ${socket.data.username} (${reason})`);

      // Notify all clients about user going offline
      socket.broadcast.emit('user_offline', {
        user_uuid: socket.data.user_uuid,
        username: socket.data.username,
      });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.data.username}:`, error);
    });
  });

  // Server-level error handling and debugging
  io.engine.on('connection_error', (err) => {
    console.error('❌ Socket.IO connection error:');
    console.error('- Request URL:', err.req?.url);
    console.error('- Error Code:', err.code);
    console.error('- Error Message:', err.message);
    console.error('- Headers:', err.req?.headers);
    console.error('- Origin:', err.req?.headers?.origin);
    console.error('- User-Agent:', err.req?.headers?.['user-agent']);
  });

  // Enhanced debugging
  io.engine.on('initial_headers', (headers, request) => {
    console.warn('📡 Socket.IO initial headers:', {
      url: request.url,
      origin: request.headers.origin,
      host: request.headers.host,
    });
  });

  io.engine.on('connection', (_socket) => {
    console.warn('🔗 Socket.IO engine connection established');
  });

  io.engine.on('disconnect', (reason) => {
    console.warn('💔 Socket.IO engine disconnection:', reason);
  });

  console.warn('✅ Socket.IO server initialized successfully');
  console.warn(`🔧 Environment: ${env.NODE_ENV}`);
  console.warn(`🌐 CORS origins: ${isDevelopment ? 'All (*) - Development Mode' : `${allowedOrigins.length} specific origins`}`);
  return io;
}

// Export function to get Socket.IO instance
export function getSocketIO(): Server | null {
  return io;
}

// Export function to get online users count
export function getOnlineUsersCount(): number {
  return io?.sockets.sockets.size || 0;
}

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

app.get('/socket-stat', (c) => {
  // Implement socket status logic here
  return c.html(
    `
    <html><body><h1>Socket Status Page</h1><p>Implement socket status logic here.</p></body></html>
    `,
  );
});

// Serve Socket.IO client library explicitly (in case it's not auto-served)
app.get('/socket.io/socket.io.js', async (c) => {
  try {
    // Try to get the Socket.IO client script from the server
    const socketIO = getSocketIO();
    if (socketIO) {
      // Socket.IO automatically serves the client script at this path
      // If this endpoint is being hit, it means auto-serving might not be working
      console.warn('[socket.io.js] Client script requested - Socket.IO should auto-serve this');
    }

    // Fallback: redirect to CDN
    return c.redirect('https://cdn.socket.io/4.7.2/socket.io.min.js');
  }
  catch (error) {
    console.error('[socket.io.js] Error serving client script:', error);
    return c.redirect('https://cdn.socket.io/4.7.2/socket.io.min.js');
  }
});

// Socket.IO status endpoint (outside v1 path)
app.get('/socket-status', (c) => {
  try {
    const socketIO = getSocketIO();
    const response = {
      socket_initialized: socketIO !== null,
      status: socketIO ? 'connected' : 'disconnected',
      online_users: getOnlineUsersCount(),
      engine_connected: socketIO?.engine?.clientsCount || 0,
      environment: env.NODE_ENV,
      server_url: env.NODE_ENV === 'development' ? env.SERVER_URL : env.PRODUCTION_URL,
      port: env.PORT,
      cors_enabled: true,
      allowed_origins: env.NODE_ENV === 'development'
        ? ['*']
        : [
            'https://bwt-frontend.fortunezip.com',
            'https://bwt-web.fortunezip.com',
            'https://bwt-admin.synaptech.cloud',
            'https://bwt-web.synaptech.cloud',
            'http://103.147.163.46:5090',
          ],
      socket_path: '/socket.io/',
      transports: ['polling', 'websocket'],
      timestamp: new Date().toISOString(),
    };

    console.warn(`[socket-status] Request from origin: ${c.req.header('origin') || 'unknown'}`);
    console.warn(`[socket-status] Socket initialized: ${response.socket_initialized}`);

    return c.json(response);
  }
  catch (error) {
    const errorResponse = {
      socket_initialized: false,
      status: 'error',
      error: (error as Error).message,
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    console.error(`[socket-status] Error:`, error);
    return c.json(errorResponse, 500);
  }
});

// Debug endpoint for Socket.IO connectivity
app.get('/socket-debug', (c) => {
  const origin = c.req.header('origin');
  const host = c.req.header('host');
  const userAgent = c.req.header('user-agent');

  return c.json({
    debug: {
      origin,
      host,
      userAgent,
      environment: env.NODE_ENV,
      socket_url: `${env.NODE_ENV === 'development' ? env.SERVER_URL : `http://${host}`}/socket.io/`,
      test_urls: {
        status: `${env.NODE_ENV === 'development' ? env.SERVER_URL : `http://${host}`}/socket-status`,
        socket_client: `${env.NODE_ENV === 'development' ? env.SERVER_URL : `http://${host}`}/socket.io/socket.io.js`,
        test_page: `${env.NODE_ENV === 'development' ? env.SERVER_URL : `http://${host}`}/socket-test`,
      },
      cors_check: {
        origin_allowed: env.NODE_ENV === 'development' || ALLOWED_ROUTES.includes(origin || ''),
        origin_received: origin,
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// IP information debug endpoint
app.get('/ip-info', (c) => {
  const allHeaders: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });

  const ip = c.req.header('x-forwarded-for')
    || c.req.header('x-real-ip')
    || c.req.header('cf-connecting-ip')
    || c.req.header('x-client-ip')
    || 'unknown';

  return c.json({
    client_info: {
      detected_ip: ip,
      all_ip_headers: {
        'x-forwarded-for': c.req.header('x-forwarded-for'),
        'x-real-ip': c.req.header('x-real-ip'),
        'cf-connecting-ip': c.req.header('cf-connecting-ip'),
        'x-client-ip': c.req.header('x-client-ip'),
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

// Emit test message endpoint
app.post('/socket-emit', async (c) => {
  try {
    const { message, room } = await c.req.json();
    const socketIO = getSocketIO();

    if (!socketIO) {
      return c.json({ error: 'Socket.IO not initialized' }, 500);
    }

    const eventData = {
      message: message || 'Test message from server',
      timestamp: new Date().toISOString(),
      from_server: true,
    };

    if (room) {
      socketIO.to(room).emit('server_message', eventData);
      return c.json({ success: true, message: `Message sent to room: ${room}`, data: eventData });
    }
    else {
      socketIO.emit('server_message', eventData);
      return c.json({ success: true, message: 'Message broadcasted to all clients', data: eventData });
    }
  }
  catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Direct routes for test pages
app.get('/socket-test', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Socket.IO Connection Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .status {
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-weight: bold;
        }
        .connected {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .disconnected {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .authenticated {
            background-color: #cce7ff;
            color: #004085;
            border: 1px solid #b3d7ff;
        }
        button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #6c757d;
            cursor: not-allowed;
        }
        input, select {
            padding: 8px;
            margin: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
            min-width: 200px;
        }
        .log {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 15px;
            height: 300px;
            overflow-y: auto;
            white-space: pre-wrap;
            font-family: monospace;
            font-size: 12px;
        }
        .form-group {
            margin: 15px 0;
        }
        label {
            display: inline-block;
            width: 120px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Socket.IO Connection Test</h1>
        
        <div id="connectionStatus" class="status disconnected">
            ❌ Disconnected
        </div>

        <div id="authStatus" class="status" style="display: none;">
            ⚠️ Not Authenticated
        </div>

        <div class="form-group">
            <label>Server URL:</label>
            <input type="text" id="serverUrl" value="${isDev ? 'http://localhost:5090' : `http://${c.req.header('host') || '103.147.163.46:5090'}`}" placeholder="Server URL">
            <button onclick="connect()">Connect</button>
            <button onclick="disconnect()">Disconnect</button>
        </div>

        <div class="form-group">
            <label>User UUID:</label>
            <input type="text" id="userUuid" value="test_user_123" placeholder="Your user UUID">
        </div>

        <div class="form-group">
            <label>Username:</label>
            <input type="text" id="username" value="Test User" placeholder="Your username">
        </div>

        <div class="form-group">
            <button onclick="authenticate()" id="authBtn" disabled>� Set User Info</button>
            <button onclick="joinRoom()" id="joinBtn" disabled>🏠 Join Room</button>
            <button onclick="leaveRoom()" id="leaveBtn" disabled>🚪 Leave Room</button>
        </div>

        <div class="form-group">
            <label>Room:</label>
            <input type="text" id="roomName" value="general" placeholder="Room name">
        </div>

        <div class="form-group">
            <label>Message:</label>
            <input type="text" id="messageText" value="Hello everyone!" placeholder="Your message">
            <button onclick="sendMessage()" id="sendBtn" disabled>💬 Send Message</button>
        </div>

        <div class="form-group">
            <button onclick="getOnlineUsers()" id="onlineBtn" disabled>👥 Get Online Users</button>
            <button onclick="clearLog()">🗑️ Clear Log</button>
        </div>

        <h3>📜 Event Log:</h3>
        <div id="log" class="log">Ready to connect...\\n</div>
    </div>

    <script>
        // Check if Socket.IO client is loaded, if not load from CDN
        function loadSocketIO() {
            if (typeof io !== 'undefined') {
                initializeApp();
                return;
            }
            
            // Try loading from server first
            const serverScript = document.createElement('script');
            serverScript.src = '/socket.io/socket.io.js';
            serverScript.onload = () => {
                if (typeof io !== 'undefined') {
                    console.log('Socket.IO loaded from server');
                    initializeApp();
                } else {
                    loadFromCDN();
                }
            };
            serverScript.onerror = () => {
                console.warn('Failed to load Socket.IO from server, trying CDN...');
                loadFromCDN();
            };
            document.head.appendChild(serverScript);
        }
        
        function loadFromCDN() {
            const cdnScript = document.createElement('script');
            cdnScript.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            cdnScript.onload = () => {
                console.log('Socket.IO loaded from CDN');
                initializeApp();
            };
            cdnScript.onerror = () => {
                document.getElementById('log').textContent += 'FATAL: Could not load Socket.IO client library\\n';
            };
            document.head.appendChild(cdnScript);
        }
        
        function initializeApp() {
        let socket = null;
        let isConnected = false;
        let isAuthenticated = false;
        let currentRoom = null;

        const log = document.getElementById('log');
        const connectionStatus = document.getElementById('connectionStatus');
        const authStatus = document.getElementById('authStatus');

        function addLog(message) {
            const timestamp = new Date().toLocaleTimeString();
            log.textContent += \`[\${timestamp}] \${message}\\n\`;
            log.scrollTop = log.scrollHeight;
        }

        function updateUI() {
            // Update connection status
            if (isConnected) {
                connectionStatus.textContent = '✅ Connected';
                connectionStatus.className = 'status connected';
            } else {
                connectionStatus.textContent = '❌ Disconnected';
                connectionStatus.className = 'status disconnected';
            }

            // Update auth status
            if (isConnected) {
                authStatus.style.display = 'block';
                if (isAuthenticated) {
                    authStatus.textContent = '🔓 Authenticated';
                    authStatus.className = 'status authenticated';
                } else {
                    authStatus.textContent = '🔐 Not Authenticated';
                    authStatus.className = 'status disconnected';
                }
            } else {
                authStatus.style.display = 'none';
            }

            // Update buttons
            document.getElementById('authBtn').disabled = !isConnected;
            document.getElementById('joinBtn').disabled = !isConnected;
            document.getElementById('leaveBtn').disabled = !isConnected || !currentRoom;
            document.getElementById('sendBtn').disabled = !isConnected || !currentRoom;
            document.getElementById('onlineBtn').disabled = !isConnected;
        }

        async function connect() {
            const serverUrl = document.getElementById('serverUrl').value;
            
            if (socket) {
                socket.disconnect();
            }

            // Test basic HTTP connectivity first
            addLog(\`Testing connectivity to \${serverUrl}...\`);
            try {
                const response = await fetch(\`\${serverUrl}/health\`, { 
                    method: 'GET',
                    mode: 'cors',
                    timeout: 5000 
                });
                if (response.ok) {
                    const data = await response.json();
                    addLog(\`✅ HTTP connectivity OK: \${JSON.stringify(data)}\`);
                } else {
                    addLog(\`⚠️ HTTP response not OK: \${response.status} \${response.statusText}\`);
                }
            } catch (error) {
                addLog(\`❌ HTTP connectivity test failed: \${error.message}\`);
                addLog(\`   This might indicate network issues or CORS problems\`);
            }

            addLog(\`Connecting to Socket.IO at \${serverUrl}...\`);
            
            socket = io(serverUrl, {
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                timeout: 10000, // 10 second connection timeout
                transports: ['polling', 'websocket'], // Try polling first
            });

            // Connection events
            socket.on('connect', () => {
                isConnected = true;
                isAuthenticated = true; // Auto-authenticate since server doesn't require auth
                addLog(\`✅ Connected! Socket ID: \${socket.id}\`);
                addLog(\`🔓 Auto-authenticated as User_\${socket.id.substring(0, 8)}\`);
                updateUI();
            });

            socket.on('disconnect', (reason) => {
                isConnected = false;
                isAuthenticated = false;
                currentRoom = null;
                addLog(\`❌ Disconnected: \${reason}\`);
                updateUI();
            });

            socket.on('connect_error', (error) => {
                addLog(\`❌ Connection Error: \${error.message}\`);
                addLog(\`   Error Type: \${error.type || 'unknown'}\`);
                addLog(\`   Error Description: \${error.description || 'none'}\`);
                if (error.context) {
                    addLog(\`   Context: \${JSON.stringify(error.context)}\`);
                }
                updateUI();
            });

            // User info events
            socket.on('user_set', (data) => {
                addLog(\`✅ User info set: \${data.username} (\${data.user_uuid})\`);
            });

            // Chat events
            socket.on('user_joined', (data) => {
                addLog(\`👋 \${data.username} joined room: \${data.room}\`);
            });

            socket.on('user_left', (data) => {
                addLog(\`👋 \${data.username} left room: \${data.room}\`);
            });

            socket.on('new_message', (data) => {
                addLog(\`💬 [\${data.room || 'Private'}] \${data.from_username}: \${data.message}\`);
            });

            socket.on('message_sent', (data) => {
                addLog(\`✅ Message sent: \${data.id}\`);
            });

            socket.on('typing', (data) => {
                addLog(\`⌨️ \${data.from_username} is typing in \${data.room || 'private'}...\`);
            });

            socket.on('online_users', (data) => {
                const roomText = data.room ? \` in room "\${data.room}"\` : '';
                addLog(\`👥 Online users\${roomText}: \${data.users.length}\`);
                data.users.forEach(user => {
                    addLog(\`   - \${user.username} (\${user.user_uuid})\`);
                });
            });

            socket.on('user_online', (data) => {
                addLog(\`🟢 \${data.username} came online\`);
            });

            socket.on('user_offline', (data) => {
                addLog(\`🔴 \${data.username} went offline\`);
            });

            socket.on('error', (message) => {
                addLog(\`❌ Error: \${message}\`);
            });
        }

        function disconnect() {
            if (socket) {
                socket.disconnect();
                socket = null;
            }
            isConnected = false;
            isAuthenticated = false;
            currentRoom = null;
            addLog('🔌 Manually disconnected');
            updateUI();
        }

        function authenticate() {
            if (!socket || !isConnected) {
                addLog('❌ Not connected to server');
                return;
            }

            const userUuid = document.getElementById('userUuid').value;
            const username = document.getElementById('username').value;

            if (!userUuid || !username) {
                addLog('❌ Please enter both User UUID and Username');
                return;
            }

            addLog(\`🔐 Setting user info as \${username} (\${userUuid})...\`);
            socket.emit('set_user', {
                user_uuid: userUuid,
                username: username
            });
        }

        function joinRoom() {
            if (!socket || !isConnected) {
                addLog('❌ Must be connected to server');
                return;
            }

            const roomName = document.getElementById('roomName').value;
            if (!roomName) {
                addLog('❌ Please enter a room name');
                return;
            }

            // Leave current room first
            if (currentRoom) {
                socket.emit('leave_room', currentRoom);
            }

            currentRoom = roomName;
            addLog(\`🏠 Joining room: \${roomName}\`);
            socket.emit('join_room', roomName);
            updateUI();
        }

        function leaveRoom() {
            if (!socket || !isConnected || !currentRoom) {
                addLog('❌ Not in any room');
                return;
            }

            addLog(\`🚪 Leaving room: \${currentRoom}\`);
            socket.emit('leave_room', currentRoom);
            currentRoom = null;
            updateUI();
        }

        function sendMessage() {
            if (!socket || !isConnected) {
                addLog('❌ Must be connected to server');
                return;
            }

            const message = document.getElementById('messageText').value;
            if (!message) {
                addLog('❌ Please enter a message');
                return;
            }

            if (!currentRoom) {
                addLog('❌ Must join a room first');
                return;
            }

            addLog(\`📤 Sending message to room \${currentRoom}: \${message}\`);
            socket.emit('send_message', {
                message: message,
                room: currentRoom
            });

            // Clear message input
            document.getElementById('messageText').value = '';
        }

        function getOnlineUsers() {
            if (!socket || !isConnected) {
                addLog('❌ Must be connected to server');
                return;
            }

            if (currentRoom) {
                addLog(\`👥 Requesting users in room: \${currentRoom}\`);
                socket.emit('request_online_users', currentRoom);
            } else {
                addLog('👥 Requesting all online users');
                socket.emit('request_online_users');
            }
        }

        function clearLog() {
            log.textContent = 'Log cleared...\\n';
        }

        // Initialize UI
        updateUI();

        // Auto-connect on load for convenience
        setTimeout(() => {
            connect();
        }, 500);
        } // End of initializeApp function
        
        // Load Socket.IO and initialize app
        loadSocketIO();
    </script>
</body>
</html>`);
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

// zkteco routes
app.route('/', zktecoRouter);

export default app;
