import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { cost_center, ledger } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(cost_center).values(value).returning({
    name: cost_center.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(cost_center)
    .set(updates)
    .where(eq(cost_center.uuid, uuid))
    .returning({
      name: cost_center.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(cost_center)
    .where(eq(cost_center.uuid, uuid))
    .returning({
      name: cost_center.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const cost_centerPromise = db
    .select({
      uuid: cost_center.uuid,
      name: cost_center.name,
      ledger_uuid: cost_center.ledger_uuid,
      ledger_name: ledger.name,
      table_name: cost_center.table_name,
      table_uuid: cost_center.table_uuid,
      invoice_no: cost_center.invoice_no,
      created_by: cost_center.created_by,
      created_by_name: createdByUser.name,
      created_at: cost_center.created_at,
      updated_by: cost_center.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: cost_center.updated_at,
      remarks: cost_center.remarks,
    })
    .from(cost_center)
    .leftJoin(ledger, eq(ledger.uuid, cost_center.ledger_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, cost_center.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, cost_center.updated_by))
    .orderBy(desc(cost_center.created_at));

  const data = await cost_centerPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const cost_centerPromise = db
    .select({
      uuid: cost_center.uuid,
      name: cost_center.name,
      ledger_uuid: cost_center.ledger_uuid,
      ledger_name: ledger.name,
      table_name: cost_center.table_name,
      table_uuid: cost_center.table_uuid,
      invoice_no: cost_center.invoice_no,
      created_by: cost_center.created_by,
      created_by_name: createdByUser.name,
      created_at: cost_center.created_at,
      updated_by: cost_center.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: cost_center.updated_at,
      remarks: cost_center.remarks,
    })
    .from(cost_center)
    .leftJoin(ledger, eq(ledger.uuid, cost_center.ledger_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, cost_center.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, cost_center.updated_by))
    .where(eq(cost_center.uuid, uuid));

  const [data] = await cost_centerPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
