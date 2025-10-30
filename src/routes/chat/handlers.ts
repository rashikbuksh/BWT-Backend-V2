import type { AppRouteHandler } from '@/lib/types';

import { and, asc, desc, eq, ilike, ne, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { emitToRoom, getRoomUsers as getSocketRoomUsers } from '@/lib/socket';

import type {
  CreateRoomRoute,
  DeleteMessageRoute,
  DeleteRoomRoute,
  GetRoomDetailsRoute,
  GetRoomMessagesRoute,
  GetRoomsRoute,
  GetRoomUsersRoute,
  JoinRoomRoute,
  LeaveRoomRoute,
  SendMessageRoute,
  UpdateMessageRoute,
  UpdateRoomRoute,
} from './routes';

import * as hrSchema from '../hr/schema';
import * as chatSchema from './schema';

// List rooms
export const getRooms: AppRouteHandler<GetRoomsRoute> = async (c: any) => {
  const { limit, offset, search } = c.req.valid('query');

  const base = db.select().from(chatSchema.rooms);

  const where = search ? base.where(ilike(chatSchema.rooms.name, `%${search}%`)) : base;

  const data = await where.orderBy(desc(chatSchema.rooms.created_at)).limit(limit).offset(offset);

  const pattern = search ? `%${search}%` : null;
  const countRes = await db.execute(sql`SELECT COUNT(*)::int AS count FROM chat.rooms ${search ? sql`WHERE name ILIKE ${pattern}` : sql``}`);
  const total = (countRes.rows?.[0]?.count as number) ?? 0;
  const has_more = offset + limit < total;

  return c.json({ rooms: data, total, has_more }, HSCode.OK);
};

// Create room
export const createRoom: AppRouteHandler<CreateRoomRoute> = async (c: any) => {
  const { uuid, user_uuid } = c.req.valid('json');

  // If user_uuid provided, fetch user's name from HR and use it as room name
  let roomName = null;
  if (user_uuid) {
    const [userRow] = await db
      .select({ username: hrSchema.users.name })
      .from(hrSchema.users)
      .where(eq(hrSchema.users.uuid, user_uuid))
      .limit(1);
    roomName = userRow?.username;
  }
  else if (!roomName) {
    roomName = nanoid();
  }

  const now = new Date().toISOString();
  const [row] = await db.insert(chatSchema.rooms).values({
    uuid, // let db default generator or external logic handle if any
    name: roomName,
    user_uuid: user_uuid ?? null as any,
    last_message_uuid: null as any,
    created_at: now,
    updated_at: null as any,
  }).returning();

  return c.json(row, HSCode.CREATED);
};

// Get room details
export const getRoomDetails: AppRouteHandler<GetRoomDetailsRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const [room] = await db
    .select({
      uuid: chatSchema.rooms.uuid,
      name: chatSchema.rooms.name,
      created_at: chatSchema.rooms.created_at,
      updated_at: chatSchema.rooms.updated_at,
      user_uuid: chatSchema.rooms.user_uuid,
      last_message_uuid: chatSchema.rooms.last_message_uuid,
      user_name: hrSchema.users.name,
    })
    .from(chatSchema.rooms)
    .leftJoin(hrSchema.users, eq(hrSchema.users.uuid, chatSchema.rooms.user_uuid))
    .where(eq(chatSchema.rooms.uuid, roomId))
    .limit(1);
  if (!room)
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  return c.json(room, HSCode.OK);
};

// Update a room
export const updateRoom: AppRouteHandler<UpdateRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { name } = c.req.valid('json');

  const [updated] = await db.update(chatSchema.rooms)
    .set({ name, updated_at: new Date().toISOString() })
    .where(eq(chatSchema.rooms.uuid, roomId))
    .returning();
  if (!updated)
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  return c.json(updated, HSCode.OK);
};

// Delete a room (hard delete)
export const deleteRoom: AppRouteHandler<DeleteRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const res = await db.delete(chatSchema.rooms).where(eq(chatSchema.rooms.uuid, roomId));
  if ((res as any).rowCount === 0)
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  return c.json({ success: true }, HSCode.OK);
};

// Join a room (socket presence only)
export const joinRoom: AppRouteHandler<JoinRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { user_uuid: _user_uuid } = c.req.valid('json');

  const [room] = await db.select({ uuid: chatSchema.rooms.uuid }).from(chatSchema.rooms).where(eq(chatSchema.rooms.uuid, roomId)).limit(1);
  if (!room)
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);
  return c.json({ success: true, message: `Successfully joined room: ${roomId}` }, HSCode.OK);
};

// Leave a room (socket presence only)
export const leaveRoom: AppRouteHandler<LeaveRoomRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { user_uuid: _user_uuid } = c.req.valid('json');
  return c.json({ success: true, message: `Successfully left room: ${roomId}` }, HSCode.OK);
};

// Send message
export const sendMessage: AppRouteHandler<SendMessageRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { user_uuid, text, type } = c.req.valid('json');

  const [room] = await db.select({ uuid: chatSchema.rooms.uuid }).from(chatSchema.rooms).where(eq(chatSchema.rooms.uuid, roomId)).limit(1);
  if (!room)
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);

  // Lookup user's name from HR using user_uuid
  const [userRow] = await db
    .select({ username: hrSchema.users.name })
    .from(hrSchema.users)
    .where(eq(hrSchema.users.uuid, user_uuid))
    .limit(1);

  const now = new Date().toISOString();
  const [msg] = await db.insert(chatSchema.messages).values({
    uuid: undefined as unknown as string,
    text,
    room_uuid: roomId,
    user_uuid,
    type,
    is_deleted: false,
    created_at: now,
    updated_at: null as any,
  }).returning();

  await db.update(chatSchema.rooms)
    .set({ last_message_uuid: msg.uuid, updated_at: now })
    .where(eq(chatSchema.rooms.uuid, roomId));

  try {
    emitToRoom(roomId, 'new_message', { ...msg, from_username: userRow?.username ?? null });
  }
  catch {}

  return c.json({ success: true, message_uuid: msg.uuid, created_at: msg.created_at }, HSCode.OK);
};

// Get room messages
export const getRoomMessages: AppRouteHandler<GetRoomMessagesRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const { limit, offset, include_deleted } = c.req.valid('query');

  const [room] = await db.select({ uuid: chatSchema.rooms.uuid }).from(chatSchema.rooms).where(eq(chatSchema.rooms.uuid, roomId)).limit(1);
  if (!room)
    return c.json({ error: 'Room not found' }, HSCode.NOT_FOUND);

  const whereClause = include_deleted
    ? eq(chatSchema.messages.room_uuid, roomId)
    : and(eq(chatSchema.messages.room_uuid, roomId), eq(chatSchema.messages.is_deleted, false));

  const data = await db.select().from(chatSchema.messages).where(whereClause).orderBy(asc(chatSchema.messages.created_at)).limit(limit).offset(offset);

  const countRes = await db.execute(sql`SELECT COUNT(*)::int AS count FROM chat.messages WHERE room_uuid = ${roomId} ${include_deleted ? sql`` : sql`AND is_deleted = false`}`);
  const total = (countRes.rows?.[0]?.count as number) ?? 0;
  const has_more = offset + limit < total;

  return c.json({ messages: data, total, has_more }, HSCode.OK);
};

// Get online users in a room
export const getRoomUsers: AppRouteHandler<GetRoomUsersRoute> = async (c: any) => {
  const { roomId } = c.req.valid('param');
  const onlineUsers = getSocketRoomUsers(roomId);
  return c.json({
    room_id: roomId,
    users: onlineUsers.map(user => ({ ...user, is_online: true })),
    total_users: onlineUsers.length,
  }, HSCode.OK);
};

// Update a message
export const updateMessage: AppRouteHandler<UpdateMessageRoute> = async (c: any) => {
  const { messageId } = c.req.valid('param');
  const { text } = c.req.valid('json');

  const [updated] = await db.update(chatSchema.messages)
    .set({ text, updated_at: new Date().toISOString() })
    .where(eq(chatSchema.messages.uuid, messageId))
    .returning();
  if (!updated)
    return c.json({ error: 'Message not found' }, HSCode.NOT_FOUND);
  return c.json(updated, HSCode.OK);
};

// Soft delete a message
export const deleteMessage: AppRouteHandler<DeleteMessageRoute> = async (c: any) => {
  const { messageId } = c.req.valid('param');

  const [found] = await db.select().from(chatSchema.messages).where(eq(chatSchema.messages.uuid, messageId)).limit(1);
  if (!found)
    return c.json({ error: 'Message not found' }, HSCode.NOT_FOUND);

  await db.update(chatSchema.messages)
    .set({ is_deleted: true, updated_at: new Date().toISOString() })
    .where(eq(chatSchema.messages.uuid, messageId));

  // If it was the last message of the room, update room.last_message_uuid to previous non-deleted
  const [room] = await db.select().from(chatSchema.rooms).where(eq(chatSchema.rooms.uuid, found.room_uuid)).limit(1);
  if (room && room.last_message_uuid === messageId) {
    const [prevMsg] = await db.select().from(chatSchema.messages).where(and(eq(chatSchema.messages.room_uuid, found.room_uuid), eq(chatSchema.messages.is_deleted, false), ne(chatSchema.messages.uuid, messageId))).orderBy(desc(chatSchema.messages.created_at)).limit(1);
    await db.update(chatSchema.rooms)
      .set({ last_message_uuid: prevMsg ? prevMsg.uuid : (null as any), updated_at: new Date().toISOString() })
      .where(eq(chatSchema.rooms.uuid, found.room_uuid));
  }

  return c.json({ success: true }, HSCode.OK);
};
