import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { fiscal_year } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(fiscal_year).values(value).returning({
    name: fiscal_year.uuid,
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
      name: fiscal_year.uuid,
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
      name: fiscal_year.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const fiscal_yearPromise = db
    .select({
      uuid: fiscal_year.uuid,
      year_no: fiscal_year.year_no,
      start_date: fiscal_year.start_date,
      end_date: fiscal_year.end_date,
      active: fiscal_year.active,
      locked: fiscal_year.locked,
      jan_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.jan_budget),
      feb_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.feb_budget),
      mar_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.mar_budget),
      apr_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.apr_budget),
      may_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.may_budget),
      jun_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.jun_budget),
      jul_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.jul_budget),
      aug_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.aug_budget),
      sep_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.sep_budget),
      oct_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.oct_budget),
      nov_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.nov_budget),
      dec_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.dec_budget),
      created_by: fiscal_year.created_by,
      created_by_name: createdByUser.name,
      created_at: fiscal_year.created_at,
      updated_by: fiscal_year.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: fiscal_year.updated_at,
      remarks: fiscal_year.remarks,
      currency_uuid: fiscal_year.currency_uuid,
      rate: PG_DECIMAL_TO_FLOAT(fiscal_year.rate),
    })
    .from(fiscal_year)
    .leftJoin(createdByUser, eq(createdByUser.uuid, fiscal_year.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, fiscal_year.updated_by))
    .orderBy(desc(fiscal_year.created_at));

  const data = await fiscal_yearPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const fiscal_yearPromise = db
    .select({
      uuid: fiscal_year.uuid,
      year_no: fiscal_year.year_no,
      start_date: fiscal_year.start_date,
      end_date: fiscal_year.end_date,
      active: fiscal_year.active,
      locked: fiscal_year.locked,
      jan_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.jan_budget),
      feb_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.feb_budget),
      mar_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.mar_budget),
      apr_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.apr_budget),
      may_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.may_budget),
      jun_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.jun_budget),
      jul_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.jul_budget),
      aug_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.aug_budget),
      sep_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.sep_budget),
      oct_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.oct_budget),
      nov_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.nov_budget),
      dec_budget: PG_DECIMAL_TO_FLOAT(fiscal_year.dec_budget),
      created_by: fiscal_year.created_by,
      created_by_name: createdByUser.name,
      created_at: fiscal_year.created_at,
      updated_by: fiscal_year.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: fiscal_year.updated_at,
      remarks: fiscal_year.remarks,
      currency_uuid: fiscal_year.currency_uuid,
      rate: PG_DECIMAL_TO_FLOAT(fiscal_year.rate),
    })
    .from(fiscal_year)
    .leftJoin(createdByUser, eq(createdByUser.uuid, fiscal_year.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, fiscal_year.updated_by))
    .where(eq(fiscal_year.uuid, uuid));

  const [data] = await fiscal_yearPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
