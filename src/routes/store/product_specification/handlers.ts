import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, product_specification } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product_specification).values(value).returning({
    name: product_specification.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product_specification)
    .set(updates)
    .where(eq(product_specification.uuid, uuid))
    .returning({
      name: product_specification.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product_specification)
    .where(eq(product_specification.uuid, uuid))
    .returning({
      name: product_specification.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const productSpecificationPromise = db
    .select({
      uuid: product_specification.uuid,
      product_uuid: product_specification.product_uuid,
      title: product.title,
      label: product_specification.label,
      value: product_specification.value,
      index: product_specification.index,
      created_by: product_specification.created_by,
      created_by_name: users.name,
      created_at: product_specification.created_at,
      updated_by: product_specification.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: product_specification.updated_at,
      remarks: product_specification.remarks,
    })
    .from(product_specification)
    .leftJoin(product, eq(product_specification.product_uuid, product.uuid))
    .leftJoin(createdByUser, eq(product_specification.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_specification.updated_by, updatedByUser.uuid))
    .orderBy(desc(product_specification.created_at));

  const data = await productSpecificationPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product_specification.uuid,
    product_uuid: product_specification.product_uuid,
    title: product.title,
    label: product_specification.label,
    value: product_specification.value,
    index: product_specification.index,
    created_by: product_specification.created_by,
    created_by_name: users.name,
    created_at: product_specification.created_at,
    updated_by: product_specification.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: product_specification.updated_at,
    remarks: product_specification.remarks,
  })
    .from(product_specification)
    .leftJoin(product, eq(product_specification.product_uuid, product.uuid))
    .leftJoin(createdByUser, eq(product_specification.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_specification.updated_by, updatedByUser.uuid))
    .where(eq(product_specification.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
