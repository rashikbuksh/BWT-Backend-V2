import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile, updateFile } from '@/utils/upload_file';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product_image } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  // const value = c.req.valid('json');

  const formData = await c.req.parseBody();

  const image = formData.image;

  const imagePath = await insertFile(image, 'public/product-image');

  const value = {
    uuid: formData.uuid,
    product_uuid: formData.product_uuid,
    variant_uuid: formData.variant_uuid,
    image: imagePath,
    is_main: formData.is_main,
    created_at: formData.created_at,
    updated_at: formData.updated_at,
    updated_by: formData.updated_by,
    created_by: formData.created_by,
    remarks: formData.remarks,
  };

  const [data] = await db.insert(product_image).values(value).returning({
    name: product_image.uuid,
  });

  return c.json(createToast('create', data.name ?? ''), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const formData = await c.req.parseBody();

  // updates includes documents then do it else exclude it
  if (formData.image && typeof formData.image === 'object') {
    // get newsEntry documents name
    const productImageData = await db.query.product_image.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });

    if (productImageData && productImageData.image) {
      const imagePath = await updateFile(formData.image, productImageData.image, 'public/product-image');
      formData.image = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image, 'public/product-image');
      formData.image = imagePath;
    }
  }

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

  // get newsEntry file name

  const productImageData = await db.query.product_image.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });

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
  const data = await db.query.product_image.findMany();

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const data = await db.query.product_image.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
