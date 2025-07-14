import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { nanoid } from '@/lib/nanoid';
import * as deliverySchema from '@/routes/delivery/schema';
import * as hrSchema from '@/routes/hr/schema';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { info, order, zone } from '../schema';

const user = alias(hrSchema.users, 'user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const {
    is_new_customer,
    user_uuid,
    name,
    phone,
    created_at,
    department_uuid,
    designation_uuid,
    business_type,
    where_they_find_us,
    submitted_by,
  } = value;

  let userUuid = user_uuid;
  if (is_new_customer) {
    const formattedName = name.toLowerCase().replace(/\s+/g, '');
    await db.insert(users).values({
      uuid: userUuid,
      name,
      phone,
      user_type: 'customer',
      pass: phone,
      department_uuid,
      designation_uuid,
      email: `${formattedName + phone}@bwt.com`,
      ext: '+880',
      created_at,
      business_type,
      where_they_find_us,
    });
  }
  if (submitted_by === 'customer') {
    const formattedName2 = name.toLowerCase().replace(/\s+/g, '');

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    userUuid = existingUser[0]?.uuid || userUuid;

    if (existingUser.length === 0) {
      userUuid = nanoid();

      await db.insert(users).values({
        uuid: userUuid,
        name,
        phone,
        user_type: 'customer',
        pass: phone,
        email: `${formattedName2 + phone}@bwt.com`,
        ext: '+880',
        created_at,
      });
    }
  }

  const [data] = await db.insert(info).values({ ...value, user_uuid: userUuid }).returning({
    name: info.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const {
    is_new_customer,
    user_uuid,
    name,
    phone,
    updated_at,
    department_uuid,
    designation_uuid,
    business_type,
    where_they_find_us,
  } = updates;

  if (is_new_customer) {
    const formattedName = name.toLowerCase().replace(/\s+/g, '');
    await db.insert(users).values({
      uuid: user_uuid,
      name,
      phone,
      user_type: 'customer',
      pass: phone,
      department_uuid,
      designation_uuid,
      email: `${formattedName + phone}@bwt.com`,
      ext: '+880',
      created_at: updated_at,
      business_type,
      where_they_find_us,
    });
  }

  const [data] = await db.update(info)
    .set(updates)
    .where(eq(info.uuid, uuid))
    .returning({
      name: info.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(info)
    .where(eq(info.uuid, uuid))
    .returning({
      name: info.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { customer_uuid, status } = c.req.valid('query');

  const orderCountSubquery = db
    .select({
      info_uuid: order.info_uuid,
      order_count: sql`COUNT(*)`.as('order_count'),
    })
    .from(order)
    .groupBy(order.info_uuid)
    .as('order_count_tbl');

  const deliveredCountSubquery = db
    .select({
      info_uuid: order.info_uuid,
      delivered_count: sql`COUNT(*)`.as('delivered_count'),
    })
    .from(deliverySchema.challan)
    .leftJoin(
      deliverySchema.challan_entry,
      eq(
        deliverySchema.challan.uuid,
        deliverySchema.challan_entry.challan_uuid,
      ),
    )
    .leftJoin(
      order,
      eq(deliverySchema.challan_entry.order_uuid, order.uuid),
    )
    .where(sql`delivery."challan".is_delivery_complete = 'true'`)
    .groupBy(order.info_uuid)
    .as('delivered_count_tbl');

  const infoPromise = db
    .select({
      id: info.id,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
      uuid: info.uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', TO_CHAR(${user.id}, 'FM0000'))`,
      user_name: user.name,
      user_phone: user.phone,
      received_date: info.received_date,
      is_product_received: info.is_product_received,
      created_by: info.created_by,
      created_by_name: hrSchema.users.name,
      created_at: info.created_at,
      updated_at: info.updated_at,
      remarks: info.remarks,
      location: info.location,
      zone_uuid: info.zone_uuid,
      zone_name: zone.name,
      submitted_by: info.submitted_by,
      order_count:
        sql`COALESCE(order_count_tbl.order_count::float8, 0)`,
      delivered_count:
        sql`COALESCE(delivered_count_tbl.delivered_count::float8, 0)`,
    })
    .from(info)
    .leftJoin(user, eq(info.user_uuid, user.uuid))
    .leftJoin(hrSchema.users, eq(info.created_by, hrSchema.users.uuid))
    .leftJoin(zone, eq(info.zone_uuid, zone.uuid))
    .leftJoin(
      orderCountSubquery,
      eq(info.uuid, orderCountSubquery.info_uuid),
    )
    .leftJoin(
      deliveredCountSubquery,
      eq(info.uuid, deliveredCountSubquery.info_uuid),
    );

  if (customer_uuid) {
    infoPromise.where(eq(info.user_uuid, customer_uuid));
  }
  if (status === 'pending') {
    infoPromise.where(
      sql`COALESCE(order_count_tbl.order_count, 0) != COALESCE(delivered_count_tbl.delivered_count, 0)`,
    );
  }
  if (status === 'complete') {
    infoPromise.where(
      sql`COALESCE(order_count_tbl.order_count, 0) = COALESCE(delivered_count_tbl.delivered_count, 0) AND COALESCE(order_count_tbl.order_count, 0) > 0 AND COALESCE(delivered_count_tbl.delivered_count, 0) > 0`,
    );
  }

  const data = await infoPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const infoPromise = db
    .select({
      id: info.id,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
      uuid: info.uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', TO_CHAR(${user.id}, 'FM0000'))`,
      user_name: user.name,
      user_phone: user.phone,
      received_date: info.received_date,
      is_product_received: info.is_product_received,
      created_by: info.created_by,
      created_by_name: hrSchema.users.name,
      created_at: info.created_at,
      updated_at: info.updated_at,
      remarks: info.remarks,
      location: info.location,
      zone_uuid: info.zone_uuid,
      zone_name: zone.name,
      submitted_by: info.submitted_by,
    })
    .from(info)
    .leftJoin(user, eq(info.user_uuid, user.uuid))
    .leftJoin(hrSchema.users, eq(info.created_by, hrSchema.users.uuid))
    .leftJoin(zone, eq(info.zone_uuid, zone.uuid))
    .where(eq(info.uuid, uuid));

  const [data] = await infoPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
