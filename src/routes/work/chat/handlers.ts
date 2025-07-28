import type { AppRouteHandler } from '@/lib/types';

import { asc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
// import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
// import { box, branch, floor, rack, warehouse } from '@/routes/store/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { chat, order } from '../schema';

const chat_user = alias(users, 'chat_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(chat).values(value).returning({
    name: chat.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(chat)
    .set(updates)
    .where(eq(chat.uuid, uuid))
    .returning({
      name: chat.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(chat)
    .where(eq(chat.uuid, uuid))
    .returning({
      name: chat.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { order_uuid } = c.req.valid('query');

  const resultPromise = db.select({
    uuid: chat.uuid,
    id: chat.id,
    chat_id: sql`CONCAT('WD', TO_CHAR(${chat.created_at}, 'YY'), '-', TO_CHAR(${chat.id}, 'FM0000'))`,
    order_uuid: chat.order_uuid,
    order_id: sql`CONCAT('WO', TO_CHAR(${order.created_at}, 'YY'), '-', TO_CHAR(${order.id}, 'FM0000'))`,
    page: chat.page,
    user_uuid: chat.user_uuid,
    user_name: chat_user.name,
    user_phone: chat_user.phone,
    message: chat.message,
    created_by: chat.created_by,
    created_by_name: users.name,
    created_at: chat.created_at,
    updated_at: chat.updated_at,
    remarks: chat.remarks,
  })
    .from(chat)
    .leftJoin(users, eq(chat.created_by, users.uuid))
    .leftJoin(order, eq(chat.order_uuid, order.uuid))
    .leftJoin(chat_user, eq(chat.user_uuid, chat_user.uuid))
    .orderBy(asc(chat.created_at));

  if (order_uuid)
    resultPromise.where(eq(chat.order_uuid, order_uuid));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db
    .select({
      uuid: chat.uuid,
      id: chat.id,
      chat_id: sql`CONCAT('WD', TO_CHAR(${chat.created_at}, 'YY'), '-', TO_CHAR(${chat.id}, 'FM0000'))`,
      order_uuid: chat.order_uuid,
      order_id: sql`CONCAT('WO', TO_CHAR(${order.created_at}, 'YY'), '-', TO_CHAR(${order.id}, 'FM0000'))`,
      page: chat.page,
      user_uuid: chat.user_uuid,
      user_name: chat_user.name,
      user_phone: chat_user.phone,
      message: chat.message,
      created_by: chat.created_by,
      created_by_name: users.name,
      created_at: chat.created_at,
      updated_at: chat.updated_at,
      remarks: chat.remarks,
    })
    .from(chat)
    .leftJoin(users, eq(chat.created_by, users.uuid))
    .leftJoin(order, eq(chat.order_uuid, order.uuid))
    .leftJoin(chat_user, eq(chat.user_uuid, chat_user.uuid))
    .where(eq(chat.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data, HSCode.OK);
};
