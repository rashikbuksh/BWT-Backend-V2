import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
// import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, review } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(review).values(value).returning({
    name: review.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(review)
    .set(updates)
    .where(eq(review.uuid, uuid))
    .returning({
      name: review.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(review)
    .where(eq(review.uuid, uuid))
    .returning({
      name: review.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const reviewPromise = db
    .select({
      uuid: review.uuid,
      product_uuid: review.product_uuid,
      user_uuid: review.user_uuid,
      email: review.email,
      name: review.name,
      comment: review.comment,
      rating: review.rating,
      created_by: review.created_by,
      created_by_name: createdByUser.name,
      created_at: review.created_at,
      updated_by: review.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: review.updated_at,
      remarks: review.remarks,
      info_uuid: review.info_uuid,
      accessories_uuid: review.accessories_uuid,
    })
    .from(review)
    .leftJoin(createdByUser, eq(review.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(review.updated_by, updatedByUser.uuid))
    .leftJoin(product, eq(review.product_uuid, product.uuid))
    .orderBy(desc(review.created_at));

  const data = await reviewPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const reviewPromise = db
    .select({
      uuid: review.uuid,
      product_uuid: review.product_uuid,
      user_uuid: review.user_uuid,
      email: review.email,
      name: review.name,
      comment: review.comment,
      rating: review.rating,
      created_by: review.created_by,
      created_by_name: createdByUser.name,
      created_at: review.created_at,
      updated_by: review.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: review.updated_at,
      remarks: review.remarks,
      info_uuid: review.info_uuid,
      accessories_uuid: review.accessories_uuid,
    })
    .from(review)
    .leftJoin(createdByUser, eq(review.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(review.updated_by, updatedByUser.uuid))
    .leftJoin(product, eq(review.product_uuid, product.uuid))
    .where(eq(review.uuid, uuid));

  const [data] = await reviewPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

// export const getPurchaseEntryDetailsByPurchaseUuid: AppRouteHandler<GetPurchaseEntryDetailsByPurchaseUuidRoute> = async (c: any) => {
//   const { purchase_uuid } = c.req.valid('param');

//   const api = await createApi(c);

//   const fetchData = async (endpoint: string) =>
//     await api
//       .get(`${endpoint}/${purchase_uuid}`)
//       .then(response => response.data)
//       .catch((error) => {
//         console.error(
//           `Error fetching data from ${endpoint}:`,
//           error.message,
//         );
//         throw error;
//       });

//   const [purchase, purchase_entry] = await Promise.all([
//     fetchData('/v1/store/purchase'),
//     fetchData('/v1/store/purchase-entry/by'),
//   ]);

//   const response = {
//     ...purchase,
//     purchase_entry: purchase_entry || [],
//   };

//   // if (!response)
//   //   return DataNotFound(c);

//   return c.json(response || {}, HSCode.OK);
// };
