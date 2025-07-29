import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

export interface SocketData {
  userId?: string;
  username?: string;
}

export interface ClientToServerEvents {
  join_room: (room: string) => void;
  leave_room: (room: string) => void;
  send_message: (data: { order_uuid: string; message: string; user_uuid: string }) => void;
}

export interface ServerToClientEvents {
  new_message: (data: any) => void;
  user_joined: (data: { username: string; room: string }) => void;
  user_left: (data: { username: string; room: string }) => void;
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
    console.log('User connected:', socket.id);

    socket.on('join_room', (room) => {
      socket.join(room);
      socket.to(room).emit('user_joined', {
        username: socket.data.username || 'Anonymous',
        room,
      });
    });

    socket.on('leave_room', (room) => {
      socket.leave(room);
      socket.to(room).emit('user_left', {
        username: socket.data.username || 'Anonymous',
        room,
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
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
