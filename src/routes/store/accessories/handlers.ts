import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import * as hrSchema from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile, updateFile } from '@/utils/upload_file';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { accessories } from '../schema';

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
    imagePath_1 = await insertFile(image_1, 'store/accessories');

  if (image_2 && image_2 !== 'undefined' && image_2 !== 'null')
    imagePath_2 = await insertFile(image_2, 'store/accessories');

  if (image_3 && image_3 !== 'undefined' && image_3 !== 'null')
    imagePath_3 = await insertFile(image_3, 'store/accessories');

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

  const [data] = await db.insert(accessories).values(value).returning({
    name: accessories.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const formData = await c.req.parseBody();
  // updates includes documents then do it else exclude it
  if (formData.image_1 && typeof formData.image_1 === 'object') {
    // get order image name
    const accessoriesData = await db.query.accessories.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });
    if (accessoriesData && accessoriesData.image_1) {
      const imagePath = await updateFile(formData.image_1, accessoriesData.image_1, 'store/accessories');
      formData.image_1 = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image_1, 'store/accessories');
      formData.image_1 = imagePath;
    }
  }
  if (formData.image_2 && typeof formData.image_2 === 'object') {
    // get order image name
    const accessoriesData = await db.query.accessories.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });
    if (accessoriesData && accessoriesData.image_2) {
      const imagePath = await updateFile(formData.image_2, accessoriesData.image_2, 'store/accessories');
      formData.image_2 = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image_2, 'store/accessories');
      formData.image_2 = imagePath;
    }
  }
  if (formData.image_3 && typeof formData.image_3 === 'object') {
    // get order image name
    const accessoriesData = await db.query.accessories.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });
    if (accessoriesData && accessoriesData.image_3) {
      const imagePath = await updateFile(formData.image_3, accessoriesData.image_3, 'store/accessories');
      formData.image_3 = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image_3, 'store/accessories');
      formData.image_3 = imagePath;
    }
  }
  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);
  const [data] = await db.update(accessories)
    .set(formData)
    .where(eq(accessories.uuid, uuid))
    .returning({
      name: accessories.uuid,
    });
  if (!data)
    return DataNotFound(c);
  return c.json(createToast('update', data.name ?? ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get order file name
  const accessoriesData = await db.query.accessories.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });
  if (accessoriesData) {
    if (accessoriesData.image_1) {
      deleteFile(accessoriesData.image_1);
    }
    if (accessoriesData.image_2) {
      deleteFile(accessoriesData.image_2);
    }
    if (accessoriesData.image_3) {
      deleteFile(accessoriesData.image_3);
    }
  }
  const [data] = await db.delete(accessories)
    .where(eq(accessories.uuid, uuid))
    .returning({
      name: accessories.uuid,
    });
  if (!data)
    return DataNotFound(c);
  return c.json(createToast('delete', data.name ?? ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { user_uuid } = c.req.valid('query');

  const accessoriesPromise = db.select({
    id: accessories.id,
    accessories_id: sql`CONCAT('AI', TO_CHAR(${accessories.created_at}::timestamp, 'YY'), '-', ${accessories.id})`,
    uuid: accessories.uuid,
    user_uuid: accessories.user_uuid,
    name: hrSchema.users.name,
    phone: hrSchema.users.phone,
    email: hrSchema.users.email,
    location: hrSchema.users.address,
    where_they_find_us: hrSchema.users.where_they_find_us,
    quantity: PG_DECIMAL_TO_FLOAT(accessories.quantity),
    description: accessories.description,
    image_1: accessories.image_1,
    image_2: accessories.image_2,
    image_3: accessories.image_3,
    created_by: accessories.created_by,
    created_by_name: createdByUser.name,
    created_at: accessories.created_at,
    updated_by: accessories.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: accessories.updated_at,
    remarks: accessories.remarks,
    status: accessories.status,
  })
    .from(accessories)
    .leftJoin(hrSchema.users, eq(accessories.user_uuid, hrSchema.users.uuid))
    .leftJoin(createdByUser, eq(accessories.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(accessories.updated_by, updatedByUser.uuid))
    .orderBy(desc(accessories.created_at));

  if (user_uuid)
    accessoriesPromise.where(eq(accessories.user_uuid, user_uuid));

  const data = await accessoriesPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const accessoriesPromise = db.select({
    id: accessories.id,
    accessories_id: sql`CONCAT('AI', TO_CHAR(${accessories.created_at}::timestamp, 'YY'), '-', ${accessories.id})`,
    uuid: accessories.uuid,
    user_uuid: accessories.user_uuid,
    name: hrSchema.users.name,
    phone: hrSchema.users.phone,
    email: hrSchema.users.email,
    location: hrSchema.users.address,
    where_they_find_us: hrSchema.users.where_they_find_us,
    quantity: PG_DECIMAL_TO_FLOAT(accessories.quantity),
    description: accessories.description,
    image_1: accessories.image_1,
    image_2: accessories.image_2,
    image_3: accessories.image_3,
    created_by: accessories.created_by,
    created_by_name: createdByUser.name,
    created_at: accessories.created_at,
    updated_by: accessories.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: accessories.updated_at,
    remarks: accessories.remarks,
    status: accessories.status,
  })
    .from(accessories)
    .leftJoin(hrSchema.users, eq(accessories.user_uuid, hrSchema.users.uuid))
    .leftJoin(createdByUser, eq(accessories.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(accessories.updated_by, updatedByUser.uuid))
    .where(eq(accessories.uuid, uuid));

  const [data] = await accessoriesPromise;

  // if (!data)
  //   return DataNotFound(c);
  return c.json(data || {}, HSCode.OK);
};
