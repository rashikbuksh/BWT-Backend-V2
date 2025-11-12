import type { ServerWebSocket } from 'bun';

import { upgradeWebSocket } from 'hono/bun';

import app from './app';
import env from './env';

const port = env.PORT;

// Store user data associated with each WebSocket
interface UserData {
  username: string;
  userId: string;
  rooms: Set<string>;
}

// Map to track connected users
const connectedUsers = new Map<ServerWebSocket, UserData>();

// Helper function to get room users
function getRoomUsers(room: string) {
  const users: { username: string; userId: string }[] = [];
  connectedUsers.forEach((userData) => {
    if (userData.rooms.has(room)) {
      users.push({ username: userData.username, userId: userData.userId });
    }
  });
  return users;
}

// Add WebSocket route with room support
app.get(
  '/ws',
  upgradeWebSocket(_ => ({
    onOpen(_, ws) {
      const rawWs = ws.raw as ServerWebSocket;

      // Initialize user data
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userData: UserData = {
        username: `Guest_${userId.substr(-6)}`,
        userId,
        rooms: new Set(),
      };

      connectedUsers.set(rawWs, userData);

      console.warn(`WebSocket connection opened for user: ${userId}`);

      // Send welcome message
      rawWs.send(JSON.stringify({
        type: 'connected',
        userId,
        username: userData.username,
        message: 'Connected to WebSocket server',
      }));
    },

    onClose(_, ws) {
      const rawWs = ws.raw as ServerWebSocket;
      const userData = connectedUsers.get(rawWs);

      if (userData) {
        // Notify all rooms that user left
        userData.rooms.forEach((room) => {
          rawWs.unsubscribe(room);

          // Notify other users in the room
          const notification = JSON.stringify({
            type: 'user_left',
            room,
            username: userData.username,
            userId: userData.userId,
            roomUsers: getRoomUsers(room),
          });

          connectedUsers.forEach((ud, ws) => {
            if (ud.rooms.has(room) && ws !== rawWs) {
              ws.send(notification);
            }
          });
        });

        connectedUsers.delete(rawWs);
        console.warn(`User ${userData.username} (${userData.userId}) disconnected`);
      }
    },

    onMessage: async (event, ws) => {
      const rawWs = ws.raw as ServerWebSocket;
      const userData = connectedUsers.get(rawWs);

      if (!userData) {
        console.error('❌ User data not found for WebSocket');
        return;
      }

      try {
        // Parse incoming message
        const messageStr = typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer);

        console.warn('📨 Raw message received:', messageStr);
        const message = JSON.parse(messageStr);
        console.warn('✅ Parsed message:', JSON.stringify(message, null, 2));
        console.warn(`👤 From user: ${userData.username} (${userData.userId})`);

        // Handle different message types
        switch (message.type) {
          case 'set_username': {
            // Update username
            userData.username = message.username || userData.username;
            rawWs.send(JSON.stringify({
              type: 'username_updated',
              username: userData.username,
              userId: userData.userId,
            }));
            break;
          }

          case 'join_room': {
            // Join a room
            const roomToJoin = message.room || 'general';
            userData.rooms.add(roomToJoin);
            rawWs.subscribe(roomToJoin);

            console.warn(`✅ User ${userData.username} joined room: ${roomToJoin}`);

            const roomUsers = getRoomUsers(roomToJoin);
            console.warn(`👥 Users in room ${roomToJoin}:`, roomUsers.length);

            // Send confirmation to user
            const confirmation = {
              type: 'room_joined',
              room: roomToJoin,
              roomUsers,
            };
            console.warn(`📤 Sending room_joined confirmation:`, JSON.stringify(confirmation, null, 2));
            rawWs.send(JSON.stringify(confirmation));

            // Notify others in the room
            const joinNotification = JSON.stringify({
              type: 'user_joined',
              room: roomToJoin,
              username: userData.username,
              userId: userData.userId,
              roomUsers: getRoomUsers(roomToJoin),
            });

            connectedUsers.forEach((ud, ws) => {
              if (ud.rooms.has(roomToJoin) && ws !== rawWs) {
                ws.send(joinNotification);
              }
            });
            break;
          }

          case 'leave_room': {
            // Leave a room
            const roomToLeave = message.room;
            if (userData.rooms.has(roomToLeave)) {
              userData.rooms.delete(roomToLeave);
              rawWs.unsubscribe(roomToLeave);

              console.warn(`User ${userData.username} left room: ${roomToLeave}`);

              // Send confirmation to user
              rawWs.send(JSON.stringify({
                type: 'room_left',
                room: roomToLeave,
              }));

              // Notify others in the room
              const leaveNotification = JSON.stringify({
                type: 'user_left',
                room: roomToLeave,
                username: userData.username,
                userId: userData.userId,
                roomUsers: getRoomUsers(roomToLeave),
              });

              connectedUsers.forEach((ud, ws) => {
                if (ud.rooms.has(roomToLeave)) {
                  ws.send(leaveNotification);
                }
              });
            }
            break;
          }

          case 'chat_message': {
            // Send chat message to room
            const room = message.room || 'general';

            if (!userData.rooms.has(room)) {
              rawWs.send(JSON.stringify({
                type: 'error',
                message: `You are not in room: ${room}`,
              }));
              return;
            }

            const chatMessage = JSON.stringify({
              type: 'chat_message',
              room,
              username: userData.username,
              userId: userData.userId,
              message: message.message,
              timestamp: new Date().toISOString(),
            });

            // Broadcast to all users in the room including sender
            rawWs.publish(room, chatMessage);
            console.warn(`Message sent to room ${room} by ${userData.username}: ${message.message}`);
            break;
          }

          case 'get_rooms': {
            // Get list of available rooms
            const rooms = Array.from(new Set(
              Array.from(connectedUsers.values())
                .flatMap(ud => Array.from(ud.rooms)),
            ));

            rawWs.send(JSON.stringify({
              type: 'rooms_list',
              rooms: rooms.map(r => ({
                name: r,
                userCount: getRoomUsers(r).length,
              })),
            }));
            break;
          }

          default:
            rawWs.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
            }));
        }
      }
      catch (error) {
        console.error('Error processing message:', error);
        rawWs.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }));
      }
    },
  })),
);

// Use Bun's native server
Bun.serve({
  port,
  fetch: app.fetch,
  websocket: {
    message(ws: ServerWebSocket, message: string | ArrayBuffer | ArrayBufferView) {
      // Handle messages at Bun server level - delegate to room-based handler
      const userData = connectedUsers.get(ws);
      if (!userData) {
        return;
      }

      // Messages are handled in the upgradeWebSocket handler above
      // This is just for Bun's native websocket support
      console.warn('WebSocket native message received:', message);
    },
    open(_ws: ServerWebSocket) {
      console.warn('WebSocket native connection opened');
    },
    close(_ws: ServerWebSocket) {
      console.warn('WebSocket native connection closed');
    },
  },
});

console.warn(`🚀 Server is running on http://localhost:${port}`);
console.warn(`📡 WebSocket endpoint: ws://localhost:${port}/ws`);
console.warn(`🧪 Test room chat at: http://localhost:${port}/ws-room-test`);
console.warn(`🧪 Test native WebSocket at: http://localhost:${port}/ws-native-test`);
console.warn(`🧪 Test simple WebSocket at: http://localhost:${port}/ws-test`);
