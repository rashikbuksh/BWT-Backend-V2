import type { AppRouteHandler } from '@/lib/types';

import { and, asc, desc, eq, sql } from 'drizzle-orm';
// import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { category, model, product } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  // replace spaces and special characters with hyphens and convert to lowercase
  let url = (value.title as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // check if the generated url already exists in the database
  const existing = await db.select().from(product).where(eq(product.url, url)).limit(1).execute();

  // if exists, append a number to make it unique
  if (existing.length > 0) {
    let suffix = 1;
    let newUrl = `${url}-${suffix}`;

    while (true) {
      const check = await db.select().from(product).where(eq(product.url, newUrl)).limit(1).execute();
      if (check.length === 0) {
        url = newUrl;
        break;
      }
      suffix += 1;
      newUrl = `${url}-${suffix}`;
    }
  }

  const [data] = await db.insert(product).values({ ...value, url }).returning({
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
  const { latest, categories, low_price, high_price, sorting, page, limit, is_pagination, is_published, refurbished, category_uuid, bestselling } = c.req.valid('query');

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
      attribute_list: product.attribute_list,
      refurbished: product.refurbished,
      url: product.url,
      // Get is_main image, fallback to first image if none is_main
      image: sql`(
          SELECT pi.image
          FROM store.product_image pi
          WHERE pi.product_uuid = ${product.uuid} AND pi.is_main = TRUE
          LIMIT 1
        )`,
      fallback_image: sql`(
          SELECT pi.image
          FROM store.product_image pi
          WHERE pi.product_uuid = ${product.uuid}
          ORDER BY pi.created_at ASC
          LIMIT 1
        )`,
      extra_information: product.extra_information,
      low_price: sql`(
        SELECT MIN(pv.selling_price::float8 - CASE WHEN pv.discount_unit = 'percentage' THEN (pv.selling_price::float8 * pv.discount::float8) / 100 ELSE pv.discount::float8 END)
        FROM store.product_variant pv
        WHERE pv.product_uuid = ${product.uuid}
      )`,
      high_price: sql`(
        SELECT MAX(pv.selling_price::float8 - CASE WHEN pv.discount_unit = 'percentage' THEN (pv.selling_price::float8 * pv.discount::float8) / 100 ELSE pv.discount::float8 END)
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
      is_published: product.is_published,
      total_review: sql`(
        SELECT COUNT(*)::int
        FROM store.review r
        WHERE r.product_uuid = ${product.uuid}
      )`,
      average_rating: sql`(
        SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1)::float8, 0)
        FROM store.review r
        WHERE r.product_uuid = ${product.uuid}
      )`,
      has_discount: sql`EXISTS (
        SELECT 1
        FROM store.product_variant pv
        WHERE pv.product_uuid = ${product.uuid}
          AND pv.discount > 0
      )`,
      selling_count: sql`(
        SELECT COALESCE(COUNT(*)::int, 0)
        FROM store.ordered oi
        LEFT JOIN store.bill_info bi ON oi.bill_info_uuid = bi.uuid
        LEFT JOIN store.product_variant pv ON oi.product_variant_uuid = pv.uuid
        LEFT JOIN store.product p ON p.uuid = pv.product_uuid
        WHERE bi.bill_status = 'completed'
          AND pv.product_uuid = ${product.uuid}
      )`,
    })
    .from(product)
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(users, eq(product.created_by, users.uuid));

  const filters = [];

  if (is_published) {
    filters.push(eq(product.is_published, is_published));
  }

  if (refurbished) {
    filters.push(eq(product.refurbished, refurbished));
  }

  if (low_price && high_price) {
    const minPrice = Number(low_price);
    const maxPrice = Number(high_price);
    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
      filters.push(sql`
        EXISTS (
          SELECT 1
          FROM store.product_variant pv
          WHERE pv.product_uuid = ${product.uuid}
            AND pv.selling_price::float8 BETWEEN ${minPrice} AND ${maxPrice}
        )
      `);
    }
  }

  if (category_uuid) {
    filters.push(eq(product.category_uuid, category_uuid));
  }

  if (bestselling === 'true') {
    // require product to have at least one completed order on any variant
    filters.push(sql`(
      SELECT COALESCE(COUNT(*)::int, 0)
      FROM store.ordered oi
      LEFT JOIN store.bill_info bi ON oi.bill_info_uuid = bi.uuid
      LEFT JOIN store.product_variant pv ON oi.product_variant_uuid = pv.uuid
      WHERE bi.bill_status = 'completed'
        AND pv.product_uuid = ${product.uuid}
    ) > 0`);

    // order products by selling_count (desc)
    productPromise.orderBy(desc(sql`(
      SELECT COALESCE(COUNT(*)::int, 0)
      FROM store.ordered oi
      LEFT JOIN store.bill_info bi ON oi.bill_info_uuid = bi.uuid
      LEFT JOIN store.product_variant pv ON oi.product_variant_uuid = pv.uuid
      WHERE bi.bill_status = 'completed'
        AND pv.product_uuid = ${product.uuid}
    )`));
  }

  if (filters.length > 0) {
    productPromise.where(and(...filters));
  }

  if (sorting === 'lowToHigh') {
    productPromise.orderBy(asc(sql`(
      SELECT MIN(pv.selling_price::float8)
      FROM store.product_variant pv
      WHERE pv.product_uuid = ${product.uuid}
    )`));
  }
  if (sorting === 'highToLow') {
    productPromise.orderBy(desc(sql`(
      SELECT MAX(pv.selling_price::float8)
      FROM store.product_variant pv
      WHERE pv.product_uuid = ${product.uuid}
    )`));
  }

  if (sorting === 'asc') {
    productPromise.orderBy(asc(product.title));
  }
  if (sorting === 'desc') {
    productPromise.orderBy(desc(product.title));
  }

  if (!sorting) {
    productPromise.orderBy(desc(product.created_at));
  }

  const data = await productPromise;
  // For each product, use image if present, else fallback_image
  let result = data.map(item => ({
    ...item,
    image: item.image || item.fallback_image || null,
  }));

  if (categories) {
    const categoryList = (categories as string)
      .split(',')
      .map((cat: string) => cat.trim().toLowerCase())
      .filter(Boolean);

    result = result.filter((item) => {
      const name = (item.category_name ?? '').toString().toLowerCase();
      return name && categoryList.includes(name);
    });
  }

  if (latest) {
    const latestNumber = Number(latest) || 0;
    if (latestNumber > 0) {
      result = result.slice(0, latestNumber);
    }
  }

  // Build pagination info and slice when requested
  const totalRecords = result.length;
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;
  const totalPages = Math.ceil(totalRecords / limitNumber) || 0;

  const pagination = {
    total_record: totalRecords,
    current_page: pageNumber,
    total_page: totalPages,
    next_page: pageNumber + 1 > totalPages ? null : pageNumber + 1,
    prev_page: pageNumber - 1 <= 0 ? null : pageNumber - 1,
  };

  if (is_pagination === 'true') {
    const startIndex = (pageNumber - 1) * limitNumber;
    const endIndex = startIndex + limitNumber;
    result = result.slice(startIndex, endIndex);
    return c.json({ pagination, data: result }, HSCode.OK);
  }

  return c.json(result || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const { is_published } = c.req.valid('query');

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
    attribute_list: product.attribute_list,
    is_published: product.is_published,
    is_order_exist: sql`EXISTS (SELECT 1 FROM store.ordered oi LEFT JOIN store.product_variant pv ON oi.product_variant_uuid = pv.uuid WHERE pv.product_uuid = ${product.uuid})`,
    extra_information: product.extra_information,
    refurbished: product.refurbished,
    url: product.url,
    total_review: sql`(
        SELECT COUNT(*)::int
        FROM store.review r
        WHERE r.product_uuid = ${product.uuid}
      )`,
    average_rating: sql`(
        SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1)::float8, 0)
        FROM store.review r
        WHERE r.product_uuid = ${product.uuid}
      )`,
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
      'discount_unit', pv.discount_unit,
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
    review: sql`(
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT
          r.uuid,
          r.product_uuid,
          r.user_uuid,
          r.email,
          r.name,
          r.comment,
          r.rating,
          r.created_by,
          r.created_at,
          r.updated_by,
          r.updated_at,
          r.remarks,
          r.info_uuid,
          r.accessories_uuid,
          u.name AS created_by_name
        FROM store.review r
        LEFT JOIN hr.users u ON r.created_by = u.uuid
        WHERE r.product_uuid = ${product.uuid}
        ORDER BY r.created_at DESC
      ) t
    )`,
  })
    .from(product)
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(users, eq(product.created_by, users.uuid));

  const filters = [];

  filters.push(eq(product.uuid, uuid));

  if (is_published) {
    filters.push(eq(product.is_published, is_published));
  }

  if (filters.length > 0) {
    resultPromise.where(and(...filters));
  }

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
