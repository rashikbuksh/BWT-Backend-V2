import type { ServerWebSocket } from 'bun';

// Types for WebSocket chat
export interface ChatUserData {
  userId: string;
  username: string;
  user_uuid?: string; // For authenticated users
  rooms: Set<string>;
  connectedAt: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by?: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  message: string;
  from_user_uuid: string;
  from_username: string;
  timestamp: string;
  type?: 'text' | 'system' | 'notification';
}

// Global state management
export class WebSocketChatManager {
  private connectedUsers = new Map<ServerWebSocket, ChatUserData>();
  private rooms = new Map<string, ChatRoom>();
  private messageHistory = new Map<string, ChatMessage[]>(); // room_id -> messages

  constructor() {
    // Initialize default rooms
    this.createRoom('general', 'General Chat', 'General discussion room');
    this.createRoom('development', 'Development', 'Development related discussions');
    this.createRoom('random', 'Random', 'Random conversations');
  }

  // User management
  addUser(ws: ServerWebSocket, userId: string, username: string): ChatUserData {
    const userData: ChatUserData = {
      userId,
      username,
      rooms: new Set(),
      connectedAt: new Date().toISOString(),
    };
    this.connectedUsers.set(ws, userData);
    return userData;
  }

  getUser(ws: ServerWebSocket): ChatUserData | undefined {
    return this.connectedUsers.get(ws);
  }

  removeUser(ws: ServerWebSocket): ChatUserData | undefined {
    const userData = this.connectedUsers.get(ws);
    if (userData) {
      this.connectedUsers.delete(ws);
    }
    return userData;
  }

  updateUsername(ws: ServerWebSocket, username: string): boolean {
    const userData = this.connectedUsers.get(ws);
    if (userData) {
      userData.username = username;
      return true;
    }
    return false;
  }

  setUserUuid(ws: ServerWebSocket, user_uuid: string): boolean {
    const userData = this.connectedUsers.get(ws);
    if (userData) {
      userData.user_uuid = user_uuid;
      return true;
    }
    return false;
  }

  // Room management
  createRoom(roomId: string, name: string, description?: string, created_by?: string): ChatRoom {
    const room: ChatRoom = {
      id: roomId,
      name,
      description,
      created_at: new Date().toISOString(),
      created_by,
    };
    this.rooms.set(roomId, room);
    this.messageHistory.set(roomId, []);
    return room;
  }

  getRoom(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  getAllRooms(): ChatRoom[] {
    return Array.from(this.rooms.values());
  }

  deleteRoom(roomId: string): boolean {
    // Don't delete default rooms
    if (['general', 'development', 'random'].includes(roomId)) {
      return false;
    }

    // Remove all users from the room first
    this.connectedUsers.forEach((userData) => {
      userData.rooms.delete(roomId);
    });

    this.messageHistory.delete(roomId);
    return this.rooms.delete(roomId);
  }

  // User-Room operations
  joinRoom(ws: ServerWebSocket, roomId: string): { success: boolean; room?: ChatRoom; error?: string } {
    const userData = this.connectedUsers.get(ws);
    const room = this.rooms.get(roomId);

    if (!userData) {
      return { success: false, error: 'User not found' };
    }

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    userData.rooms.add(roomId);
    ws.subscribe(roomId);

    return { success: true, room };
  }

  leaveRoom(ws: ServerWebSocket, roomId: string): { success: boolean; room?: ChatRoom; error?: string } {
    const userData = this.connectedUsers.get(ws);
    const room = this.rooms.get(roomId);

    if (!userData) {
      return { success: false, error: 'User not found' };
    }

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    userData.rooms.delete(roomId);
    ws.unsubscribe(roomId);

    return { success: true, room };
  }

  getRoomUsers(roomId: string): Array<{ userId: string; username: string; user_uuid?: string }> {
    const users: Array<{ userId: string; username: string; user_uuid?: string }> = [];
    this.connectedUsers.forEach((userData) => {
      if (userData.rooms.has(roomId)) {
        users.push({
          userId: userData.userId,
          username: userData.username,
          user_uuid: userData.user_uuid,
        });
      }
    });
    return users;
  }

  getUserRooms(ws: ServerWebSocket): string[] {
    const userData = this.connectedUsers.get(ws);
    return userData ? Array.from(userData.rooms) : [];
  }

  // Message operations
  addMessage(roomId: string, message: ChatMessage): void {
    const history = this.messageHistory.get(roomId);
    if (history) {
      history.push(message);

      // Keep only last 100 messages per room
      if (history.length > 100) {
        history.shift();
      }
    }
  }

  getRoomMessages(roomId: string, limit = 50, offset = 0): ChatMessage[] {
    const history = this.messageHistory.get(roomId) || [];
    return history.slice(Math.max(0, history.length - offset - limit), history.length - offset);
  }

  // Broadcasting
  broadcastToRoom(roomId: string, message: any, excludeWs?: ServerWebSocket): void {
    const messageStr = JSON.stringify(message);
    this.connectedUsers.forEach((userData, ws) => {
      if (userData.rooms.has(roomId) && ws !== excludeWs) {
        ws.send(messageStr);
      }
    });
  }

  // Get all connected users
  getAllConnectedUsers(): Map<ServerWebSocket, ChatUserData> {
    return this.connectedUsers;
  }

  // Statistics
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getRoomUserCount(roomId: string): number {
    return this.getRoomUsers(roomId).length;
  }
}

// Singleton instance
export const chatManager = new WebSocketChatManager();
