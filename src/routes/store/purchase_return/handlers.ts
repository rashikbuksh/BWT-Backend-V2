import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, GetPurchaseReturnEntryDetailsByPurchaseReturnUuidRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { purchase, purchase_return, warehouse } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(purchase_return).values(value).returning({
    name: purchase_return.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(purchase_return)
    .set(updates)
    .where(eq(purchase_return.uuid, uuid))
    .returning({
      name: purchase_return.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(purchase_return)
    .where(eq(purchase_return.uuid, uuid))
    .returning({
      name: purchase_return.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const purchaseReturnPromise = db
    .select({
      uuid: purchase_return.uuid,
      id: purchase_return.id,
      purchase_return_id: sql`CONCAT('SPR',TO_CHAR(${purchase_return.created_at}, 'YY'),' - ',TO_CHAR(${purchase_return.id}, 'FM0000'))`,
      purchase_uuid: purchase_return.purchase_uuid,
      purchase_id: sql`CONCAT('SP',TO_CHAR(${purchase.created_at}, 'YY'),' - ',TO_CHAR(${purchase.id}, 'FM0000'))`,
      created_by: purchase_return.created_by,
      created_by_name: users.name,
      created_at: purchase_return.created_at,
      updated_at: purchase_return.updated_at,
      remarks: purchase_return.remarks,
      warehouse_uuid: purchase_return.warehouse_uuid,
      warehouse_name: warehouse.name,
    })
    .from(purchase_return)
    .leftJoin(
      users,
      eq(purchase_return.created_by, users.uuid),
    )
    .leftJoin(purchase, eq(purchase_return.purchase_uuid, purchase.uuid))
    .leftJoin(warehouse, eq(purchase_return.warehouse_uuid, warehouse.uuid))
    .orderBy(desc(purchase_return.created_at));

  const data = await purchaseReturnPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const purchaseReturnPromise = db
    .select({
      uuid: purchase_return.uuid,
      id: purchase_return.id,
      purchase_return_id: sql`CONCAT('SPR',TO_CHAR(${purchase_return.created_at}, 'YY'),' - ',TO_CHAR(${purchase_return.id}, 'FM0000'))`,
      purchase_uuid: purchase_return.purchase_uuid,
      purchase_id: sql`CONCAT('SP',TO_CHAR(${purchase.created_at}, 'YY'),' - ',TO_CHAR(${purchase.id}, 'FM0000'))`,
      created_by: purchase_return.created_by,
      created_by_name: users.name,
      created_at: purchase_return.created_at,
      updated_at: purchase_return.updated_at,
      remarks: purchase_return.remarks,
      warehouse_uuid: purchase_return.warehouse_uuid,
      warehouse_name: warehouse.name,
    })
    .from(purchase_return)
    .leftJoin(
      users,
      eq(purchase_return.created_by, users.uuid),
    )
    .leftJoin(purchase, eq(purchase_return.purchase_uuid, purchase.uuid))
    .leftJoin(warehouse, eq(purchase_return.warehouse_uuid, warehouse.uuid))
    .where(eq(purchase_return.uuid, uuid));

  const [data] = await purchaseReturnPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getPurchaseReturnEntryDetailsByPurchaseReturnUuid: AppRouteHandler<GetPurchaseReturnEntryDetailsByPurchaseReturnUuidRoute> = async (c: any) => {
  const { purchase_return_uuid } = c.req.valid('param');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}/${purchase_return_uuid}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [purchase_return, purchase_return_entry] = await Promise.all([
    fetchData('/v1/store/purchase-return'),
    fetchData('/v1/store/purchase-return-entry/by'),
  ]);

  const response = {
    ...purchase_return,
    purchase_return_entry: purchase_return_entry || [],
  };

  // if (!response)
  //   return DataNotFound(c);

  return c.json(response || {}, HSCode.OK);
};
