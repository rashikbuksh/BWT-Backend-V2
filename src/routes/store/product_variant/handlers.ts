import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, product_variant, product_variant_values_entry, warehouse } from '../schema';

const warehouse1 = alias(warehouse, 'warehouse_1');
const warehouse2 = alias(warehouse, 'warehouse_2');
const warehouse3 = alias(warehouse, 'warehouse_3');
const warehouse4 = alias(warehouse, 'warehouse_4');
const warehouse5 = alias(warehouse, 'warehouse_5');
const warehouse6 = alias(warehouse, 'warehouse_6');
const warehouse7 = alias(warehouse, 'warehouse_7');
const warehouse8 = alias(warehouse, 'warehouse_8');
const warehouse9 = alias(warehouse, 'warehouse_9');
const warehouse10 = alias(warehouse, 'warehouse_10');
const warehouse11 = alias(warehouse, 'warehouse_11');
const warehouse12 = alias(warehouse, 'warehouse_12');

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product_variant).values(value).returning({
    name: product_variant.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product_variant)
    .set(updates)
    .where(eq(product_variant.uuid, uuid))
    .returning({
      name: product_variant.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // product_variant_values_entry delete
  const productVariantValuesEntryDelete = await db.delete(product_variant_values_entry)
    .where(eq(product_variant_values_entry.product_variant_uuid, uuid))
    .returning(
      {
        name: product_variant_values_entry.uuid,
      },
    );

  // product_variant delete
  const [data] = await db.delete(product_variant)
    .where(eq(product_variant.uuid, uuid))
    .returning({
      name: product_variant.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', `${data.name} - Variant Value: ${productVariantValuesEntryDelete.length}`), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const productVariantPromise = db
    .select({
      index: product_variant.index,
      uuid: product_variant.uuid,
      product_uuid: product_variant.product_uuid,
      title: product.title,
      selling_price: PG_DECIMAL_TO_FLOAT(product_variant.selling_price),
      discount: PG_DECIMAL_TO_FLOAT(product_variant.discount),
      created_by: product_variant.created_by,
      created_by_name: createdByUser.name,
      created_at: product_variant.created_at,
      updated_by: product_variant.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: product_variant.updated_at,
      remarks: product_variant.remarks,
      discount_unit: product_variant.discount_unit,
      warehouse_1: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_1),
      warehouse_2: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_2),
      warehouse_3: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_3),
      warehouse_4: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_4),
      warehouse_5: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_5),
      warehouse_6: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_6),
      warehouse_7: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_7),
      warehouse_8: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_8),
      warehouse_9: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_9),
      warehouse_10: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_10),
      warehouse_11: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_11),
      warehouse_12: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_12),
      selling_warehouse: PG_DECIMAL_TO_FLOAT(product_variant.selling_warehouse),
      warehouse_1_uuid: warehouse1.uuid,
      warehouse_1_name: warehouse1.name,
      warehouse_2_uuid: warehouse2.uuid,
      warehouse_2_name: warehouse2.name,
      warehouse_3_uuid: warehouse3.uuid,
      warehouse_3_name: warehouse3.name,
      warehouse_4_uuid: warehouse4.uuid,
      warehouse_4_name: warehouse4.name,
      warehouse_5_uuid: warehouse5.uuid,
      warehouse_5_name: warehouse5.name,
      warehouse_6_uuid: warehouse6.uuid,
      warehouse_6_name: warehouse6.name,
      warehouse_7_uuid: warehouse7.uuid,
      warehouse_7_name: warehouse7.name,
      warehouse_8_uuid: warehouse8.uuid,
      warehouse_8_name: warehouse8.name,
      warehouse_9_uuid: warehouse9.uuid,
      warehouse_9_name: warehouse9.name,
      warehouse_10_uuid: warehouse10.uuid,
      warehouse_10_name: warehouse10.name,
      warehouse_11_uuid: warehouse11.uuid,
      warehouse_11_name: warehouse11.name,
      warehouse_12_uuid: warehouse12.uuid,
      warehouse_12_name: warehouse12.name,
    })
    .from(product_variant)
    .leftJoin(product, eq(product_variant.product_uuid, product.uuid))
    .leftJoin(createdByUser, eq(product_variant.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_variant.updated_by, updatedByUser.uuid))
    .leftJoin(warehouse1, eq(warehouse1.assigned, 'warehouse_1'))
    .leftJoin(warehouse2, eq(warehouse2.assigned, 'warehouse_2'))
    .leftJoin(warehouse3, eq(warehouse3.assigned, 'warehouse_3'))
    .leftJoin(warehouse4, eq(warehouse4.assigned, 'warehouse_4'))
    .leftJoin(warehouse5, eq(warehouse5.assigned, 'warehouse_5'))
    .leftJoin(warehouse6, eq(warehouse6.assigned, 'warehouse_6'))
    .leftJoin(warehouse7, eq(warehouse7.assigned, 'warehouse_7'))
    .leftJoin(warehouse8, eq(warehouse8.assigned, 'warehouse_8'))
    .leftJoin(warehouse9, eq(warehouse9.assigned, 'warehouse_9'))
    .leftJoin(warehouse10, eq(warehouse10.assigned, 'warehouse_10'))
    .leftJoin(warehouse11, eq(warehouse11.assigned, 'warehouse_11'))
    .leftJoin(warehouse12, eq(warehouse12.assigned, 'warehouse_12'))
    .orderBy(desc(product_variant.created_at));

  const data = await productVariantPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    index: product_variant.index,
    uuid: product_variant.uuid,
    product_uuid: product_variant.product_uuid,
    product_title: product.title,
    selling_price: PG_DECIMAL_TO_FLOAT(product_variant.selling_price),
    discount: PG_DECIMAL_TO_FLOAT(product_variant.discount),
    created_by: product_variant.created_by,
    created_by_name: createdByUser.name,
    created_at: product_variant.created_at,
    updated_by: product_variant.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: product_variant.updated_at,
    remarks: product_variant.remarks,
    discount_unit: product_variant.discount_unit,
    warehouse_1: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_1),
    warehouse_2: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_2),
    warehouse_3: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_3),
    warehouse_4: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_4),
    warehouse_5: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_5),
    warehouse_6: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_6),
    warehouse_7: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_7),
    warehouse_8: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_8),
    warehouse_9: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_9),
    warehouse_10: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_10),
    warehouse_11: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_11),
    warehouse_12: PG_DECIMAL_TO_FLOAT(product_variant.warehouse_12),
    selling_warehouse: PG_DECIMAL_TO_FLOAT(product_variant.selling_warehouse),
    product_variant_values_entry: sql`(
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
        WHERE pvve.product_variant_uuid = ${product_variant.uuid}
        ), '[]'::jsonb)
    )`,
    product_image: sql`(
     COALESCE((SELECT jsonb_agg(json_build_object(
          'uuid', pi.uuid,
          'product_uuid', pi.product_uuid,
          'image', pi.image,
          'is_main', pi.is_main,
          'created_by', pi.created_by,
          'created_at', pi.created_at,
          'updated_at', pi.updated_at,
          'remarks', pi.remarks
        ))
        FROM store.product_image pi
        WHERE pi.product_uuid = ${product_variant.product_uuid}
        ), '[]'::jsonb)
    )`,
  })
    .from(product_variant)
    .leftJoin(product, eq(product_variant.product_uuid, product.uuid))
    .leftJoin(createdByUser, eq(product_variant.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_variant.updated_by, updatedByUser.uuid))
    .leftJoin(warehouse1, eq(warehouse1.assigned, 'warehouse_1'))
    .leftJoin(warehouse2, eq(warehouse2.assigned, 'warehouse_2'))
    .leftJoin(warehouse3, eq(warehouse3.assigned, 'warehouse_3'))
    .leftJoin(warehouse4, eq(warehouse4.assigned, 'warehouse_4'))
    .leftJoin(warehouse5, eq(warehouse5.assigned, 'warehouse_5'))
    .leftJoin(warehouse6, eq(warehouse6.assigned, 'warehouse_6'))
    .leftJoin(warehouse7, eq(warehouse7.assigned, 'warehouse_7'))
    .leftJoin(warehouse8, eq(warehouse8.assigned, 'warehouse_8'))
    .leftJoin(warehouse9, eq(warehouse9.assigned, 'warehouse_9'))
    .leftJoin(warehouse10, eq(warehouse10.assigned, 'warehouse_10'))
    .leftJoin(warehouse11, eq(warehouse11.assigned, 'warehouse_11'))
    .leftJoin(warehouse12, eq(warehouse12.assigned, 'warehouse_12'))
    .where(eq(product_variant.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
