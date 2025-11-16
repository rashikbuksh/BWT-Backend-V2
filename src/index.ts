import type { ServerWebSocket } from 'bun';

import { upgradeWebSocket } from 'hono/bun';

import app from './app';
import env from './env';
import { chatManager } from './lib/websocket_chat';

const port = env.PORT;

// Add WebSocket route with room support
app.get(
  '/ws',
  upgradeWebSocket(_ => ({
    onOpen(_, ws) {
      const rawWs = ws.raw as ServerWebSocket;

      // Initialize user data
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const username = `Guest_${userId.substr(-6)}`;

      const userData = chatManager.addUser(rawWs, userId, username);

      console.warn(`✅ WebSocket connection opened for user: ${userId}`);

      // Send welcome message with available rooms
      const availableRooms = chatManager.getAllRooms().map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        userCount: chatManager.getRoomUserCount(room.id),
      }));

      rawWs.send(JSON.stringify({
        type: 'connected',
        userId: userData.userId,
        username: userData.username,
        message: 'Connected to WebSocket server',
        availableRooms,
      }));
    },

    onClose(_, ws) {
      const rawWs = ws.raw as ServerWebSocket;
      const userData = chatManager.getUser(rawWs);

      if (userData) {
        // Notify all rooms that user left
        const userRooms = Array.from(userData.rooms);

        userRooms.forEach((roomId) => {
          chatManager.leaveRoom(rawWs, roomId);

          // Notify other users in the room
          chatManager.broadcastToRoom(roomId, {
            type: 'user_left',
            room: roomId,
            username: userData.username,
            userId: userData.userId,
            roomUsers: chatManager.getRoomUsers(roomId),
            timestamp: new Date().toISOString(),
          });
        });

        chatManager.removeUser(rawWs);
        console.warn(`❌ User ${userData.username} (${userData.userId}) disconnected`);
      }
    },

    onMessage: async (event, ws) => {
      const rawWs = ws.raw as ServerWebSocket;
      const userData = chatManager.getUser(rawWs);

      if (!userData) {
        console.error('❌ User data not found for WebSocket');
        return;
      }

      try {
        // Parse incoming message
        const messageStr = typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer);

        const message = JSON.parse(messageStr);
        console.warn(`📨 Message from ${userData.username}:`, message.type);

        // Handle different message types
        switch (message.type) {
          case 'set_username': {
            // Update username
            const newUsername = message.username || userData.username;
            chatManager.updateUsername(rawWs, newUsername);

            rawWs.send(JSON.stringify({
              type: 'username_updated',
              username: newUsername,
              userId: userData.userId,
              timestamp: new Date().toISOString(),
            }));
            break;
          }

          case 'set_user_uuid': {
            // Link authenticated user
            if (message.user_uuid) {
              chatManager.setUserUuid(rawWs, message.user_uuid);

              rawWs.send(JSON.stringify({
                type: 'user_uuid_set',
                user_uuid: message.user_uuid,
                userId: userData.userId,
                timestamp: new Date().toISOString(),
              }));
            }
            break;
          }

          case 'create_room': {
            // Create a new room
            const { name, description } = message;
            if (!name) {
              rawWs.send(JSON.stringify({
                type: 'error',
                message: 'Room name is required',
              }));
              return;
            }

            const roomId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

            if (chatManager.getRoom(roomId)) {
              rawWs.send(JSON.stringify({
                type: 'error',
                message: 'Room already exists',
              }));
              return;
            }

            const newRoom = chatManager.createRoom(roomId, name, description, userData.userId);

            // Send confirmation to creator
            rawWs.send(JSON.stringify({
              type: 'room_created',
              room: {
                id: newRoom.id,
                name: newRoom.name,
                description: newRoom.description,
                created_at: newRoom.created_at,
              },
              timestamp: new Date().toISOString(),
            }));

            // Broadcast to all connected users that a new room is available
            const allRooms = chatManager.getAllRooms().map(room => ({
              id: room.id,
              name: room.name,
              description: room.description,
              created_at: room.created_at,
              userCount: chatManager.getRoomUserCount(room.id),
            }));

            chatManager.getAllConnectedUsers().forEach((user, userWs) => {
              userWs.send(JSON.stringify({
                type: 'rooms_list',
                rooms: allRooms,
                timestamp: new Date().toISOString(),
              }));
            });

            console.warn(`✨ Room created: ${roomId} by ${userData.username}`);
            break;
          }

          case 'join_room': {
            // Join a room
            const roomId = message.room || 'general';
            const result = chatManager.joinRoom(rawWs, roomId);

            if (!result.success) {
              rawWs.send(JSON.stringify({
                type: 'error',
                message: result.error,
              }));
              return;
            }

            const roomUsers = chatManager.getRoomUsers(roomId);
            const recentMessages = chatManager.getRoomMessages(roomId, 20);

            console.warn(`✅ User ${userData.username} joined room: ${roomId}`);

            // Send confirmation to user
            rawWs.send(JSON.stringify({
              type: 'room_joined',
              room: {
                id: result.room!.id,
                name: result.room!.name,
                description: result.room!.description,
              },
              roomUsers,
              recentMessages,
              timestamp: new Date().toISOString(),
            }));

            // Notify others in the room
            chatManager.broadcastToRoom(roomId, {
              type: 'user_joined',
              room: roomId,
              username: userData.username,
              userId: userData.userId,
              user_uuid: userData.user_uuid,
              roomUsers,
              timestamp: new Date().toISOString(),
            }, rawWs);
            break;
          }

          case 'leave_room': {
            // Leave a room
            const roomId = message.room;
            const result = chatManager.leaveRoom(rawWs, roomId);

            if (!result.success) {
              rawWs.send(JSON.stringify({
                type: 'error',
                message: result.error,
              }));
              return;
            }

            console.warn(`🚪 User ${userData.username} left room: ${roomId}`);

            // Send confirmation to user
            rawWs.send(JSON.stringify({
              type: 'room_left',
              room: roomId,
              timestamp: new Date().toISOString(),
            }));

            // Notify others in the room
            const roomUsers = chatManager.getRoomUsers(roomId);
            chatManager.broadcastToRoom(roomId, {
              type: 'user_left',
              room: roomId,
              username: userData.username,
              userId: userData.userId,
              roomUsers,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          case 'chat_message': {
            // Send chat message to room
            const roomId = message.room || 'general';

            if (!userData.rooms.has(roomId)) {
              rawWs.send(JSON.stringify({
                type: 'error',
                message: `You are not in room: ${roomId}`,
              }));
              return;
            }

            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = new Date().toISOString();

            const chatMessage = {
              id: messageId,
              room_id: roomId,
              message: message.message,
              from_user_uuid: userData.user_uuid || userData.userId,
              from_username: userData.username,
              timestamp,
              type: 'text' as const,
            };

            // Store message in history
            chatManager.addMessage(roomId, chatMessage);

            // Broadcast to all users in the room including sender
            const broadcastMessage = {
              type: 'chat_message',
              messageId,
              room: roomId,
              username: userData.username,
              userId: userData.userId,
              user_uuid: userData.user_uuid,
              message: message.message,
              timestamp,
            };

            rawWs.publish(roomId, JSON.stringify(broadcastMessage));

            console.warn(`💬 Message in ${roomId} from ${userData.username}: ${message.message.substring(0, 50)}`);
            break;
          }

          case 'typing': {
            // Typing indicator
            const roomId = message.room;

            if (userData.rooms.has(roomId)) {
              chatManager.broadcastToRoom(roomId, {
                type: 'typing',
                room: roomId,
                username: userData.username,
                userId: userData.userId,
                isTyping: message.isTyping !== false,
                timestamp: new Date().toISOString(),
              }, rawWs);
            }
            break;
          }

          case 'get_rooms': {
            // Get list of all available rooms
            const allRooms = chatManager.getAllRooms().map(room => ({
              id: room.id,
              name: room.name,
              description: room.description,
              created_at: room.created_at,
              userCount: chatManager.getRoomUserCount(room.id),
            }));

            rawWs.send(JSON.stringify({
              type: 'rooms_list',
              rooms: allRooms,
              timestamp: new Date().toISOString(),
            }));
            break;
          }

          case 'get_room_users': {
            // Get users in a specific room
            const roomId = message.room;
            const roomUsers = chatManager.getRoomUsers(roomId);

            rawWs.send(JSON.stringify({
              type: 'room_users',
              room: roomId,
              users: roomUsers,
              count: roomUsers.length,
              timestamp: new Date().toISOString(),
            }));
            break;
          }

          case 'get_room_messages': {
            // Get message history for a room
            const roomId = message.room;
            const limit = message.limit || 50;
            const offset = message.offset || 0;

            const messages = chatManager.getRoomMessages(roomId, limit, offset);

            rawWs.send(JSON.stringify({
              type: 'room_messages',
              room: roomId,
              messages,
              count: messages.length,
              timestamp: new Date().toISOString(),
            }));
            break;
          }

          case 'ping': {
            // Heartbeat/keepalive
            rawWs.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
            }));
            break;
          }

          default:
            rawWs.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
              receivedType: message.type,
            }));
        }
      }
      catch (error) {
        console.error('❌ Error processing message:', error);
        rawWs.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          error: error instanceof Error ? error.message : 'Unknown error',
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
    message(_ws: ServerWebSocket, _message: string | ArrayBuffer | ArrayBufferView) {
      // Messages are handled in the upgradeWebSocket handler above
      // This is just for Bun's native websocket support compatibility
    },
    open(_ws: ServerWebSocket) {
      // Connection opening is handled in upgradeWebSocket
    },
    close(_ws: ServerWebSocket) {
      // Connection closing is handled in upgradeWebSocket
    },
  },
});

console.warn(`🚀 Server is running on http://localhost:${port}`);
console.warn(`📡 WebSocket Chat endpoint: ws://localhost:${port}/ws`);
console.warn(`📊 Online: ${chatManager.getOnlineUsersCount()} users | ${chatManager.getRoomCount()} rooms`);
console.warn(`🧪 Test room chat at: http://localhost:${port}/ws-room-test`);
console.warn(`🧪 Test native WebSocket at: http://localhost:${port}/ws-native-test`);
console.warn(`🧪 Test simple WebSocket at: http://localhost:${port}/ws-test`);
