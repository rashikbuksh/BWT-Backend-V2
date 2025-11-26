import type { AppRouteHandler } from '@/lib/types';

import { asc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { handleImagePatch } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile } from '@/utils/upload_file';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, product_image } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const formData = await c.req.parseBody();

  const image = formData.image;

  let imagePath = null;

  if (image !== null && image !== undefined) {
    imagePath = await insertFile(image, 'public/product-image');
  }

  const value = {
    ...formData,
    image: imagePath,
  };
  const [data] = await db.insert(product_image).values(value).returning({
    name: product_image.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const formData = await c.req.parseBody();

  const productImagePromise = db
    .select({
      image: product_image.image,
    })
    .from(product_image)
    .where(eq(product_image.uuid, uuid));

  const [productImageData] = await productImagePromise;

  formData.image = await handleImagePatch(formData.image, productImageData?.image ?? undefined, 'public/product-image');

  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product_image)
    .set(formData)
    .where(eq(product_image.uuid, uuid))
    .returning({
      name: product_image.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name ?? ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const productImagePromise = db
    .select({
      image: product_image.image,
    })
    .from(product_image)
    .where(eq(product_image.uuid, uuid));

  const [productImageData] = await productImagePromise;

  if (productImageData && productImageData.image) {
    deleteFile(productImageData.image);
  }

  const [data] = await db.delete(product_image)
    .where(eq(product_image.uuid, uuid))
    .returning({
      name: product_image.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name ?? ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const productVariantPromise = db
    .select({

      uuid: product_image.uuid,
      product_uuid: product_image.product_uuid,
      title: product.title,
      created_by: product_image.created_by,
      created_by_name: createdByUser.name,
      created_at: product_image.created_at,
      updated_by: product_image.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: product_image.updated_at,
      remarks: product_image.remarks,
      index: product_image.index,

    })
    .from(product_image)
    .leftJoin(product, eq(product_image.product_uuid, product.uuid))
    .leftJoin(createdByUser, eq(product_image.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_image.updated_by, updatedByUser.uuid))
    .orderBy(asc(product_image.index));

  const data = await productVariantPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product_image.uuid,
    product_uuid: product_image.product_uuid,
    title: product.title,
    created_by: product_image.created_by,
    created_by_name: createdByUser.name,
    created_at: product_image.created_at,
    updated_by: product_image.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: product_image.updated_at,
    remarks: product_image.remarks,
    index: product_image.index,
  })
    .from(product_image)
    .leftJoin(product, eq(product_image.product_uuid, product.uuid))
    .leftJoin(createdByUser, eq(product_image.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(product_image.updated_by, updatedByUser.uuid))
    .where(eq(product_image.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
