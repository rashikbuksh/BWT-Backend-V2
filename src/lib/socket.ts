import type { Server as HttpServer } from 'node:http';

import { Buffer } from 'node:buffer';
import { Server } from 'socket.io';

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
  authenticate: (token: string) => void;
  typing: (data: { room?: string; to_user_uuid?: string }) => void;
  request_online_users: (room?: string) => void;
  private_message: (data: { to_user_uuid: string; message: string }) => void;
}

export interface ServerToClientEvents {
  new_message: (data: any) => void;
  message_sent: (data: any) => void;
  user_joined: (data: { username: string; user_uuid?: string; room?: string }) => void;
  user_left: (data: { username: string; user_uuid?: string; room?: string }) => void;
  authentication_success: (data: { user_uuid: string; username: string }) => void;
  authentication_error: (message: string) => void;
  typing: (data: { from_user_uuid: string; from_username: string; room?: string }) => void;
  online_users: (data: { users: Array<{ user_uuid: string; username: string; socket_id: string }>; room?: string }) => void;
  user_online: (data: { user_uuid: string; username: string }) => void;
  user_offline: (data: { user_uuid: string; username: string }) => void;
  error: (message: string) => void;
}

let io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>;

export function initializeSocket(server: HttpServer) {
  console.warn('Initializing Socket.IO server...');
  io = new Server(server, {
    cors: {
      origin: '*', // Configure this properly for production
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.warn('User connected:', socket.id);

    // Initialize socket data
    socket.data.authenticated = false;
    socket.data.rooms = new Set();

    // Authentication handler
    socket.on('authenticate', async (token) => {
      try {
        if (!token || token.length === 0) {
          socket.emit('authentication_error', 'Token required');
          return;
        }

        // Import JWT verification from your auth middleware
        const { verify } = await import('hono/jwt');
        const env = await import('@/env');

        try {
          // Verify the JWT token using your existing auth system
          const decoded = await verify(token, env.default.PRIVATE_KEY);

          if (decoded && decoded.user_uuid && (decoded.name || decoded.username)) {
            socket.data.authenticated = true;
            socket.data.user_uuid = decoded.user_uuid as string;
            socket.data.username = (decoded.name || decoded.username) as string;

            socket.emit('authentication_success', {
              user_uuid: socket.data.user_uuid!,
              username: socket.data.username!,
            });

            console.warn(`User authenticated: ${socket.data.username} (${socket.data.user_uuid})`);
          }
          else {
            socket.emit('authentication_error', 'Invalid token payload - missing user_uuid or name');
          }
        }
        catch (verifyError) {
          // Fallback to simple token format for testing
          console.warn('JWT verification failed, trying simple token format:', verifyError);

          try {
            const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

            if (decoded && decoded.user_uuid && (decoded.name || decoded.username)) {
              socket.data.authenticated = true;
              socket.data.user_uuid = decoded.user_uuid;
              socket.data.username = decoded.name || decoded.username;

              socket.emit('authentication_success', {
                user_uuid: socket.data.user_uuid!,
                username: socket.data.username!,
              });

              console.warn(`User authenticated with simple token: ${socket.data.username} (${socket.data.user_uuid})`);
            }
            else {
              socket.emit('authentication_error', 'Invalid token format - missing required fields');
            }
          }
          catch {
            socket.emit('authentication_error', 'Invalid token format');
          }
        }
      }
      catch (error) {
        console.warn('Authentication error:', error);
        socket.emit('authentication_error', 'Authentication failed');
      }
    });

    // Room management for group chat
    socket.on('join_room', (room) => {
      if (!socket.data.authenticated) {
        socket.emit('error', 'Authentication required');
        return;
      }

      socket.join(room);
      socket.data.rooms?.add(room);

      socket.to(room).emit('user_joined', {
        username: socket.data.username || 'Anonymous',
        user_uuid: socket.data.user_uuid,
        room,
      });

      console.warn(`User ${socket.data.username} (${socket.id}) joined room: ${room}`);
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      socket.data.rooms?.delete(room);

      socket.to(room).emit('user_left', {
        username: socket.data.username || 'Anonymous',
        user_uuid: socket.data.user_uuid,
        room,
      });

      console.warn(`User ${socket.data.username} (${socket.id}) left room: ${room}`);
    });

    // Message handling for both room chat and private messages
    socket.on('send_message', async (data) => {
      if (!socket.data.authenticated) {
        socket.emit('error', 'Authentication required');
        return;
      }

      try {
        console.warn('Message received:', data);

        // Create message data
        const messageData = {
          id: Date.now(), // Simple ID for testing
          message: data.message,
          from_user_uuid: socket.data.user_uuid,
          from_username: socket.data.username,
          to_user_uuid: data.to_user_uuid || null,
          room: data.room || null,
          timestamp: new Date().toISOString(),
        };

        if (data.room) {
          // Room chat - broadcast to all users in the room
          socket.to(data.room).emit('new_message', messageData);
          console.warn(`Message sent to room: ${data.room}`);
        }
        else if (data.to_user_uuid) {
          // Private message - send to specific user
          for (const [_, targetSocket] of io.sockets.sockets) {
            if (targetSocket.data.user_uuid === data.to_user_uuid && targetSocket.data.authenticated) {
              targetSocket.emit('new_message', messageData);
              console.warn(`Private message sent to user: ${data.to_user_uuid}`);
              break;
            }
          }
        }
        else {
          socket.emit('error', 'Must specify either room or to_user_uuid');
          return;
        }

        // Confirm message was sent to sender
        socket.emit('message_sent', messageData);
      }
      catch (error) {
        console.warn('Failed to send message:', error);
        socket.emit('error', 'Failed to send message');
      }
    }); // Typing indicators for both room chat and private messages
    socket.on('typing', (data) => {
      if (!socket.data.authenticated)
        return;

      const typingData = {
        from_user_uuid: socket.data.user_uuid || 'unknown',
        from_username: socket.data.username || 'Anonymous',
        room: data.room || undefined,
      };

      if (data.room) {
        // Room typing indicator - broadcast to all users in the room
        socket.to(data.room).emit('typing', typingData);
      }
      else if (data.to_user_uuid) {
        // Private typing indicator - send to specific user
        for (const [_, targetSocket] of io.sockets.sockets) {
          if (targetSocket.data.user_uuid === data.to_user_uuid && targetSocket.data.authenticated) {
            targetSocket.emit('typing', typingData);
            break;
          }
        }
      }
    });

    // Get online users (all users or users in a specific room)
    socket.on('request_online_users', (room) => {
      if (!socket.data.authenticated)
        return;

      const onlineUsers: Array<{ user_uuid: string; username: string; socket_id: string }> = [];

      if (room) {
        // Get users in a specific room
        const roomSockets = io.sockets.adapter.rooms.get(room);
        if (roomSockets) {
          roomSockets.forEach((socketId) => {
            const roomSocket = io.sockets.sockets.get(socketId);
            if (roomSocket && roomSocket.data.authenticated) {
              onlineUsers.push({
                user_uuid: roomSocket.data.user_uuid || 'unknown',
                username: roomSocket.data.username || 'Anonymous',
                socket_id: socketId,
              });
            }
          });
        }
      }
      else {
        // Get all online users
        for (const [socketId, connectedSocket] of io.sockets.sockets) {
          if (connectedSocket.data.authenticated) {
            onlineUsers.push({
              user_uuid: connectedSocket.data.user_uuid || 'unknown',
              username: connectedSocket.data.username || 'Anonymous',
              socket_id: socketId,
            });
          }
        }
      }

      socket.emit('online_users', { users: onlineUsers, room });
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.warn('User disconnected:', socket.id, socket.data.username);

      // Notify all users that this user went offline
      if (socket.data.authenticated) {
        io.emit('user_offline', {
          user_uuid: socket.data.user_uuid || 'unknown',
          username: socket.data.username || 'Anonymous',
        });
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

// Utility functions for socket management
export function emitToRoom(room: string, event: keyof ServerToClientEvents, data: any) {
  if (io) {
    io.to(room).emit(event as any, data);
  }
}

export function emitToUser(userId: string, event: keyof ServerToClientEvents, data: any) {
  if (io) {
    // Find socket by user ID
    for (const [_socketId, socket] of io.sockets.sockets) {
      if (socket.data.user_uuid === userId) {
        socket.emit(event as any, data);
        break;
      }
    }
  }
}

export function getRoomUsers(room: string): Array<{ user_uuid: string; username: string; socket_id: string }> {
  if (!io)
    return [];

  const roomSockets = io.sockets.adapter.rooms.get(room);
  const users: Array<{ user_uuid: string; username: string; socket_id: string }> = [];

  if (roomSockets) {
    roomSockets.forEach((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.data.authenticated) {
        users.push({
          user_uuid: socket.data.user_uuid || 'unknown',
          username: socket.data.username || 'Anonymous',
          socket_id: socketId,
        });
      }
    });
  }

  return users;
}

export function isUserOnline(userId: string): boolean {
  if (!io)
    return false;

  for (const [_socketId, socket] of io.sockets.sockets) {
    if (socket.data.user_uuid === userId && socket.data.authenticated) {
      return true;
    }
  }
  return false;
}

export function getOnlineUsersCount(): number {
  if (!io)
    return 0;

  let count = 0;
  for (const [_socketId, socket] of io.sockets.sockets) {
    if (socket.data.authenticated) {
      count++;
    }
  }
  return count;
}
