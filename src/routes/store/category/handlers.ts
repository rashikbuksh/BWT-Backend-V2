import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { handleImagePatch } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile } from '@/utils/upload_file';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { category } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const formData = await c.req.parseBody();

  const image = formData.image;

  const imagePath = await insertFile(image, 'public/category');

  const value = {
    uuid: formData.uuid,
    name: formData.name,
    image: imagePath,
    // group_uuid: formData.group_uuid,
    created_at: formData.created_at,
    updated_at: formData.updated_at,
    updated_by: formData.updated_by,
    created_by: formData.created_by,
    remarks: formData.remarks,
  };

  const [data] = await db.insert(category).values(value).returning({
    name: category.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const formData = await c.req.parseBody();

  // Image Or File Handling
  const categoryImageData = await db.select()
    .from(category)
    .where(eq(category.uuid, uuid));

  formData.image = await handleImagePatch(formData.image, categoryImageData[0]?.image ?? undefined, 'public/category');

  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(category)
    .set(formData)
    .where(eq(category.uuid, uuid))
    .returning({
      name: category.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const categoryImageData = await db.select()
    .from(category)
    .where(eq(category.uuid, uuid));

  if (categoryImageData[0]?.image)
    await deleteFile(categoryImageData[0]?.image);

  const [data] = await db.delete(category)
    .where(eq(category.uuid, uuid))
    .returning({
      name: category.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: category.uuid,
    name: category.name,
    // group_uuid: category.group_uuid,
    // group_name: group.name,
    created_by: category.created_by,
    created_by_name: users.name,
    created_at: category.created_at,
    updated_at: category.updated_at,
    remarks: category.remarks,
    image: category.image,
  })
    .from(category)
    .leftJoin(users, eq(category.created_by, users.uuid));
    // .leftJoin(group, eq(category.group_uuid, group.uuid));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: category.uuid,
    name: category.name,
    // group_uuid: category.group_uuid,
    // group_name: group.name,
    created_by: category.created_by,
    created_by_name: users.name,
    created_at: category.created_at,
    updated_at: category.updated_at,
    remarks: category.remarks,
    image: category.image,
  })
    .from(category)
    .leftJoin(users, eq(category.created_by, users.uuid))
    // .leftJoin(group, eq(category.group_uuid, group.uuid))
    .where(eq(category.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
