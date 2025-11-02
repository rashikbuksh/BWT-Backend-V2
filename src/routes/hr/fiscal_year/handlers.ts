import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { fiscal_year, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');
export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(fiscal_year).values(value).returning({
    name: fiscal_year.year,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(fiscal_year)
    .set(updates)
    .where(eq(fiscal_year.uuid, uuid))
    .returning({
      name: fiscal_year.year,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(fiscal_year)
    .where(eq(fiscal_year.uuid, uuid))
    .returning({
      name: fiscal_year.year,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const fiscalYearPromise = db
    .select({
      uuid: fiscal_year.uuid,
      year: fiscal_year.year,
      from_month: fiscal_year.from_month,
      to_month: fiscal_year.to_month,
      challan_info: fiscal_year.challan_info,
      created_by: fiscal_year.created_by,
      created_by_name: createdByUser.name,
      created_at: fiscal_year.created_at,
      updated_by: fiscal_year.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: fiscal_year.updated_at,
      remarks: fiscal_year.remarks,
    })
    .from(fiscal_year)
    .leftJoin(createdByUser, eq(fiscal_year.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(fiscal_year.updated_by, updatedByUser.uuid))
    .orderBy(desc(fiscal_year.created_at));

  const data = await fiscalYearPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const fiscalYearPromise = db
    .select({
      uuid: fiscal_year.uuid,
      year: fiscal_year.year,
      from_month: fiscal_year.from_month,
      to_month: fiscal_year.to_month,
      challan_info: fiscal_year.challan_info,
      created_by: fiscal_year.created_by,
      created_by_name: createdByUser.name,
      created_at: fiscal_year.created_at,
      updated_by: fiscal_year.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: fiscal_year.updated_at,
      remarks: fiscal_year.remarks,
    })
    .from(fiscal_year)
    .leftJoin(createdByUser, eq(fiscal_year.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(fiscal_year.updated_by, updatedByUser.uuid))
    .where(eq(fiscal_year.uuid, uuid));

  const [data] = await fiscalYearPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
