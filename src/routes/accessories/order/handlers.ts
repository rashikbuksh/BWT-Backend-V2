import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import * as hrSchema from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile, updateFile } from '@/utils/upload_file';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { order } from '../schema';

const createdByUser = alias(hrSchema.users, 'createdByUser');
const updatedByUser = alias(hrSchema.users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  // const value = c.req.valid('json');

  const formData = await c.req.parseBody();

  const {
    uuid,
    user_uuid,
    quantity,
    description,
    image_1,
    image_2,
    image_3,
    created_by,
    created_at,
    updated_at,
    updated_by,
    remarks,

  } = formData;

  let imagePath_1 = null;
  let imagePath_2 = null;
  let imagePath_3 = null;

  if (image_1 && image_1 !== 'undefined' && image_1 !== 'null')
    imagePath_1 = await insertFile(image_1, 'accessories/order');

  if (image_2 && image_2 !== 'undefined' && image_2 !== 'null')
    imagePath_2 = await insertFile(image_2, 'accessories/order');

  if (image_3 && image_3 !== 'undefined' && image_3 !== 'null')
    imagePath_3 = await insertFile(image_3, 'accessories/order');

  const value = {
    uuid,
    user_uuid,
    quantity: quantity || 0,
    description: description || null,
    image_1: imagePath_1,
    image_2: imagePath_2,
    image_3: imagePath_3,
    created_by,
    created_at,
    updated_by: updated_by || null,
    updated_at: updated_at || null,
    remarks: remarks || null,

  };

  const [data] = await db.insert(order).values(value).returning({
    name: order.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const formData = await c.req.parseBody();
  // updates includes documents then do it else exclude it
  if (formData.image_1 && typeof formData.image_1 === 'object') {
    // get order image name
    const orderData = await db.query.order.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });
    if (orderData && orderData.image_1) {
      const imagePath = await updateFile(formData.image_1, orderData.image_1, 'accessories/order');
      formData.image_1 = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image_1, 'accessories/order');
      formData.image_1 = imagePath;
    }
  }
  if (formData.image_2 && typeof formData.image_2 === 'object') {
    // get order image name
    const orderData = await db.query.order.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });
    if (orderData && orderData.image_2) {
      const imagePath = await updateFile(formData.image_2, orderData.image_2, 'accessories/order');
      formData.image_2 = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image_2, 'accessories/order');
      formData.image_2 = imagePath;
    }
  }
  if (formData.image_3 && typeof formData.image_3 === 'object') {
    // get order image name
    const orderData = await db.query.order.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });
    if (orderData && orderData.image_3) {
      const imagePath = await updateFile(formData.image_3, orderData.image_3, 'accessories/order');
      formData.image_3 = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image_3, 'accessories/order');
      formData.image_3 = imagePath;
    }
  }
  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);
  const [data] = await db.update(order)
    .set(formData)
    .where(eq(order.uuid, uuid))
    .returning({
      name: order.uuid,
    });
  if (!data)
    return DataNotFound(c);
  return c.json(createToast('update', data.name ?? ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get order file name
  const orderData = await db.query.order.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });
  if (orderData) {
    if (orderData.image_1) {
      deleteFile(orderData.image_1);
    }
    if (orderData.image_2) {
      deleteFile(orderData.image_2);
    }
    if (orderData.image_3) {
      deleteFile(orderData.image_3);
    }
  }
  const [data] = await db.delete(order)
    .where(eq(order.uuid, uuid))
    .returning({
      name: order.uuid,
    });
  if (!data)
    return DataNotFound(c);
  return c.json(createToast('delete', data.name ?? ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { user_uuid } = c.req.valid('query');

  const orderPromise = db.select({
    uuid: order.uuid,
    user_uuid: order.user_uuid,
    name: hrSchema.users.name,
    phone: hrSchema.users.phone,
    email: hrSchema.users.email,
    location: hrSchema.users.address,
    where_they_find_us: hrSchema.users.where_they_find_us,
    quantity: PG_DECIMAL_TO_FLOAT(order.quantity),
    description: order.description,
    image_1: order.image_1,
    image_2: order.image_2,
    image_3: order.image_3,
    created_by: order.created_by,
    created_by_name: createdByUser.name,
    created_at: order.created_at,
    updated_by: order.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: order.updated_at,
    remarks: order.remarks,
    status: order.status,
  })
    .from(order)
    .leftJoin(hrSchema.users, eq(order.user_uuid, hrSchema.users.uuid))
    .leftJoin(createdByUser, eq(order.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(order.updated_by, updatedByUser.uuid))
    .orderBy(desc(order.created_at));

  if (user_uuid)
    orderPromise.where(eq(order.user_uuid, user_uuid));

  const data = await orderPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const orderPromise = db.select({
    uuid: order.uuid,
    user_uuid: order.user_uuid,
    name: hrSchema.users.name,
    phone: hrSchema.users.phone,
    email: hrSchema.users.email,
    location: hrSchema.users.address,
    where_they_find_us: hrSchema.users.where_they_find_us,
    quantity: PG_DECIMAL_TO_FLOAT(order.quantity),
    description: order.description,
    image_1: order.image_1,
    image_2: order.image_2,
    image_3: order.image_3,
    created_by: order.created_by,
    created_by_name: createdByUser.name,
    created_at: order.created_at,
    updated_by: order.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: order.updated_at,
    remarks: order.remarks,
    status: order.status,
  })
    .from(order)
    .leftJoin(hrSchema.users, eq(order.user_uuid, hrSchema.users.uuid))
    .leftJoin(createdByUser, eq(order.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(order.updated_by, updatedByUser.uuid))
    .where(eq(order.uuid, uuid));

  const [data] = await orderPromise;

  // if (!data)
  //   return DataNotFound(c);
  return c.json(data || {}, HSCode.OK);
};
