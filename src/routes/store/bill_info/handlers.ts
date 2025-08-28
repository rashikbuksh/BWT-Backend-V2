import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { BillInfoWithOrderDetailsRoute, CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { bill_info } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(bill_info).values(value).returning({
    name: bill_info.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(bill_info)
    .set(updates)
    .where(eq(bill_info.uuid, uuid))
    .returning({
      name: bill_info.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(bill_info)
    .where(eq(bill_info.uuid, uuid))
    .returning({
      name: bill_info.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const bill_infoPromise = db
    .select({
      uuid: bill_info.uuid,
      user_uuid: bill_info.user_uuid,
      name: bill_info.name,
      phone: bill_info.phone,
      address: bill_info.address,
      city: bill_info.city,
      district: bill_info.district,
      note: bill_info.note,
      is_ship_different: bill_info.is_ship_different,
      created_by: bill_info.created_by,
      created_by_name: users.name,
      created_at: bill_info.created_at,
      updated_by: bill_info.updated_by,
      updated_at: bill_info.updated_at,
      remarks: bill_info.remarks,
      email: bill_info.email,
      payment_method: bill_info.payment_method,
      is_paid: bill_info.is_paid,
    })
    .from(bill_info)
    .leftJoin(users, eq(bill_info.created_by, users.uuid))
    .orderBy(desc(bill_info.created_at));

  const data = await bill_infoPromise;

  return c.json(data, HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const bill_infoPromise = db
    .select({
      uuid: bill_info.uuid,
      user_uuid: bill_info.user_uuid,
      name: bill_info.name,
      phone: bill_info.phone,
      address: bill_info.address,
      city: bill_info.city,
      district: bill_info.district,
      note: bill_info.note,
      is_ship_different: bill_info.is_ship_different,
      created_by: bill_info.created_by,
      created_by_name: users.name,
      created_at: bill_info.created_at,
      updated_by: bill_info.updated_by,
      updated_at: bill_info.updated_at,
      remarks: bill_info.remarks,
      email: bill_info.email,
      payment_method: bill_info.payment_method,
      is_paid: bill_info.is_paid,
    })
    .from(bill_info)
    .leftJoin(users, eq(bill_info.created_by, users.uuid))
    .where(eq(bill_info.uuid, uuid));

  const [data] = await bill_infoPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const billInfoWithOrderDetails: AppRouteHandler<BillInfoWithOrderDetailsRoute> = async (c: any) => {
  const { bill_info_uuid } = c.req.valid('query');

  const bill_infoPromise = db
    .select({
      uuid: bill_info.uuid,
      user_uuid: bill_info.user_uuid,
      name: bill_info.name,
      phone: bill_info.phone,
      address: bill_info.address,
      city: bill_info.city,
      district: bill_info.district,
      note: bill_info.note,
      is_ship_different: bill_info.is_ship_different,
      created_by: bill_info.created_by,
      created_by_name: users.name,
      created_at: bill_info.created_at,
      updated_by: bill_info.updated_by,
      updated_at: bill_info.updated_at,
      remarks: bill_info.remarks,
      email: bill_info.email,
      payment_method: bill_info.payment_method,
      is_paid: bill_info.is_paid,
      order_details: sql`(
        SELECT COALESCE(json_agg(row_to_json(t)),'[]'::json)
        FROM (
          SELECT
            o.uuid,
            o.product_variant_uuid,
            o.quantity,
            o.selling_price::float8,
            o.order_status,
            pv.product_uuid,
            p.title AS product_title,
            pv.selling_price::float8 AS variant_selling_price,
            pv.discount::float8,
            pv.selling_warehouse::float8,
            pv.created_by AS variant_created_by,
            pv.created_at AS variant_created_at,
            pv.updated_at AS variant_updated_at,
            pv.updated_by AS variant_updated_by,
            pv.remarks AS variant_remarks,
            pv.index AS variant_index,
            (
              SELECT COALESCE(jsonb_agg(json_build_object(
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
              )), '[]'::jsonb)
              FROM store.product_variant_values_entry pvve
              LEFT JOIN store.product_attributes pa ON pvve.attribute_uuid = pa.uuid
              WHERE pvve.product_variant_uuid = pv.uuid
            ) AS product_variant_values_entry
          FROM store.ordered o
          LEFT JOIN store.product_variant pv ON o.product_variant_uuid = pv.uuid
          LEFT JOIN store.product p ON pv.product_uuid = p.uuid
          WHERE o.bill_info_uuid = ${bill_info.uuid}
          ORDER BY pv.index ASC
        ) t
      )`,
      ship_address: sql`
        (
        SELECT COALESCE(json_agg(row_to_json(t)),'[]'::json)
        FROM (
          SELECT
            sa.uuid,
            sa.name,
            sa.bill_info_uuid,
            sa.company_name,
            sa.phone,
            sa.address,
            sa.city,
            sa.district,
            sa.zip,
            sa.note,
            sa.created_by,
            sa.created_at,
            sa.updated_at,
            sa.updated_by,
            sa.remarks
          FROM store.ship_address sa
          WHERE sa.bill_info_uuid = ${bill_info.uuid}
          ORDER BY sa.name ASC
        ) t
      )
      `,
    })
    .from(bill_info)
    .leftJoin(users, eq(bill_info.created_by, users.uuid))
    .orderBy(desc(bill_info.created_at));

  if (bill_info_uuid) {
    bill_infoPromise.where(eq(bill_info.uuid, bill_info_uuid));
  }

  const [data] = await bill_infoPromise;

  return c.json(data, HSCode.OK);
};
