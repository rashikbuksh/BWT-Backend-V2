import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['Socket'];

// Get socket statistics
export const getSocketStats = createRoute({
  path: '/stats',
  method: 'get',
  summary: 'Get socket connection statistics',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        connected_clients: z.number(),
        authenticated_users: z.number(),
        rooms_count: z.number(),
      }),
      'Socket statistics',
    ),
    [HSCode.SERVICE_UNAVAILABLE]: jsonContent(
      z.object({
        error: z.string(),
      }),
      'Socket.IO not available',
    ),
  },
});

// Get users in a room
export const getRoomUsers = createRoute({
  path: '/room/{room}/users',
  method: 'get',
  summary: 'Get users in a specific room',
  tags,
  request: {
    params: z.object({
      room: z.string().openapi({ example: 'order_123' }),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        room: z.string(),
        users: z.array(z.object({
          user_uuid: z.string(),
          username: z.string(),
          socket_id: z.string(),
        })),
      }),
      'Room users',
    ),
  },
});

// Check online status of users
export const getOnlineUsers = createRoute({
  path: '/users/online',
  method: 'post',
  summary: 'Check online status of specific users',
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        user_ids: z.array(z.string()).openapi({ example: ['user_1', 'user_2'] }),
      }),
      'User IDs to check',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        users: z.array(z.object({
          user_id: z.string(),
          is_online: z.boolean(),
        })),
      }),
      'Online status of users',
    ),
  },
});

// Send notification
export const sendNotification = createRoute({
  path: '/notification',
  method: 'post',
  summary: 'Send notification to user or room',
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        target_type: z.enum(['user', 'room']).openapi({ example: 'user' }),
        target_id: z.string().openapi({ example: 'user_123' }),
        event: z.string().openapi({ example: 'new_message' }),
        data: z.record(z.unknown()).openapi({ example: { message: 'Hello!' } }),
      }),
      'Notification data',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        event: z.string(),
        data: z.record(z.unknown()),
      }),
      'Notification sent',
    ),
    [HSCode.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
      }),
      'Invalid request',
    ),
  },
});

export type GetSocketStatsRoute = typeof getSocketStats;
export type GetRoomUsersRoute = typeof getRoomUsers;
export type GetOnlineUsersRoute = typeof getOnlineUsers;
export type SendNotificationRoute = typeof sendNotification;
