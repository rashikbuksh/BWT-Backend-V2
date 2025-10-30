import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['chat'];

// Get all available rooms
export const getRooms = createRoute({
  path: '/chat/rooms',
  method: 'get',
  tags,
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
      search: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        rooms: z.array(z.object({
          uuid: z.string(),
          name: z.string(),
          user_uuid: z.string().nullable().optional(),
          last_message_uuid: z.string().nullable().optional(),
          created_at: z.string(),
          updated_at: z.string().nullable().optional(),
        })),
        total: z.number().optional(),
      }),
      'List of chat rooms',
    ),
  },
});

// Create a new room
export const createRoom = createRoute({
  path: '/chat/rooms',
  method: 'post',
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        uuid: z.string().optional(),
        name: z.string().min(1).max(50),
        user_uuid: z.string().optional(),
      }),
      'Room creation data',
    ),
  },
  responses: {
    [HSCode.CREATED]: jsonContent(
      z.object({
        uuid: z.string(),
        name: z.string(),
        user_uuid: z.string().nullable().optional(),
        last_message_uuid: z.string().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string().nullable().optional(),
      }),
      'Created room',
    ),
    [HSCode.BAD_REQUEST]: jsonContent(
      createErrorSchema(z.object({
        name: z.string().min(1).max(50),
        user_uuid: z.string().optional(),
      })),
      'Invalid room data',
    ),
  },
});

// Get room details
export const getRoomDetails = createRoute({
  path: '/chat/rooms/{roomId}',
  method: 'get',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        uuid: z.string(),
        name: z.string().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string().nullable().optional(),
        user_uuid: z.string().nullable().optional(),
        user_name: z.string().nullable().optional(),
        last_message_uuid: z.string().nullable().optional(),
      }),
      'Room details',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ roomId: z.string() })),
      'Room not found',
    ),
  },
});

export const updateRoom = createRoute({
  path: '/chat/rooms/{roomId}',
  method: 'patch',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        name: z.string().min(1).max(50).optional(),
      }),
      'Room update data',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        uuid: z.string(),
        name: z.string(),
        user_uuid: z.string().nullable().optional(),
        last_message_uuid: z.string().nullable().optional(),
        created_at: z.string(),
        updated_at: z.string().nullable().optional(),
      }),
      'Updated room',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ roomId: z.string() })),
      'Room not found',
    ),
  },
});

export const deleteRoom = createRoute({
  path: '/chat/rooms/{roomId}',
  method: 'delete',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({ success: z.boolean() }),
      'Room deleted',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ roomId: z.string() })),
      'Room not found',
    ),
  },
});

// Join a room
export const joinRoom = createRoute({
  path: '/chat/rooms/{roomId}/join',
  method: 'post',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        user_uuid: z.string(),
        username: z.string(),
      }),
      'User data for joining room',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      'Join room result',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ roomId: z.string() })),
      'Room not found',
    ),
  },
});

// Leave a room
export const leaveRoom = createRoute({
  path: '/chat/rooms/{roomId}/leave',
  method: 'post',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        user_uuid: z.string(),
      }),
      'User data for leaving room',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      'Leave room result',
    ),
  },
});

// Send message to room via API
export const sendMessage = createRoute({
  path: '/chat/rooms/{roomId}/messages',
  method: 'post',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        user_uuid: z.string(),
        text: z.string().min(1).max(1000),
        type: z.enum(['admin', 'web']).default('web'),
      }),
      'Message data',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message_uuid: z.string(),
        created_at: z.string(),
      }),
      'Message sent successfully',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ roomId: z.string() })),
      'Room not found',
    ),
  },
});

// Get room messages (for initial load)
export const getRoomMessages = createRoute({
  path: '/chat/rooms/{roomId}/messages',
  method: 'get',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
      include_deleted: z.coerce.boolean().default(false),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        messages: z.array(z.object({
          uuid: z.string(),
          text: z.string(),
          room_uuid: z.string(),
          user_uuid: z.string(),
          type: z.enum(['admin', 'web']),
          is_deleted: z.boolean(),
          created_at: z.string(),
          updated_at: z.string().nullable().optional(),
        })),
        total: z.number(),
        has_more: z.boolean(),
      }),
      'Room messages',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ roomId: z.string() })),
      'Room not found',
    ),
  },
});

// Get online users in a room
export const getRoomUsers = createRoute({
  path: '/chat/rooms/{roomId}/users',
  method: 'get',
  tags,
  request: {
    params: z.object({
      roomId: z.string(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        room_id: z.string(),
        users: z.array(z.object({
          user_uuid: z.string(),
          username: z.string(),
          socket_id: z.string(),
          is_online: z.boolean(),
        })),
        total_users: z.number(),
      }),
      'Room users',
    ),
  },
});

export const updateMessage = createRoute({
  path: '/chat/messages/{messageId}',
  method: 'patch',
  tags,
  request: {
    params: z.object({
      messageId: z.string(),
    }),
    body: jsonContentRequired(
      z.object({
        text: z.string().min(1).max(1000),
      }),
      'Message update data',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        uuid: z.string(),
        text: z.string(),
        room_uuid: z.string(),
        user_uuid: z.string(),
        type: z.enum(['admin', 'web']),
        is_deleted: z.boolean(),
        created_at: z.string(),
        updated_at: z.string().nullable().optional(),
      }),
      'Updated message',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ messageId: z.string() })),
      'Message not found',
    ),
  },
});

export const deleteMessage = createRoute({
  path: '/chat/messages/{messageId}',
  method: 'delete',
  tags,
  request: {
    params: z.object({
      messageId: z.string(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({ success: z.boolean() }),
      'Message soft-deleted',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      createErrorSchema(z.object({ messageId: z.string() })),
      'Message not found',
    ),
  },
});

export type GetRoomsRoute = typeof getRooms;
export type CreateRoomRoute = typeof createRoom;
export type GetRoomDetailsRoute = typeof getRoomDetails;
export type UpdateRoomRoute = typeof updateRoom;
export type DeleteRoomRoute = typeof deleteRoom;
export type JoinRoomRoute = typeof joinRoom;
export type LeaveRoomRoute = typeof leaveRoom;
export type SendMessageRoute = typeof sendMessage;
export type GetRoomMessagesRoute = typeof getRoomMessages;
export type GetRoomUsersRoute = typeof getRoomUsers;
export type UpdateMessageRoute = typeof updateMessage;
export type DeleteMessageRoute = typeof deleteMessage;
