import type { Server as HttpServer } from 'node:http';

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
  send_message: (data: { order_uuid: string; message: string; user_uuid: string }) => void;
  authenticate: (token: string) => void;
  typing: (data: { room: string; user_uuid: string }) => void;
  user_status: (data: { room: string; user_uuid: string }) => void;
  request_online_users: (room: string) => void;
}

export interface ServerToClientEvents {
  new_message: (data: any) => void;
  user_joined: (data: { username: string; room: string; user_uuid?: string }) => void;
  user_left: (data: { username: string; room: string; user_uuid?: string }) => void;
  authentication_success: (data: { user_uuid: string; username: string }) => void;
  authentication_error: (message: string) => void;
  typing: (data: { user_uuid: string; username: string; room: string }) => void;
  user_status: (data: { user_uuid: string; username: string; room: string }) => void;
  online_users: (data: { room: string; users: Array<{ user_uuid: string; username: string; socket_id: string }> }) => void;
  error: (message: string) => void;
}

let io: Server<ClientToServerEvents, ServerToClientEvents, any, SocketData>;

export function initializeSocket(server: HttpServer) {
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
        // TODO: Implement token verification logic here
        // For now, we'll assume the token contains user info
        // In a real implementation, you'd verify the JWT token

        // Mock authentication - replace with your actual auth logic
        if (token && token.length > 0) {
          socket.data.authenticated = true;
          socket.data.user_uuid = 'extracted_from_token'; // Extract from actual token
          socket.data.username = 'username_from_token'; // Extract from actual token

          socket.emit('authentication_success', {
            user_uuid: socket.data.user_uuid,
            username: socket.data.username,
          });
        }
        else {
          socket.emit('authentication_error', 'Invalid token');
        }
      }
      catch {
        socket.emit('authentication_error', 'Authentication failed');
      }
    });

    // Room management
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

    // Message handling
    socket.on('send_message', async (data) => {
      if (!socket.data.authenticated) {
        socket.emit('error', 'Authentication required');
        return;
      }

      try {
        // TODO: Save message to database here
        // This should integrate with your existing chat creation logic
        console.warn('Message received:', data);

        // Emit to room members
        socket.to(`order_${data.order_uuid}`).emit('new_message', {
          ...data,
          username: socket.data.username,
          timestamp: new Date().toISOString(),
        });
      }
      catch {
        socket.emit('error', 'Failed to send message');
      }
    });

    // Typing indicators
    socket.on('typing', (data) => {
      if (!socket.data.authenticated)
        return;

      socket.to(data.room).emit('typing', {
        user_uuid: socket.data.user_uuid || data.user_uuid,
        username: socket.data.username || 'Anonymous',
        room: data.room,
      });
    });

    // Handle user status
    socket.on('user_status', (data) => {
      if (!socket.data.authenticated)
        return;
      socket.to(data.room).emit('user_status', {
        user_uuid: socket.data.user_uuid || data.user_uuid,
        username: socket.data.username || 'Anonymous',
        room: data.room,
      });
    });

    // Online users request
    socket.on('request_online_users', (room) => {
      if (!socket.data.authenticated)
        return;

      const roomSockets = io.sockets.adapter.rooms.get(room);
      const onlineUsers: Array<{ user_uuid: string; username: string; socket_id: string }> = [];

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

      socket.emit('online_users', { room, users: onlineUsers });
    });

    // Cleanup on disconnect
    socket.on('disconnect', () => {
      console.warn('User disconnected:', socket.id, socket.data.username);

      // Notify all rooms that user left
      if (socket.data.rooms) {
        socket.data.rooms.forEach((room) => {
          socket.to(room).emit('user_left', {
            username: socket.data.username || 'Anonymous',
            user_uuid: socket.data.user_uuid,
            room,
          });
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
