import { createServer } from 'node:http';
import { Server } from 'socket.io';

import env from './env';

export interface SocketData {
  userId?: string;
  username?: string;
  user_uuid?: string;
  authenticated?: boolean;
  rooms?: Set<string>;
}

export interface ClientToServerEvents {
  join_room: (room: string) => void;
  leave_room: (room: string) => void;
  send_message: (data: { message: string; room?: string; to_user_uuid?: string }) => void;
  set_user: (data: { user_uuid?: string; username?: string }) => void;
  typing: (data: { room?: string; to_user_uuid?: string }) => void;
  request_online_users: (room?: string) => void;
  private_message: (data: { to_user_uuid: string; message: string }) => void;
}

export interface ServerToClientEvents {
  new_message: (data: any) => void;
  message_sent: (data: any) => void;
  user_joined: (data: { username: string; user_uuid?: string; room?: string }) => void;
  user_left: (data: { username: string; user_uuid?: string; room?: string }) => void;
  user_set: (data: { user_uuid: string; username: string }) => void;
  typing: (data: { from_user_uuid: string; from_username: string; room?: string }) => void;
  online_users: (data: { users: Array<{ user_uuid: string; username: string; socket_id: string }>; room?: string }) => void;
  user_online: (data: { user_uuid: string; username: string }) => void;
  user_offline: (data: { user_uuid: string; username: string }) => void;
  error: (message: string) => void;
}

// In-memory storage for connected users and rooms
const connectedUsers = new Map<string, { socket_id: string; user_uuid: string; username: string; rooms: Set<string> }>();
const roomUsers = new Map<string, Set<string>>(); // room -> set of user_uuids

const SOCKET_PORT = env.SOCKET_PORT;
const isDev = env.NODE_ENV === 'development';

// Create dedicated HTTP server for Socket.IO
const socketServer = createServer();

console.warn(`🔌 Initializing dedicated Socket.IO server on port ${SOCKET_PORT}...`);

const io = new Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>(socketServer, {
  cors: {
    origin: '*', // Allow all origins - you can restrict this in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  // Production-optimized transport settings
  transports: ['polling', 'websocket'], // Polling first for better compatibility
  allowEIO3: true,

  // Extended timeouts for production environments
  pingTimeout: isDev ? 60000 : 120000, // 60s dev, 120s prod
  pingInterval: isDev ? 25000 : 30000, // 25s dev, 30s prod
  upgradeTimeout: isDev ? 30000 : 60000, // 30s dev, 60s prod

  // Increased buffer size for production
  maxHttpBufferSize: 1e6, // 1MB

  // Additional production settings
  allowUpgrades: true,
  perMessageDeflate: false, // Disable compression for better performance
  httpCompression: true,

  // Connection state recovery for better reliability
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

// Enhanced debugging for connection attempts
io.engine.on('connection_error', (err) => {
  console.warn('Socket.IO connection error:');
  console.warn('- Request URL:', err.req?.url);
  console.warn('- Error Code:', err.code);
  console.warn('- Error Message:', err.message);
  console.warn('- Context:', err.context);
  console.warn('- Headers:', err.req?.headers);
});

io.engine.on('initial_headers', (headers, request) => {
  console.warn('Socket.IO initial headers for:', request.url);
});

io.engine.on('headers', (headers, request) => {
  console.warn('Socket.IO headers for:', request.url);
});

io.on('connection', (socket) => {
  console.warn('✅ User connected:', socket.id);

  // Initialize socket data with default values
  socket.data.authenticated = true; // Always authenticated for simplicity
  socket.data.rooms = new Set();
  socket.data.user_uuid = socket.id; // Use socket ID as user ID
  socket.data.username = `User_${socket.id.substring(0, 8)}`; // Generate simple username

  // Add to connected users
  connectedUsers.set(socket.id, {
    socket_id: socket.id,
    user_uuid: socket.data.user_uuid!,
    username: socket.data.username!,
    rooms: new Set(),
  });

  // Simple user setup handler (optional - for setting custom username)
  socket.on('set_user', (data: { user_uuid?: string; username?: string }) => {
    if (data.user_uuid) {
      socket.data.user_uuid = data.user_uuid;
    }
    if (data.username) {
      socket.data.username = data.username;
    }

    // Update connected users map
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.user_uuid = socket.data.user_uuid!;
      userInfo.username = socket.data.username!;
    }

    socket.emit('user_set', {
      user_uuid: socket.data.user_uuid!,
      username: socket.data.username!,
    });

    console.warn(`👤 User info set: ${socket.data.username} (${socket.data.user_uuid})`);
  });

  // Room management for group chat
  socket.on('join_room', (room) => {
    if (!room || typeof room !== 'string') {
      socket.emit('error', 'Invalid room name');
      return;
    }

    // Leave all current rooms first
    socket.data.rooms?.forEach((currentRoom) => {
      socket.leave(currentRoom);
      // Remove from room users tracking
      const roomUserSet = roomUsers.get(currentRoom);
      if (roomUserSet) {
        roomUserSet.delete(socket.data.user_uuid!);
        if (roomUserSet.size === 0) {
          roomUsers.delete(currentRoom);
        }
      }
    });
    socket.data.rooms?.clear();

    // Join the new room
    socket.join(room);
    socket.data.rooms?.add(room);

    // Update room users tracking
    if (!roomUsers.has(room)) {
      roomUsers.set(room, new Set());
    }
    roomUsers.get(room)?.add(socket.data.user_uuid!);

    // Update connected users map
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.rooms.clear();
      userInfo.rooms.add(room);
    }

    // Notify room about new user
    socket.to(room).emit('user_joined', {
      username: socket.data.username!,
      user_uuid: socket.data.user_uuid!,
      room,
    });

    console.warn(`🏠 User ${socket.data.username} joined room: ${room}`);
  });

  socket.on('leave_room', (room) => {
    if (!room || typeof room !== 'string') {
      socket.emit('error', 'Invalid room name');
      return;
    }

    socket.leave(room);
    socket.data.rooms?.delete(room);

    // Remove from room users tracking
    const roomUserSet = roomUsers.get(room);
    if (roomUserSet) {
      roomUserSet.delete(socket.data.user_uuid!);
      if (roomUserSet.size === 0) {
        roomUsers.delete(room);
      }
    }

    // Update connected users map
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.rooms.delete(room);
    }

    // Notify room about user leaving
    socket.to(room).emit('user_left', {
      username: socket.data.username!,
      user_uuid: socket.data.user_uuid!,
      room,
    });

    console.warn(`🚪 User ${socket.data.username} left room: ${room}`);
  });

  // Message handling for room chat
  socket.on('send_message', (data) => {
    if (!data.message || typeof data.message !== 'string') {
      socket.emit('error', 'Invalid message');
      return;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (data.room) {
      // Room message
      if (!socket.data.rooms?.has(data.room)) {
        socket.emit('error', 'You are not in this room');
        return;
      }

      const messageData = {
        id: messageId,
        message: data.message,
        from_user_uuid: socket.data.user_uuid!,
        from_username: socket.data.username!,
        room: data.room,
        timestamp: new Date().toISOString(),
      };

      // Send to all users in the room (including sender)
      io.to(data.room).emit('new_message', messageData);

      console.warn(`💬 Room message in ${data.room}: ${socket.data.username}: ${data.message}`);
    }
    else if (data.to_user_uuid) {
      // Private message
      const targetUser = Array.from(connectedUsers.values()).find(user => user.user_uuid === data.to_user_uuid);

      if (!targetUser) {
        socket.emit('error', 'User not found or offline');
        return;
      }

      const messageData = {
        id: messageId,
        message: data.message,
        from_user_uuid: socket.data.user_uuid!,
        from_username: socket.data.username!,
        to_user_uuid: data.to_user_uuid,
        timestamp: new Date().toISOString(),
      };

      // Send to target user
      io.to(targetUser.socket_id).emit('new_message', messageData);
      // Send confirmation to sender
      socket.emit('message_sent', { id: messageId, to: data.to_user_uuid });

      console.warn(`📧 Private message: ${socket.data.username} -> ${targetUser.username}: ${data.message}`);
    }
    else {
      socket.emit('error', 'Message must specify either room or target user');
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    if (data.room && socket.data.rooms?.has(data.room)) {
      socket.to(data.room).emit('typing', {
        from_user_uuid: socket.data.user_uuid!,
        from_username: socket.data.username!,
        room: data.room,
      });
    }
    else if (data.to_user_uuid) {
      const targetUser = Array.from(connectedUsers.values()).find(user => user.user_uuid === data.to_user_uuid);
      if (targetUser) {
        io.to(targetUser.socket_id).emit('typing', {
          from_user_uuid: socket.data.user_uuid!,
          from_username: socket.data.username!,
        });
      }
    }
  });

  // Request online users
  socket.on('request_online_users', (room) => {
    if (room) {
      // Users in specific room
      const roomUserSet = roomUsers.get(room);
      if (roomUserSet) {
        const users = Array.from(roomUserSet)
          .map((user_uuid) => {
            const userInfo = Array.from(connectedUsers.values()).find(u => u.user_uuid === user_uuid);
            return userInfo
              ? {
                  user_uuid: userInfo.user_uuid,
                  username: userInfo.username,
                  socket_id: userInfo.socket_id,
                }
              : null;
          })
          .filter((user): user is { user_uuid: string; username: string; socket_id: string } => user !== null);

        socket.emit('online_users', { users, room });
      }
      else {
        socket.emit('online_users', { users: [], room });
      }
    }
    else {
      // All online users
      const users = Array.from(connectedUsers.values()).map(user => ({
        user_uuid: user.user_uuid,
        username: user.username,
        socket_id: user.socket_id,
      }));

      socket.emit('online_users', { users });
    }
  });

  // Handle private messages
  socket.on('private_message', (data) => {
    if (!data.to_user_uuid || !data.message) {
      socket.emit('error', 'Invalid private message data');
      return;
    }

    const targetUser = Array.from(connectedUsers.values()).find(user => user.user_uuid === data.to_user_uuid);

    if (!targetUser) {
      socket.emit('error', 'User not found or offline');
      return;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      id: messageId,
      message: data.message,
      from_user_uuid: socket.data.user_uuid!,
      from_username: socket.data.username!,
      to_user_uuid: data.to_user_uuid,
      timestamp: new Date().toISOString(),
    };

    // Send to target user
    io.to(targetUser.socket_id).emit('new_message', messageData);
    // Send confirmation to sender
    socket.emit('message_sent', { id: messageId, to: data.to_user_uuid });

    console.warn(`📧 Private message: ${socket.data.username} -> ${targetUser.username}: ${data.message}`);
  });

  socket.on('disconnect', (reason) => {
    console.warn(`❌ User disconnected: ${socket.id}, reason: ${reason}`);

    // Get user info before cleanup
    const userInfo = connectedUsers.get(socket.id);

    if (userInfo) {
      // Remove from all rooms
      userInfo.rooms.forEach((room) => {
        const roomUserSet = roomUsers.get(room);
        if (roomUserSet) {
          roomUserSet.delete(userInfo.user_uuid);
          if (roomUserSet.size === 0) {
            roomUsers.delete(room);
          }
        }

        // Notify room users about user leaving
        socket.to(room).emit('user_left', {
          username: userInfo.username,
          user_uuid: userInfo.user_uuid,
          room,
        });
      });

      // Notify other users about user going offline
      socket.broadcast.emit('user_offline', {
        user_uuid: userInfo.user_uuid,
        username: userInfo.username,
      });

      // Remove from connected users
      connectedUsers.delete(socket.id);
    }
  });

  // Notify other users about new user coming online
  socket.broadcast.emit('user_online', {
    user_uuid: socket.data.user_uuid!,
    username: socket.data.username!,
  });
});

// Export functions for external use
export function getIO() {
  return io;
}

export function getOnlineUsersCount() {
  return connectedUsers.size;
}

export function getConnectedUsers() {
  return Array.from(connectedUsers.values());
}

export function getRoomUsers(room: string) {
  const roomUserSet = roomUsers.get(room);
  if (!roomUserSet)
    return [];

  return Array.from(roomUserSet)
    .map((user_uuid) => {
      const userInfo = Array.from(connectedUsers.values()).find(u => u.user_uuid === user_uuid);
      return userInfo
        ? {
            user_uuid: userInfo.user_uuid,
            username: userInfo.username,
            socket_id: userInfo.socket_id,
          }
        : null;
    })
    .filter((user): user is { user_uuid: string; username: string; socket_id: string } => user !== null);
}

// Start the Socket.IO server
socketServer.listen(SOCKET_PORT, '0.0.0.0', () => {
  console.warn(`🔌 Socket.IO server is running on port ${SOCKET_PORT}`);
  console.warn(`🌐 Environment: ${env.NODE_ENV}`);
  console.warn(`🔗 Socket.IO endpoint: http://0.0.0.0:${SOCKET_PORT}`);
  console.warn(`📊 Connected users will be tracked separately from main API server`);
});

export default socketServer;
