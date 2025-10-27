import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { nanoid } from '@/lib/nanoid';
import { HashPass } from '@/middlewares/auth';
import * as deliverySchema from '@/routes/delivery/schema';
import * as hrSchema from '@/routes/hr/schema';
import { users } from '@/routes/hr/schema';
import * as storeSchema from '@/routes/store/schema';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneByUserUuidRoute, GetOneRoute, GetOrderDetailsByInfoUuidRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { info, order, zone } from '../schema';

const user = alias(hrSchema.users, 'user');
const reference_user = alias(hrSchema.users, 'reference_user');
const receivedByUser = alias(hrSchema.users, 'received_by_user');

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
    is_fronted_user,
  } = value;

  let userUuid = user_uuid;
  if (is_new_customer) {
    const formattedName = name.toLowerCase().replace(/\s+/g, '');
    await db.insert(users).values({
      uuid: userUuid,
      name,
      phone,
      user_type: 'customer',
      pass: await HashPass(phone),
      department_uuid,
      designation_uuid,
      email: `${formattedName + phone}@bwt.com`,
      ext: '+880',
      created_at,
      business_type,
      where_they_find_us,
      can_access: '{"customer__customer_profile":["read"]}',
      status: '1', // Set status to active for new customers
    });
  }
  if (submitted_by === 'customer') {
    const formattedName2 = name.toLowerCase().replace(/\s+/g, '');

    //  value.order_info_status = 'pending';

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
        pass: await HashPass(phone),
        email: `${formattedName2 + phone}@bwt.com`,
        ext: '+880',
        created_at,
        can_access: '{"customer__customer_profile":["read"]}',
        status: '1', // Set status to active for new customers
      });
    }
  }

  const [data] = await db.insert(info).values(
    is_fronted_user ? { ...value } : { ...value, user_uuid: userUuid },
  ).returning({
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
      pass: await HashPass(phone),
      department_uuid,
      designation_uuid,
      email: `${formattedName + phone}@bwt.com`,
      ext: '+880',
      created_at: updated_at,
      business_type,
      where_they_find_us,
      can_access: '{"customer__customer_profile":["read"]}',
      status: '1', // Set status to active for new customers
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

  try {
    const orderData = await db.delete(order)
      .where(eq(order.info_uuid, uuid))
      .returning({
        name: order.uuid,
      });

    const [data] = await db.delete(info)
      .where(eq(info.uuid, uuid))
      .returning({
        name: info.uuid,
      });

    if (!data)
      return DataNotFound(c);

    return c.json(createToast('delete', data.name || ' ' || orderData[0]?.name), HSCode.OK);
  }
  catch (error: any) {
    // Check if the error is related to the foreign key constraint
    if (error.code === '23503' && error.constraint === 'product_transfer_order_uuid_order_uuid_fk') {
      return c.json(
        createToast('error', 'Cannot delete this order because it has associated product transfers. Please remove product transfers first.'),
        HSCode.CONFLICT,
      );
    }

    // Handle other potential foreign key constraints or database errors
    if (error.code === '23503') {
      return c.json(
        createToast('error', 'Cannot delete this order because it has associated records. Please remove associated records first.'),
        HSCode.CONFLICT,
      );
    }
    throw error;
  }
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { customer_uuid, status, orderType, engineer_uuid } = c.req.valid('query');

  // console.log('orderType:', orderType);

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
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', ${info.id})`,
      uuid: info.uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', ${user.id})`,
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
      branch_uuid: info.branch_uuid,
      branch_name: storeSchema.branch.name,
      reference_user_uuid: info.reference_user_uuid,
      reference_user_name: reference_user.name,
      is_commission_amount: info.is_commission_amount,
      commission_amount: sql`COALESCE(info.commission_amount::float8, 0)`,
      is_contact_with_customer: info.is_contact_with_customer,
      customer_feedback: info.customer_feedback,
      order_info_status: info.order_info_status,
      user_email: user.email,
      order_type: info.order_type,
      received_by: info.received_by,
      received_by_name: receivedByUser.name,
      products: sql`(
                SELECT COALESCE(
                  json_agg(json_build_object(
                    'order_uuid', o.uuid,
                    'order_id', CASE WHEN o.reclaimed_order_uuid IS NULL THEN CONCAT('WO', TO_CHAR(o.created_at, 'YY'), '-', o.id) ELSE CONCAT('RWO', TO_CHAR(o.created_at, 'YY'), '-', o.id) END,
                    'serial_no', o.serial_no, 
                    'model_uuid', o.model_uuid,
                    'model_name', m.name,
                    'brand_uuid', m.brand_uuid,
                    'brand_name', b.name,
                    'is_return', o.is_return,
                    'is_return_date', o.is_return_date,
                    'is_diagnosis_need', o.is_diagnosis_need,
                    'is_diagnosis_need_date', o.is_diagnosis_need_date,
                    'is_proceed_to_repair', o.is_proceed_to_repair,
                    'is_proceed_to_repair_date', o.is_proceed_to_repair_date,
                    'is_transferred_for_qc', o.is_transferred_for_qc,
                    'is_transferred_for_qc_date', o.is_transferred_for_qc_date,
                    'is_ready_for_delivery', o.is_ready_for_delivery,
                    'ready_for_delivery_date', o.ready_for_delivery_date,
                    'is_delivery_without_challan', o.is_delivery_without_challan,
                    'is_delivery_without_challan_date', o.is_delivery_without_challan_date,
                    'is_delivered', CASE WHEN ce.uuid IS NOT NULL THEN true ELSE false END,
                    'is_delivered_date', ch.is_delivery_complete_date,
                    'reclaimed_order_uuid', o.reclaimed_order_uuid,
                    'reclaimed_order_id', CASE WHEN ro.uuid IS NULL THEN NULL WHEN ro.reclaimed_order_uuid IS NULL THEN CONCAT('WO', TO_CHAR(ro.created_at, 'YY'), '-', ro.id) ELSE CONCAT('RWO', TO_CHAR(ro.created_at, 'YY'), '-', ro.id) END
                  )), '[]'::json
                )
                FROM work.order o
                LEFT JOIN store.model m ON o.model_uuid = m.uuid
                LEFT JOIN store.brand b ON m.brand_uuid = b.uuid
                LEFT JOIN delivery.challan_entry ce ON o.uuid = ce.order_uuid
                LEFT JOIN delivery.challan ch ON ce.challan_uuid = ch.uuid
                LEFT JOIN work.order ro ON o.reclaimed_order_uuid = ro.uuid
                WHERE o.info_uuid = ${info.uuid}
              )`,
      receive_type: info.receive_type,
      receiver: info.receiver,
      courier_uuid: info.courier_uuid,
      courier_name: deliverySchema.courier.name,
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
    )
    .leftJoin(storeSchema.branch, eq(info.branch_uuid, storeSchema.branch.uuid))
    .leftJoin(reference_user, eq(info.reference_user_uuid, reference_user.uuid))
    .leftJoin(receivedByUser, eq(info.received_by, receivedByUser.uuid))
    .leftJoin(deliverySchema.courier, eq(info.courier_uuid, deliverySchema.courier.uuid));

  // Build filters array and apply them together
  const filters = [];

  // Filter by customer
  if (customer_uuid) {
    filters.push(eq(info.user_uuid, customer_uuid));
  }

  // Filter by order status
  if (status === 'pending') {
    filters.push(
      sql`COALESCE(order_count_tbl.order_count, 0) > COALESCE(delivered_count_tbl.delivered_count, 0)`,
    );
  }
  else if (status === 'complete') {
    filters.push(
      sql`COALESCE(order_count_tbl.order_count, 0) <= COALESCE(delivered_count_tbl.delivered_count, 0) 
          AND COALESCE(order_count_tbl.order_count, 0) > 0 
          AND COALESCE(delivered_count_tbl.delivered_count, 0) > 0`,
    );
  }

  // Filter by order type (exclude undefined/null values)
  if (orderType && orderType !== 'undefined') {
    filters.push(eq(info.order_type, orderType));
  }

  // Filter by engineer_uuid (checks if any order under the info is assigned to the engineer)
  if (engineer_uuid !== undefined && engineer_uuid !== null && engineer_uuid !== '') {
    infoPromise.leftJoin(order, eq(info.uuid, order.info_uuid));
    filters.push(eq(order.engineer_uuid, engineer_uuid));
  }

  // Apply all filters if any exist
  if (filters.length > 0) {
    infoPromise.where(filters.length === 1 ? filters[0] : and(...filters));
  }

  const data = await infoPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const infoPromise = db
    .select({
      id: info.id,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', ${info.id})`,
      uuid: info.uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', ${user.id})`,
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
      branch_uuid: info.branch_uuid,
      branch_name: storeSchema.branch.name,
      reference_user_uuid: info.reference_user_uuid,
      reference_user_name: reference_user.name,
      is_commission_amount: info.is_commission_amount,
      commission_amount: sql`COALESCE(info.commission_amount::float8, 0)`,
      is_contact_with_customer: info.is_contact_with_customer,
      customer_feedback: info.customer_feedback,
      order_info_status: info.order_info_status,
      user_email: user.email,
      order_type: info.order_type,
      received_by: info.received_by,
      received_by_name: receivedByUser.name,
      products: sql`(
                SELECT COALESCE(
                  json_agg(json_build_object(
                    'order_uuid', o.uuid,
                    'serial_no', o.serial_no, 
                    'model_uuid', o.model_uuid,
                    'model_name', m.name,
                    'brand_uuid', m.brand_uuid,
                    'brand_name', b.name 
                  )), '[]'::json
                )
                FROM work.order o
                LEFT JOIN store.model m ON o.model_uuid = m.uuid
                LEFT JOIN store.brand b ON m.brand_uuid = b.uuid
                WHERE o.info_uuid = ${info.uuid}
              )`,
      receive_type: info.receive_type,
      receiver: info.receiver,
      courier_uuid: info.courier_uuid,
      courier_name: deliverySchema.courier.name,
    })
    .from(info)
    .leftJoin(user, eq(info.user_uuid, user.uuid))
    .leftJoin(hrSchema.users, eq(info.created_by, hrSchema.users.uuid))
    .leftJoin(zone, eq(info.zone_uuid, zone.uuid))
    .leftJoin(storeSchema.branch, eq(info.branch_uuid, storeSchema.branch.uuid))
    .leftJoin(reference_user, eq(info.reference_user_uuid, reference_user.uuid))
    .leftJoin(receivedByUser, eq(info.received_by, receivedByUser.uuid))
    .leftJoin(deliverySchema.courier, eq(info.courier_uuid, deliverySchema.courier.uuid))
    .where(eq(info.uuid, uuid));

  const [data] = await infoPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getOrderDetailsByInfoUuid: AppRouteHandler<GetOrderDetailsByInfoUuidRoute> = async (c: any) => {
  const { info_uuid } = c.req.valid('param');
  const { diagnosis, process, is_update, engineer_uuid } = c.req.valid('query');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [info, order] = await Promise.all([
    fetchData(`/v1/work/info/${info_uuid}`),
    fetchData(`/v1/work/order-by-info/${info_uuid}?engineer_uuid=${engineer_uuid || ''}`),
  ]);

  // Check if order.data exists and is an array before processing
  const orderData = Array.isArray(order) ? order : [];

  // Process each order to fetch diagnosis and process data conditionally
  const enrichedOrders = await Promise.all(
    orderData.map(async (orderItem: any) => {
      const { uuid: order_uuid } = orderItem;

      try {
        const diagnosisData
          = diagnosis === 'true'
            ? await fetchData(
                `/v1/work/diagnosis-by-order/${order_uuid}`,
              )
            : null;

        const processData
          = process === 'true'
            ? await fetchData(
                `/v1/work/process?order_uuid=${order_uuid}`,
              )
            : null;

        return {
          ...orderItem,
          ...(diagnosisData
            ? { diagnosis: diagnosisData?.data }
            : {}),
          ...(processData ? { process: processData?.data } : {}),
        };
      }
      catch (error) {
        console.error(`Error enriching order ${order_uuid}:`, error);
        // Return order without enriched data if API calls fail
        return orderItem;
      }
    }),
  );

  if (is_update === 'true') {
    enrichedOrders.sort(
      (a, b) => Number(a.id) - Number(b.id),
    );
  }
  else {
    enrichedOrders.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  if (engineer_uuid && orderData.length === 0) {
    return c.json({}, HSCode.OK);
  }

  const response = {
    ...info,
    // order_entry: order?.data || [],
    order_entry: enrichedOrders || [],
  };

  return c.json(response, HSCode.OK);
};

export const getOneByUserUuid: AppRouteHandler<GetOneByUserUuidRoute> = async (c: any) => {
  const { user_uuid } = c.req.valid('param');

  // const { diagnosis, process } = c.req.valid('query');

  const infoPromise = db
    .select({
      id: info.id,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', ${info.id})`,
      uuid: info.uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', ${user.id})`,
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
      branch_uuid: info.branch_uuid,
      branch_name: storeSchema.branch.name,
      reference_user_uuid: info.reference_user_uuid,
      reference_user_name: reference_user.name,
      is_commission_amount: info.is_commission_amount,
      commission_amount: sql`COALESCE(info.commission_amount::float8, 0)`,
      is_contact_with_customer: info.is_contact_with_customer,
      customer_feedback: info.customer_feedback,
      order_info_status: info.order_info_status,
      user_email: user.email,
      order_type: info.order_type,
      received_by: info.received_by,
      received_by_name: receivedByUser.name,
      service_type: info.service_type,
      product_entry: sql`(
                SELECT COALESCE(
                  json_agg(json_build_object(
                    'order_uuid', o.uuid,
                    'serial_no', o.serial_no, 
                    'model_uuid', o.model_uuid,
                    'model_name', m.name,
                    'brand_uuid', m.brand_uuid,
                    'brand_name', b.name,
                    'problem_statement', o.problem_statement,
                    'image_1', o.image_1,
                    'image_2', o.image_2,
                    'image_3', o.image_3

                  )), '[]'::json
                )
                FROM work.order o
                LEFT JOIN store.model m ON o.model_uuid = m.uuid
                LEFT JOIN store.brand b ON m.brand_uuid = b.uuid
                WHERE o.info_uuid = ${info.uuid}
              )`,
      receive_type: info.receive_type,
      receiver: info.receiver,
      courier_uuid: info.courier_uuid,
      courier_name: deliverySchema.courier.name,
    })
    .from(info)
    .leftJoin(user, eq(info.user_uuid, user.uuid))
    .leftJoin(hrSchema.users, eq(info.created_by, hrSchema.users.uuid))
    .leftJoin(zone, eq(info.zone_uuid, zone.uuid))
    .leftJoin(storeSchema.branch, eq(info.branch_uuid, storeSchema.branch.uuid))
    .leftJoin(reference_user, eq(info.reference_user_uuid, reference_user.uuid))
    .leftJoin(receivedByUser, eq(info.received_by, receivedByUser.uuid))
    .leftJoin(deliverySchema.courier, eq(info.courier_uuid, deliverySchema.courier.uuid))
    .where(eq(info.user_uuid, user_uuid))
    .orderBy(desc(info.created_at));

  const data = await infoPromise;

  // // extract info.uuid from data

  // const infoUuids = data.map(item => item.uuid);

  // const api = createApi(c);

  // const fetchData = async (endpoint: string) =>
  //   await api
  //     .get(`${endpoint}`)
  //     .then(response => response.data)
  //     .catch((error) => {
  //       console.error(
  //         `Error fetching data from ${endpoint}:`,
  //         error.message,
  //       );
  //       throw error;
  //     });

  // const [order] = await Promise.all(infoUuids.map(uuid => fetchData(`/v1/work/order-by-info/${uuid}`)));

  // const orderData = Array.isArray(order) ? order : [];

  // const enrichedOrders = await Promise.all(
  //   orderData.length > 0
  //     ? orderData.map(async (orderItem: any) => {
  //         const { uuid: order_uuid } = orderItem;

  //         try {
  //           const diagnosisData
  //             = diagnosis === 'true'
  //               ? await fetchData(
  //                   `/v1/work/diagnosis-by-order/${order_uuid}`,
  //                 )
  //               : null;

  //           const processData
  //             = process === 'true'
  //               ? await fetchData(
  //                   `/v1/work/process?order_uuid=${order_uuid}`,
  //                 )
  //               : null;

  //           return {
  //             ...orderItem,
  //             ...(diagnosisData
  //               ? { diagnosis: diagnosisData?.data }
  //               : {}),
  //             ...(processData
  //               ? { process: processData?.data }
  //               : {}),
  //           };
  //         }
  //         catch (error) {
  //           console.error(`Error enriching order ${order_uuid}:`, error);
  //           // Return order without enriched data if API calls fail
  //           return orderItem;
  //         }
  //       })
  //     : [],
  // );
  // enrichedOrders.sort(
  //   (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  // );

  // // Merge order_entry into each info item
  // const infoWithOrders = data.map((infoItem) => {
  //   // Find orders for this info uuid
  //   const ordersForInfo = enrichedOrders.filter(order => order.info_uuid === infoItem.uuid);
  //   return {
  //     ...infoItem,
  //     order_entry: ordersForInfo,
  //   };
  // });

  return c.json(data || [], HSCode.OK);
};
