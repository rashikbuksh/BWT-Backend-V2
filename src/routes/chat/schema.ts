import { sql } from 'drizzle-orm';
import { boolean, pgEnum, pgSchema, text } from 'drizzle-orm/pg-core';

import { DateTime, defaultUUID, uuid_primary } from '@/lib/variables';

import * as hrSchema from '../hr/schema';

const chat = pgSchema('chat');

export const messageTypeEnum = pgEnum('message_type', ['admin', 'web']);

export const rooms = chat.table('rooms', {
  uuid: uuid_primary,
  name: text('name'),
  user_uuid: defaultUUID('user_uuid').references(() => hrSchema.users.uuid),
  last_message_uuid: defaultUUID('last_message_uuid').default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
});

export const messages = chat.table('messages', {
  uuid: uuid_primary,
  text: text('text').notNull(),
  room_uuid: defaultUUID('room_uuid').references(() => rooms.uuid).notNull(),
  user_uuid: defaultUUID('user_uuid').references(() => hrSchema.users.uuid),
  type: messageTypeEnum('type').notNull().default('web'),
  is_deleted: boolean('is_deleted').notNull().default(false),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
});

export default chat;
