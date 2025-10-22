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

// log all the requests
app.use(async (c, next) => {
  console.warn(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  await next();
});

// Apply 50 MB limit to all routes
app.use('*', bodyLimit({
  maxSize: 50 * 1024 * 1024, // 50 MB
  onError: c => c.text('File too large Greater Than 50 MB', 413),
}));

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

// Socket.IO status endpoint (outside v1 path)
app.get('/socket-status', async (c) => {
  try {
    const { getIO, getOnlineUsersCount } = await import('./socket_server');
    const io = getIO();
    return c.json({
      status: 'connected',
      online_users: getOnlineUsersCount(),
      engine_connected: io.engine.clientsCount || 0,
      environment: env.NODE_ENV,
      socket_port: env.SOCKET_PORT,
      api_port: env.PORT,
      socket_url: isDev ? `http://localhost:${env.SOCKET_PORT}` : `http://103.147.163.46:${env.SOCKET_PORT}`,
      api_url: isDev ? `http://localhost:${env.PORT}` : `http://${c.req.header('host') || '103.147.163.46:5090'}`,
      transport_options: ['polling', 'websocket'],
      cors_origin: '*',
    });
  }
  catch (error) {
    return c.json({
      status: 'disconnected',
      error: (error as Error).message,
      environment: env.NODE_ENV,
      socket_port: env.SOCKET_PORT,
      api_port: env.PORT,
    }, 500);
  }
});

// Production diagnostics endpoint
app.get('/socket-diagnostics', async (c) => {
  const apiUrl = isDev ? `http://localhost:${env.PORT}` : `http://${c.req.header('host') || '103.147.163.46:5090'}`;
  const socketUrl = isDev ? `http://localhost:${env.SOCKET_PORT}` : `http://103.147.163.46:${env.SOCKET_PORT}`;

  return c.json({
    environment: env.NODE_ENV,
    api_server: {
      url: apiUrl,
      port: env.PORT,
      status: 'running',
    },
    socket_server: {
      url: socketUrl,
      port: env.SOCKET_PORT,
      status: 'separate_process',
    },
    host_header: c.req.header('host'),
    user_agent: c.req.header('user-agent'),
    origin: c.req.header('origin'),
    connection: c.req.header('connection'),
    upgrade: c.req.header('upgrade'),
    socket_io_path: '/socket.io/',
    socket_io_test_url: `${socketUrl}/socket.io/?EIO=4&transport=polling`,
    recommended_client_config: {
      url: socketUrl,
      transports: ['polling', 'websocket'],
      upgrade: true,
      timeout: 10000,
      forceNew: true,
    },
    separation_benefits: [
      'Socket.IO runs on dedicated port (no conflicts with API)',
      'Easier proxy configuration (separate upstream)',
      'Better resource isolation',
      'Simplified debugging and monitoring',
    ],
    common_production_issues: [
      'Reverse proxy not configured for WebSocket upgrade',
      'Firewall blocking WebSocket connections on socket port',
      'Load balancer not supporting sticky sessions',
      'CORS headers not properly configured',
      'Client timeout too short for production latency',
    ],
  });
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
            <input type="text" id="serverUrl" value="${isDev ? 'http://localhost:5091' : `http://${c.req.header('host') || '103.147.163.46:5090'}`}" placeholder="Server URL">
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

if (!isDev) {
  app.use(`${basePath}/*`, async (c, next) => {
    if (
      isPublicRoute(c.req.path, c.req.method)
    ) {
      return next();
    }
    return bearerAuth({ verifyToken: VerifyToken })(c, next);
  });
}

routes.forEach((route) => {
  app.route(basePath, route);
});

// zkteco routes
app.route('/', zktecoRouter);

export default app;
