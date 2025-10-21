import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import { emitToRoom, emitToUser, getIO, getOnlineUsersCount, getRoomUsers as getSocketRoomUsers, isUserOnline } from '@/lib/socket';

import type { GetOnlineUsersRoute, GetRoomUsersRoute, GetSocketStatsRoute, SendNotificationRoute } from './routes';

// Get online users count and status
export const getSocketStats: AppRouteHandler<GetSocketStatsRoute> = async (c: any) => {
  try {
    const io = getIO();
    const connectedClients = io.engine.clientsCount;
    const authenticatedUsers = getOnlineUsersCount();

    return c.json({
      connected_clients: connectedClients,
      authenticated_users: authenticatedUsers,
      rooms_count: io.sockets.adapter.rooms.size,
    }, HSCode.OK);
  }
  catch {
    return c.json({ error: 'Socket.IO not initialized' }, HSCode.SERVICE_UNAVAILABLE);
  }
};

// Get users in a specific room
export const getRoomUsersHandler: AppRouteHandler<GetRoomUsersRoute> = async (c: any) => {
  const { room } = c.req.valid('param');

  try {
    const users = getSocketRoomUsers(room);
    return c.json({ room, users }, HSCode.OK);
  }
  catch {
    return c.json({ error: 'Failed to get room users' }, HSCode.INTERNAL_SERVER_ERROR);
  }
};

// Check if specific users are online
export const getOnlineUsers: AppRouteHandler<GetOnlineUsersRoute> = async (c: any) => {
  const { user_ids } = c.req.valid('json');

  try {
    const onlineStatus = user_ids.map((userId: string) => ({
      user_id: userId,
      is_online: isUserOnline(userId),
    }));

    return c.json({ users: onlineStatus }, HSCode.OK);
  }
  catch {
    return c.json({ error: 'Failed to check online status' }, HSCode.INTERNAL_SERVER_ERROR);
  }
};

// Send notification to specific user or room
export const sendNotification: AppRouteHandler<SendNotificationRoute> = async (c: any) => {
  const { target_type, target_id, event, data } = c.req.valid('json');

  try {
    if (target_type === 'user') {
      emitToUser(target_id, event, data);
    }
    else if (target_type === 'room') {
      emitToRoom(target_id, event, data);
    }
    else {
      return c.json({ error: 'Invalid target_type. Use "user" or "room"' }, HSCode.BAD_REQUEST);
    }

    return c.json({
      message: `Notification sent to ${target_type}: ${target_id}`,
      event,
      data,
    }, HSCode.OK);
  }
  catch {
    return c.json({ error: 'Failed to send notification' }, HSCode.INTERNAL_SERVER_ERROR);
  }
};
