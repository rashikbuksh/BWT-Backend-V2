import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import { emitToRoom, getRoomUsers as getSocketRoomUsers } from '@/lib/socket';

import type {
  CreateRoomRoute,
  GetRoomDetailsRoute,
  GetRoomMessagesRoute,
  GetRoomsRoute,
  GetRoomUsersRoute,
  JoinRoomRoute,
  LeaveRoomRoute,
  SendMessageRoute,
} from './routes';

// In-memory storage for testing (replace with database later)
interface Room {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  users: Array<{
    user_uuid: string;
    username: string;
    joined_at: string;
  }>;
}

interface Message {
  id: string;
  room_id: string;
  message: string;
  from_user_uuid: string;
  from_username: string;
  timestamp: string;
}

// In-memory storage (replace with database)
const rooms: Map<string, Room> = new Map();
const messages: Message[] = [];

// Initialize some test rooms
rooms.set('general', {
  id: 'general',
  name: 'General Chat',
  description: 'General discussion room',
  created_at: new Date().toISOString(),
  users: [],
});

rooms.set('development', {
  id: 'development',
  name: 'Development',
  description: 'Development related discussions',
  created_at: new Date().toISOString(),
  users: [],
});

rooms.set('random', {
  id: 'random',
  name: 'Random',
  description: 'Random conversations',
  created_at: new Date().toISOString(),
  users: [],
});

// Get all available rooms
export const getRooms: AppRouteHandler<GetRoomsRoute> = async (c: any) => {
  const roomList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    description: room.description,
    created_at: room.created_at,
    user_count: room.users.length,
  }));

  return c.json({ rooms: roomList }, HSCode.OK);
};

// Create a new room
export const createRoom: AppRouteHandler<CreateRoomRoute> = async (c: any) => {
  const { name, description } = c.req.valid('json');

  // Generate room ID from name (simple approach)
  const roomId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (rooms.has(roomId)) {
    return c.json({ error: 'Room with this name already exists' }, HSCode.BAD_REQUEST);
  }

  const newRoom: Room = {
    id: roomId,
    name,
    description,
    created_at: new Date().toISOString(),
    users: [],
  };

  rooms.set(roomId, newRoom);

  return c.json({
    id: newRoom.id,
    name: newRoom.name,
    description: newRoom.description,
    created_at: newRoom.created_at,
  }, HSCode.CREATED);
};

// Get room details
export const getRoomDetails: AppRouteHandler<GetRoomDetailsRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');

  const room = rooms.get(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  // Get online users from Socket.IO
  const onlineUsers = getSocketRoomUsers(roomId);

  return c.json({
    id: room.id,
    name: room.name,
    description: room.description,
    created_at: room.created_at,
    users: onlineUsers,
  }, HSCode.OK);
};

// Join a room
export const joinRoom: AppRouteHandler<JoinRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { user_uuid, username } = c.req.valid('json');

  const room = rooms.get(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  // Check if user is already in the room
  const existingUser = room.users.find(u => u.user_uuid === user_uuid);
  if (!existingUser) {
    room.users.push({
      user_uuid,
      username,
      joined_at: new Date().toISOString(),
    });
  }

  return c.json({
    success: true,
    message: `Successfully joined room: ${room.name}`,
  }, HSCode.OK);
};

// Leave a room
export const leaveRoom: AppRouteHandler<LeaveRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { user_uuid } = c.req.valid('json');

  const room = rooms.get(roomId);
  if (room) {
    room.users = room.users.filter(u => u.user_uuid !== user_uuid);
  }

  return c.json({
    success: true,
    message: `Successfully left room: ${roomId}`,
  }, HSCode.OK);
};

// Send message to room via API
export const sendMessage: AppRouteHandler<SendMessageRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { user_uuid, username, message } = c.req.valid('json');

  const room = rooms.get(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  const messageData = {
    id: Date.now().toString(),
    room_id: roomId,
    message,
    from_user_uuid: user_uuid,
    from_username: username,
    timestamp: new Date().toISOString(),
  };

  // Store message (in production, save to database)
  messages.push(messageData);

  // Emit to Socket.IO room
  try {
    emitToRoom(roomId, 'new_message', {
      ...messageData,
      room: roomId,
    });
  }
  catch (error) {
    console.warn('Failed to emit to Socket.IO:', error);
  }

  return c.json({
    success: true,
    message_id: messageData.id,
    timestamp: messageData.timestamp,
  }, HSCode.OK);
};

// Get room messages
export const getRoomMessages: AppRouteHandler<GetRoomMessagesRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { limit, offset } = c.req.valid('query');

  const room = rooms.get(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  // Filter messages for this room
  const roomMessages = messages
    .filter(msg => msg.room_id === roomId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .slice(offset, offset + limit);

  const total = messages.filter(msg => msg.room_id === roomId).length;
  const hasMore = offset + limit < total;

  return c.json({
    messages: roomMessages.map(msg => ({
      id: msg.id,
      message: msg.message,
      from_user_uuid: msg.from_user_uuid,
      from_username: msg.from_username,
      timestamp: msg.timestamp,
    })),
    total,
    has_more: hasMore,
  }, HSCode.OK);
};

// Get online users in a room
export const getRoomUsers: AppRouteHandler<GetRoomUsersRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');

  // Get online users from Socket.IO
  const onlineUsers = getSocketRoomUsers(roomId);

  return c.json({
    room_id: roomId,
    users: onlineUsers.map(user => ({
      ...user,
      is_online: true,
    })),
    total_users: onlineUsers.length,
  }, HSCode.OK);
};
