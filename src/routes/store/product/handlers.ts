import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
// import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
// import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { category, model, product } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product).values(value).returning({
    name: product.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product)
    .set(updates)
    .where(eq(product.uuid, uuid))
    .returning({
      name: product.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product)
    .where(eq(product.uuid, uuid))
    .returning({
      name: product.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const productPromise = db
    .select({
      uuid: product.uuid,
      title: product.title,
      category_uuid: product.category_uuid,
      category_name: category.name,
      model_uuid: product.model_uuid,
      model_name: model.name,
      warranty_days: product.warranty_days,
      service_warranty_days: product.service_warranty_days,
      created_by: product.created_by,
      created_by_name: users.name,
      created_at: product.created_at,
      updated_at: product.updated_at,
      remarks: product.remarks,
      specifications_description: product.specifications_description,
      care_maintenance_description: product.care_maintenance_description,
      image: sql`(SELECT pi.image FROM store.product_image pi WHERE pi.product_uuid = ${product.uuid} AND pi.is_main = TRUE LIMIT 1)`,
      low_price: sql`(
        SELECT MIN(pv.selling_price::float8)
        FROM store.product_variant pv
        WHERE pv.product_uuid = ${product.uuid}
      )`,
      high_price: sql`(
        SELECT MAX(pv.selling_price::float8)
        FROM store.product_variant pv
        WHERE pv.product_uuid = ${product.uuid}
      )`,
      low_price_discount: sql`(
        SELECT pv.discount::float8
        FROM store.product_variant pv
        WHERE pv.product_uuid = ${product.uuid}
        ORDER BY pv.selling_price::float8 ASC NULLS LAST
        LIMIT 1
      )`,
      high_price_discount: sql`(
        SELECT pv.discount::float8
        FROM store.product_variant pv
        WHERE pv.product_uuid = ${product.uuid}
        ORDER BY pv.selling_price::float8 DESC NULLS LAST
        LIMIT 1
      )`,
    })
    .from(product)
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(users, eq(product.created_by, users.uuid))
    .orderBy(desc(product.created_at));

  const data = await productPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product.uuid,
    title: product.title,
    category_uuid: product.category_uuid,
    category_name: category.name,
    model_uuid: product.model_uuid,
    model_name: model.name,
    warranty_days: product.warranty_days,
    service_warranty_days: product.service_warranty_days,
    created_by: product.created_by,
    created_by_name: users.name,
    created_at: product.created_at,
    updated_at: product.updated_at,
    remarks: product.remarks,
    specifications_description: product.specifications_description,
    care_maintenance_description: product.care_maintenance_description,
    product_variant: sql`COALESCE(ARRAY(
    SELECT json_build_object(
      'uuid', pv.uuid,
      'product_uuid', pv.product_uuid,
      'selling_price', pv.selling_price::float8,
      'discount', pv.discount::float8,
      'warehouse_1', pv.warehouse_1::float8,
      'warehouse_2', pv.warehouse_2::float8,
      'warehouse_3', pv.warehouse_3::float8,
      'warehouse_4', pv.warehouse_4::float8,
      'warehouse_5', pv.warehouse_5::float8,
      'warehouse_6', pv.warehouse_6::float8,
      'warehouse_7', pv.warehouse_7::float8,
      'warehouse_8', pv.warehouse_8::float8,
      'warehouse_9', pv.warehouse_9::float8,
      'warehouse_10', pv.warehouse_10::float8,
      'warehouse_11', pv.warehouse_11::float8,
      'warehouse_12', pv.warehouse_12::float8,
      'selling_warehouse', pv.selling_warehouse::float8,
      'created_by', pv.created_by,
      'created_at', pv.created_at,
      'updated_at', pv.updated_at,
      'updated_by', pv.updated_by,
      'remarks', pv.remarks,
      'index', pv.index,
      'product_variant_values_entry', (
        COALESCE((SELECT jsonb_agg(json_build_object(
          'uuid', pvve.uuid,
          'product_variant_uuid', pvve.product_variant_uuid,
          'attribute_uuid', pvve.attribute_uuid,
          'attribute_name', pa.name,
          'value', pvve.value,
          'created_by', pvve.created_by,
          'created_at', pvve.created_at,
          'updated_by', pvve.updated_by,
          'updated_at', pvve.updated_at,
          'remarks', pvve.remarks
        ))
        FROM store.product_variant_values_entry pvve
        LEFT JOIN store.product_attributes pa ON pvve.attribute_uuid = pa.uuid
        WHERE pvve.product_variant_uuid = pv.uuid), '[]'::jsonb)
      )
    )
    FROM store.product_variant pv
    WHERE pv.product_uuid = ${product.uuid}
    ORDER BY pv.index ASC
  ))`,
    product_specification: sql`
    (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          ps.uuid,
          ps.product_uuid,
          ps.label,
          ps.value,
          ps.created_by,
          ps.created_at,
          ps.updated_by,
          ps.updated_at,
          ps.remarks,
          ps.index
        FROM store.product_specification ps
        WHERE ps.product_uuid = ${product.uuid}
        ORDER BY ps.index ASC
      ) t
    )
    `,
    product_image: sql`
    (
        SELECT json_agg(row_to_json(t))
        FROM (
          SELECT 
            pi.uuid,
            pi.product_uuid,
            pi.variant_uuid,
            pi.image,
            pi.is_main,
            pi.created_by,
            pi.created_at,
            pi.updated_at,
            pi.remarks
          FROM store.product_image pi
          LEFT JOIN hr.users ON pi.created_by = users.uuid
          WHERE pi.product_uuid = ${product.uuid}
          ORDER BY pi.created_at ASC
        ) t
      ) as product_image
    `,
  })
    .from(product)
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(users, eq(product.created_by, users.uuid))
    .where(eq(product.uuid, uuid));

  const [data] = await resultPromise;

  if (data) {
    if (data.product_specification == null)
      data.product_specification = [];
    if (data.product_image == null)
      data.product_image = [];
    if (data.product_variant == null)
      data.product_variant = [];
  }

  return c.json(data || {}, HSCode.OK);
};
