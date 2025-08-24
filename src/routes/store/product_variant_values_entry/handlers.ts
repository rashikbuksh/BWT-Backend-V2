import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product_attributes, product_variant, product_variant_values_entry } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product_variant_values_entry).values(value).returning({
    name: product_variant_values_entry.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product_variant_values_entry)
    .set(updates)
    .where(eq(product_variant_values_entry.uuid, uuid))
    .returning({
      name: product_variant_values_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product_variant_values_entry)
    .where(eq(product_variant_values_entry.uuid, uuid))
    .returning({
      name: product_variant_values_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const productVariantValuesEntryPromise = db
    .select({
      uuid: product_variant_values_entry.uuid,
      product_variant_uuid: product_variant_values_entry.product_variant_uuid,
      attribute_uuid: product_variant_values_entry.attribute_uuid,
      value: product_variant_values_entry.value,
      created_by: product_variant_values_entry.created_by,
      created_by_name: createdByUser.name,
      created_at: product_variant_values_entry.created_at,
      updated_by: product_variant_values_entry.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: product_variant_values_entry.updated_at,
      remarks: product_variant_values_entry.remarks,
    })
    .from(product_variant_values_entry)
    .leftJoin(product_variant, eq(product_variant_values_entry.product_variant_uuid, product_variant.uuid))
    .leftJoin(product_attributes, eq(product_variant_values_entry.attribute_uuid, product_attributes.uuid))
    .leftJoin(createdByUser, eq(product_variant_values_entry.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_variant_values_entry.updated_by, updatedByUser.uuid))
    .orderBy(desc(product_variant_values_entry.created_at));

  const data = await productVariantValuesEntryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product_variant_values_entry.uuid,
    product_variant_uuid: product_variant_values_entry.product_variant_uuid,
    attribute_uuid: product_variant_values_entry.attribute_uuid,
    value: product_variant_values_entry.value,
    created_by: product_variant_values_entry.created_by,
    created_by_name: users.name,
    created_at: product_variant_values_entry.created_at,
    updated_by: product_variant_values_entry.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: product_variant_values_entry.updated_at,
    remarks: product_variant_values_entry.remarks,
  })
    .from(product_variant_values_entry)
    .leftJoin(product_variant, eq(product_variant_values_entry.product_variant_uuid, product_variant.uuid))
    .leftJoin(product_attributes, eq(product_variant_values_entry.attribute_uuid, product_attributes.uuid))
    .leftJoin(createdByUser, eq(product_variant_values_entry.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_variant_values_entry.updated_by, updatedByUser.uuid))
    .where(eq(product_variant_values_entry.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
