import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
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
const userHrSchema = alias(users, 'user_hr_schema');

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
  const { product_uuid, limit, is_unique } = c.req.valid('query');

  const baseQuery = db
    .select({
      uuid: review.uuid,
      product_uuid: review.product_uuid,
      product_title: product.title,
      user_uuid: review.user_uuid,
      user_created_at: userHrSchema.created_at,
      email: sql`CASE WHEN review.email IS NOT NULL THEN review.email ELSE ${userHrSchema.email} END`,
      name: sql`CASE WHEN review.name IS NOT NULL THEN review.name ELSE ${userHrSchema.name} END`,
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
    .leftJoin(userHrSchema, eq(review.user_uuid, userHrSchema.uuid))
    .leftJoin(product, eq(review.product_uuid, product.uuid));

  // Build dynamic parts without mutating base query typing
  let dynamicQuery: any = baseQuery;

  // If you only want latest per (email, product_uuid) at SQL level you can use a window function partition
  // by COALESCE(review.email, user_hr.email) and product_uuid; however here we fetch rows then apply
  // an application-level dedupe so we can enforce both "one row per email" and "one row per product".
  if (product_uuid) {
    dynamicQuery = (dynamicQuery as any).where(eq(review.product_uuid, product_uuid));
  }

  if (limit) {
    dynamicQuery = (dynamicQuery as any).limit(limit);
  }

  // fetch rows ordered by created_at desc (newest first)
  const rows = await (dynamicQuery as any).orderBy(desc(review.created_at));

  if (is_unique === 'true') {
    // Deduplicate:
    // - Primary key for user identity is email (which is already the SELECT expression).
    // - Fallback to user_uuid if email is null, and final fallback to uuid to avoid null key.
    // - Ensure returned list has unique emails AND unique products. We iterate rows (newest first)
    //   and pick the first row for each email, but skip rows for products already taken.
    const seenEmails = new Set<string>();
    const seenProducts = new Set<string>();
    const result: any[] = [];

    for (const r of rows) {
      const emailKey = r.email ?? (r.user_uuid ? String(r.user_uuid) : r.uuid);
      // if this email already taken, skip
      if (emailKey && seenEmails.has(emailKey))
        continue;
      // if this product already taken, skip
      if (seenProducts.has(r.product_uuid))
        continue;

      if (emailKey)
        seenEmails.add(emailKey);
      seenProducts.add(r.product_uuid);
      result.push(r);
    }

    return c.json(result || [], HSCode.OK);
  }

  return c.json(rows || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const reviewPromise = db
    .select({
      uuid: review.uuid,
      product_uuid: review.product_uuid,
      product_title: product.title,
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
