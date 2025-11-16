import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import { chatManager } from '@/lib/websocket_chat';

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

// Get all available rooms
export const getRooms: AppRouteHandler<GetRoomsRoute> = async (c: any) => {
  const allRooms = chatManager.getAllRooms();

  const roomList = allRooms.map(room => ({
    id: room.id,
    name: room.name,
    description: room.description,
    created_at: room.created_at,
    created_by: room.created_by,
    user_count: chatManager.getRoomUserCount(room.id),
  }));

  return c.json({
    rooms: roomList,
    total: roomList.length,
    online_users: chatManager.getOnlineUsersCount(),
  }, HSCode.OK);
};

// Create a new room
export const createRoom: AppRouteHandler<CreateRoomRoute> = async (c: any) => {
  const { name, description } = c.req.valid('json');

  // Generate room ID from name (simple approach)
  const roomId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

  if (chatManager.getRoom(roomId)) {
    return c.json({ error: 'Room with this name already exists' }, HSCode.BAD_REQUEST);
  }

  // Get user info from context (if authenticated)
  const user_uuid = c.get('user')?.uuid || 'anonymous';

  const newRoom = chatManager.createRoom(roomId, name, description, user_uuid);

  return c.json({
    id: newRoom.id,
    name: newRoom.name,
    description: newRoom.description,
    created_at: newRoom.created_at,
    created_by: newRoom.created_by,
    message: 'Room created successfully. Connect via WebSocket to join.',
  }, HSCode.CREATED);
};

// Get room details
export const getRoomDetails: AppRouteHandler<GetRoomDetailsRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');

  const room = chatManager.getRoom(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  const roomUsers = chatManager.getRoomUsers(roomId);
  const messageCount = chatManager.getRoomMessages(roomId).length;

  return c.json({
    id: room.id,
    name: room.name,
    description: room.description,
    created_at: room.created_at,
    created_by: room.created_by,
    users: roomUsers,
    user_count: roomUsers.length,
    message_count: messageCount,
  }, HSCode.OK);
};

// Join a room (HTTP API - for reference, actual joining happens via WebSocket)
export const joinRoom: AppRouteHandler<JoinRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');

  const room = chatManager.getRoom(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  return c.json({
    success: true,
    message: `Room exists. Connect via WebSocket and send join_room message to join.`,
    room: {
      id: room.id,
      name: room.name,
      description: room.description,
    },
    websocket_endpoint: '/ws',
    join_message_format: {
      type: 'join_room',
      room: roomId,
    },
  }, HSCode.OK);
};

// Leave a room (HTTP API - for reference, actual leaving happens via WebSocket)
export const leaveRoom: AppRouteHandler<LeaveRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');

  const room = chatManager.getRoom(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  return c.json({
    success: true,
    message: `To leave room, send leave_room message via WebSocket connection.`,
    leave_message_format: {
      type: 'leave_room',
      room: roomId,
    },
  }, HSCode.OK);
};

// Send message to room via HTTP API (alternative to WebSocket)
export const sendMessage: AppRouteHandler<SendMessageRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { user_uuid, username, message } = c.req.valid('json');

  const room = chatManager.getRoom(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  const messageData = {
    id: messageId,
    room_id: roomId,
    message,
    from_user_uuid: user_uuid,
    from_username: username,
    timestamp,
    type: 'text' as const,
  };

  // Store message in history
  chatManager.addMessage(roomId, messageData);

  // Note: This HTTP API won't broadcast via WebSocket in real-time
  // For real-time messaging, use WebSocket connection

  return c.json({
    success: true,
    message_id: messageData.id,
    timestamp: messageData.timestamp,
    note: 'Message stored. For real-time delivery, use WebSocket connection.',
  }, HSCode.OK);
};

// Get room messages
export const getRoomMessages: AppRouteHandler<GetRoomMessagesRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { limit, offset } = c.req.valid('query');

  const room = chatManager.getRoom(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  // Get messages from chat manager
  const limitNum = Number(limit) || 50;
  const offsetNum = Number(offset) || 0;

  const roomMessages = chatManager.getRoomMessages(roomId, limitNum, offsetNum);
  const allMessages = chatManager.getRoomMessages(roomId, 1000); // Get total count

  return c.json({
    room_id: roomId,
    messages: roomMessages.map(msg => ({
      id: msg.id,
      message: msg.message,
      from_user_uuid: msg.from_user_uuid,
      from_username: msg.from_username,
      timestamp: msg.timestamp,
      type: msg.type,
    })),
    count: roomMessages.length,
    total: allMessages.length,
    limit: limitNum,
    offset: offsetNum,
    has_more: offsetNum + roomMessages.length < allMessages.length,
  }, HSCode.OK);
};

// Get online users in a room
export const getRoomUsers: AppRouteHandler<GetRoomUsersRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');

  const room = chatManager.getRoom(roomId);
  if (!room) {
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  }

  const roomUsers = chatManager.getRoomUsers(roomId);

  return c.json({
    room_id: roomId,
    room_name: room.name,
    users: roomUsers.map(user => ({
      userId: user.userId,
      username: user.username,
      user_uuid: user.user_uuid,
      is_online: true, // All users from chatManager are online
    })),
    total_users: roomUsers.length,
    online_users_global: chatManager.getOnlineUsersCount(),
  }, HSCode.OK);
};
