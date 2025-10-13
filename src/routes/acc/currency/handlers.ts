import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { currency } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(currency).values(value).returning({
    name: currency.currency,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(currency)
    .set(updates)
    .where(eq(currency.uuid, uuid))
    .returning({
      name: currency.currency,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(currency)
    .where(eq(currency.uuid, uuid))
    .returning({
      name: currency.currency,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const currencyPromise = db
    .select({
      uuid: currency.uuid,
      currency: currency.currency,
      currency_name: currency.currency_name,
      conversion_rate: currency.conversion_rate,
      symbol: currency.symbol,
      created_by: currency.created_by,
      created_by_name: createdByUser.name,
      created_at: currency.created_at,
      updated_by: currency.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: currency.updated_at,
      remarks: currency.remarks,
      default: currency.default,
    })
    .from(currency)
    .leftJoin(createdByUser, eq(createdByUser.uuid, currency.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, currency.updated_by))
    .orderBy(desc(currency.created_at));

  const data = await currencyPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const currencyPromise = db
    .select({
      uuid: currency.uuid,
      currency: currency.currency,
      currency_name: currency.currency_name,
      conversion_rate: currency.conversion_rate,
      symbol: currency.symbol,
      created_by: currency.created_by,
      created_by_name: createdByUser.name,
      created_at: currency.created_at,
      updated_by: currency.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: currency.updated_at,
      remarks: currency.remarks,
      default: currency.default,
    })
    .from(currency)
    .leftJoin(createdByUser, eq(createdByUser.uuid, currency.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, currency.updated_by))
    .where(eq(currency.uuid, uuid));

  const [data] = await currencyPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
