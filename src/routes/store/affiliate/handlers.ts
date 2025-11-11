import type { AppRouteHandler } from '@/lib/types';

import { and, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { affiliate } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');
  // console.log('Affiliate Create Value:', value);

  try {
    const [data] = await db.insert(affiliate).values(value).returning({
      name: affiliate.id,
    });
    return c.json(createToast('create', data.name), HSCode.OK);
  }
  catch (error) {
    console.error('DETAILED DATABASE ERROR:', error); // Log the full error
    // Return a generic error to the client
    return c.json({ message: 'Failed to create affiliate' }, 500);
  }
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { id } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(affiliate)
    .set(updates)
    .where(eq(affiliate.id, id))
    .returning({
      name: affiliate.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const [data] = await db.delete(affiliate)
    .where(eq(affiliate.id, id))
    .returning({
      name: affiliate.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { user_uuid, product_uuid } = c.req.valid('query');
  const affiliatePromise = db.select({
    id: affiliate.id,
    user_uuid: affiliate.user_uuid,
    product_uuid: affiliate.product_uuid,
    visited: PG_DECIMAL_TO_FLOAT(affiliate.visited),
    purchased: PG_DECIMAL_TO_FLOAT(affiliate.purchased),
    created_at: affiliate.created_at,
    updated_at: affiliate.updated_at,
    commission_rate: PG_DECIMAL_TO_FLOAT(affiliate.commission_rate),
    unit_type: affiliate.unit_type,
  })
    .from(affiliate)
    .leftJoin(users, eq(affiliate.user_uuid, users.uuid));

  const filters = [];

  if (user_uuid) {
    filters.push(eq(affiliate.user_uuid, user_uuid));
  }
  if (product_uuid) {
    filters.push(eq(affiliate.product_uuid, product_uuid));
  }

  if (filters.length > 0) {
    affiliatePromise.where(and(...filters));
  }

  const data = await affiliatePromise;

  return c.json(user_uuid && product_uuid ? [data] : data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const affiliatePromise = db.select({
    id: affiliate.id,
    user_uuid: affiliate.user_uuid,
    product_uuid: affiliate.product_uuid,
    visited: PG_DECIMAL_TO_FLOAT(affiliate.visited),
    purchased: PG_DECIMAL_TO_FLOAT(affiliate.purchased),
    created_at: affiliate.created_at,
    updated_at: affiliate.updated_at,
    commission_rate: PG_DECIMAL_TO_FLOAT(affiliate.commission_rate),
    unit_type: affiliate.unit_type,
  })
    .from(affiliate)
    .leftJoin(users, eq(affiliate.user_uuid, users.uuid))
    .where(eq(affiliate.id, id));

  const [data] = await affiliatePromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
