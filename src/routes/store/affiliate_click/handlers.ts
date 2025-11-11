import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { affiliate_click } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');
  // console.log('Affiliate Click Create Value:', value);

  const [data] = await db.insert(affiliate_click).values(value).returning({
    name: affiliate_click.id,
  });
  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { id } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(affiliate_click)
    .set(updates)
    .where(eq(affiliate_click.id, id))
    .returning({
      name: affiliate_click.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const [data] = await db.delete(affiliate_click)
    .where(eq(affiliate_click.id, id))
    .returning({
      name: affiliate_click.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const affiliatePromise = db.select({
    id: affiliate_click.id,
    affiliate_id: affiliate_click.affiliate_id,
    ip_address: affiliate_click.ip_address,
    created_at: affiliate_click.created_at,
  })
    .from(affiliate_click);

  const data = await affiliatePromise;

  return c.json (data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const affiliatePromise = db.select({
    id: affiliate_click.id,
    affiliate_id: affiliate_click.affiliate_id,
    ip_address: affiliate_click.ip_address,
    created_at: affiliate_click.created_at,
  })
    .from(affiliate_click)
    .where(eq(affiliate_click.id, id));

  const [data] = await affiliatePromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
