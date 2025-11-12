import type { WebSocket, WebSocketServer } from 'ws';

interface WebSocketUser {
  id: string;
  username: string;
  ws: WebSocket;
  rooms: Set<string>;
}

interface RoomMessage {
  type: string;
  room?: string;
  message?: string;
  username?: string;
  userId?: string;
  timestamp?: string;
}

class WebSocketRoomManager {
  private users = new Map<string, WebSocketUser>();
  private rooms = new Map<string, Set<string>>(); // room -> set of user IDs

  constructor(private wss: WebSocketServer) {
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket) => {
      const userId = this.generateUserId();
      const username = `Guest_${userId.substring(0, 8)}`;

      const user: WebSocketUser = {
        id: userId,
        username,
        ws,
        rooms: new Set(),
      };

      this.users.set(userId, user);
      console.warn(`👋 User connected: ${username} (${userId})`);

      // Send welcome message
      this.sendToUser(userId, {
        type: 'connected',
        userId,
        username,
        message: 'Connected to WebSocket server',
      });

      ws.on('message', (data: Uint8Array) => {
        try {
          const message = JSON.parse(data.toString()) as RoomMessage;
          this.handleMessage(userId, message);
        }
        catch (error) {
          console.error('Error parsing WebSocket message:', error);
          this.sendToUser(userId, {
            type: 'error',
            message: 'Invalid message format',
          });
        }
      });

      ws.on('close', () => {
        console.warn(`👋 User disconnected: ${user.username} (${userId})`);
        this.handleUserDisconnect(userId);
        this.users.delete(userId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
      });
    });
  }

  private handleMessage(userId: string, message: RoomMessage) {
    const user = this.users.get(userId);
    if (!user)
      return;

    console.warn(`📨 Message from ${user.username}:`, message);

    switch (message.type) {
      case 'set_username':
        this.handleSetUsername(userId, message.username || user.username);
        break;

      case 'join_room':
        if (message.room) {
          this.handleJoinRoom(userId, message.room);
        }
        break;

      case 'leave_room':
        if (message.room) {
          this.handleLeaveRoom(userId, message.room);
        }
        break;

      case 'chat_message':
        if (message.room && message.message) {
          this.handleChatMessage(userId, message.room, message.message);
        }
        break;

      case 'get_rooms':
        this.handleGetRooms(userId);
        break;

      case 'get_room_users':
        if (message.room) {
          this.handleGetRoomUsers(userId, message.room);
        }
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  private handleSetUsername(userId: string, newUsername: string) {
    const user = this.users.get(userId);
    if (!user)
      return;

    const oldUsername = user.username;
    user.username = newUsername;

    this.sendToUser(userId, {
      type: 'username_updated',
      username: newUsername,
    });

    // Notify all rooms the user is in about the username change
    user.rooms.forEach((roomName) => {
      this.broadcastToRoom(roomName, {
        type: 'username_changed',
        userId,
        oldUsername,
        newUsername,
        room: roomName,
      }, userId);
    });

    console.warn(`📝 Username updated: ${oldUsername} -> ${newUsername}`);
  }

  private handleJoinRoom(userId: string, roomName: string) {
    const user = this.users.get(userId);
    if (!user)
      return;

    // Add user to room
    if (!this.rooms.has(roomName)) {
      this.rooms.set(roomName, new Set());
    }
    this.rooms.get(roomName)!.add(userId);
    user.rooms.add(roomName);

    // Get room users
    const roomUsers = this.getRoomUsers(roomName);

    // Send confirmation to user
    this.sendToUser(userId, {
      type: 'room_joined',
      room: roomName,
      roomUsers: roomUsers.map(u => ({ userId: u.id, username: u.username })),
    });

    // Notify other users in the room
    this.broadcastToRoom(roomName, {
      type: 'user_joined',
      userId,
      username: user.username,
      room: roomName,
    }, userId);

    console.warn(`🏠 ${user.username} joined room: ${roomName}`);
  }

  private handleLeaveRoom(userId: string, roomName: string) {
    const user = this.users.get(userId);
    if (!user)
      return;

    // Remove user from room
    const room = this.rooms.get(roomName);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomName);
      }
    }
    user.rooms.delete(roomName);

    // Send confirmation to user
    this.sendToUser(userId, {
      type: 'room_left',
      room: roomName,
    });

    // Notify other users in the room
    this.broadcastToRoom(roomName, {
      type: 'user_left',
      userId,
      username: user.username,
      room: roomName,
    }, userId);

    console.warn(`🚪 ${user.username} left room: ${roomName}`);
  }

  private handleChatMessage(userId: string, roomName: string, message: string) {
    const user = this.users.get(userId);
    if (!user || !user.rooms.has(roomName)) {
      this.sendToUser(userId, {
        type: 'error',
        message: 'You are not in this room',
      });
      return;
    }

    const chatMessage = {
      type: 'chat_message',
      room: roomName,
      message,
      userId,
      username: user.username,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all users in the room (including sender for confirmation)
    this.broadcastToRoom(roomName, chatMessage);

    console.warn(`💬 [${roomName}] ${user.username}: ${message}`);
  }

  private handleGetRooms(userId: string) {
    const roomsList = Array.from(this.rooms.entries()).map(([roomName, userIds]) => ({
      name: roomName,
      userCount: userIds.size,
    }));

    this.sendToUser(userId, {
      type: 'rooms_list',
      rooms: roomsList,
    });
  }

  private handleGetRoomUsers(userId: string, roomName: string) {
    const roomUsers = this.getRoomUsers(roomName);

    this.sendToUser(userId, {
      type: 'room_users',
      room: roomName,
      users: roomUsers.map(u => ({ userId: u.id, username: u.username })),
    });
  }

  private handleUserDisconnect(userId: string) {
    const user = this.users.get(userId);
    if (!user)
      return;

    // Remove user from all rooms and notify other users
    user.rooms.forEach((roomName) => {
      const room = this.rooms.get(roomName);
      if (room) {
        room.delete(userId);
        if (room.size === 0) {
          this.rooms.delete(roomName);
        }

        // Notify other users in the room
        this.broadcastToRoom(roomName, {
          type: 'user_left',
          userId,
          username: user.username,
          room: roomName,
        }, userId);
      }
    });
  }

  private getRoomUsers(roomName: string): WebSocketUser[] {
    const room = this.rooms.get(roomName);
    if (!room)
      return [];

    return Array.from(room)
      .map(userId => this.users.get(userId))
      .filter((user): user is WebSocketUser => user !== undefined);
  }

  private sendToUser(userId: string, message: any) {
    const user = this.users.get(userId);
    if (user && user.ws.readyState === 1) { // WebSocket.OPEN = 1
      try {
        user.ws.send(JSON.stringify(message));
      }
      catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
      }
    }
  }

  private broadcastToRoom(roomName: string, message: any, excludeUserId?: string) {
    const room = this.rooms.get(roomName);
    if (!room)
      return;

    room.forEach((userId) => {
      if (userId !== excludeUserId) {
        this.sendToUser(userId, message);
      }
    });
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for external use
  public getStats() {
    return {
      connectedUsers: this.users.size,
      activeRooms: this.rooms.size,
      rooms: Array.from(this.rooms.entries()).map(([name, users]) => ({
        name,
        userCount: users.size,
      })),
    };
  }
}

export { WebSocketRoomManager };
