import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, exists, inArray, not, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { nanoid } from '@/lib/nanoid';
import { handleImagePatch, PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import * as deliverySchema from '@/routes/delivery/schema';
import * as hrSchema from '@/routes/hr/schema';
import * as storeSchema from '@/routes/store/schema';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile } from '@/utils/upload_file';

import type { CreateRoute, CreateWithoutFormRoute, GetByInfoRoute, GetDiagnosisDetailsByOrderRoute, GetOneRoute, ListRoute, PatchRoute, PatchWithoutFormRoute, RemoveRoute } from './routes';

import { accessory, diagnosis, info, order, problem } from '../schema';

const user = alias(hrSchema.users, 'user');
const engineerUser = alias(hrSchema.users, 'engineer_user');
const orderTable = alias(order, 'work_order');
const reclaimedOrderTable = alias(order, 'reclaimed_order');

// Helper function to process array fields from form data
function processArrayField(value: any): string[] {
  if (!value)
    return [];

  // If it's already an array, return it
  if (Array.isArray(value))
    return value;

  // Handle form data that might send arrays as multiple values
  if (typeof value === 'object' && value.constructor === Array)
    return value;

  if (typeof value === 'string') {
    // Handle empty string
    if (value.trim() === '')
      return [];

    // Try parsing as JSON first
    try {
      const parsed = value.includes(',') ? value.split(',').map(s => s.trim()).filter(s => s) : value;
      const array = Array.isArray(parsed) ? parsed : [parsed];
      console.warn('Processed array:', array);
      return array;
    }
    catch {

    }
  }

  return [value];
}

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  // const value = c.req.valid('json');

  const formData = await c.req.parseBody();

  const {
    is_diagnosis_need,
    is_proceed_to_repair,
    is_challan_needed,
    is_home_repair,
    brand_uuid,
    model_uuid,
    quantity,
    proposed_cost,
    bill_amount,
    serial_no,
    problems_uuid,
    problem_statement,
    accessories,
    warehouse_uuid,
    rack_uuid,
    floor_uuid,
    box_uuid,
    remarks,
    image_1,
    image_2,
    image_3,
    info_uuid,
    uuid,
    created_at,
    created_by,
    is_reclaimed,
    reclaimed_order_uuid,
    updated_at,
    is_transferred_for_qc,
    is_ready_for_delivery,
    repairing_problems_uuid,
    qc_problems_uuid,
    delivery_problems_uuid,
    repairing_problem_statement,
    qc_problem_statement,
    delivery_problem_statement,
    ready_for_delivery_date,
    engineer_uuid,
    advance_pay,
    is_return,
    return_comment,
  } = formData;

  let imagePath_1 = null;
  let imagePath_2 = null;
  let imagePath_3 = null;

  if (image_1 && image_1 !== 'undefined' && image_1 !== 'null')
    imagePath_1 = await insertFile(image_1, 'work/order');

  if (image_2 && image_2 !== 'undefined' && image_2 !== 'null')
    imagePath_2 = await insertFile(image_2, 'work/order');

  if (image_3 && image_3 !== 'undefined' && image_3 !== 'null')
    imagePath_3 = await insertFile(image_3, 'work/order');

  let finalModelUuid = model_uuid;

  if (model_uuid) {
    const model = await db
      .select()
      .from(storeSchema.model)
      .where(eq(storeSchema.model.uuid, model_uuid))
      .limit(1);

    if (model.length === 0) {
      const [newModel] = await db
        .insert(storeSchema.model)
        .values({
          uuid: nanoid(),
          brand_uuid,
          name: model_uuid,
          created_by,
          created_at,
        })
        .returning({
          uuid: storeSchema.model.uuid,
        });

      finalModelUuid = newModel.uuid;
    }
  }

  // Process array fields for form data

  const processedProblemsUuid = problems_uuid === '' ? [] : processArrayField(problems_uuid);
  const processedAccessories = accessories === '' ? [] : processArrayField(accessories);

  function defaultIfEmpty(val: any, def: any) {
    return val === '' ? def : val;
  }

  // const value = {
  //   is_diagnosis_need,
  //   is_proceed_to_repair,
  //   is_challan_needed,
  //   is_home_repair,
  //   brand_uuid,
  //   model_uuid: finalModelUuid,
  //   quantity: quantity || 0,
  //   proposed_cost: proposed_cost || 0,
  //   bill_amount: bill_amount || 0,
  //   serial_no,
  //   problems_uuid: processedProblemsUuid,
  //   problem_statement,
  //   accessories: processedAccessories,
  //   warehouse_uuid,
  //   rack_uuid,
  //   floor_uuid,
  //   box_uuid,
  //   remarks,
  //   image_1: imagePath_1,
  //   image_2: imagePath_2,
  //   image_3: imagePath_3,
  //   info_uuid,
  //   uuid,
  //   created_at,
  //   created_by,
  //   is_reclaimed,
  //   reclaimed_order_uuid,
  // };

  const value = {
    model_uuid: defaultIfEmpty(finalModelUuid, null),
    serial_no: defaultIfEmpty(serial_no, null),
    quantity: defaultIfEmpty(quantity, 0),
    problems_uuid: processedProblemsUuid,
    accessories: processedAccessories,
    is_diagnosis_need: defaultIfEmpty(is_diagnosis_need, false),
    warehouse_uuid: defaultIfEmpty(warehouse_uuid, null),
    rack_uuid: defaultIfEmpty(rack_uuid, null),
    floor_uuid: defaultIfEmpty(floor_uuid, null),
    box_uuid: defaultIfEmpty(box_uuid, null),
    updated_at: defaultIfEmpty(updated_at, null),
    remarks: defaultIfEmpty(remarks, null),
    is_transferred_for_qc: defaultIfEmpty(is_transferred_for_qc, false),
    is_ready_for_delivery: defaultIfEmpty(is_ready_for_delivery, false),
    brand_uuid: defaultIfEmpty(brand_uuid, null),
    is_proceed_to_repair: defaultIfEmpty(is_proceed_to_repair, false),
    repairing_problems_uuid: defaultIfEmpty(repairing_problems_uuid, []),
    qc_problems_uuid: defaultIfEmpty(qc_problems_uuid, []),
    delivery_problems_uuid: defaultIfEmpty(delivery_problems_uuid, []),
    repairing_problem_statement: defaultIfEmpty(repairing_problem_statement, null),
    qc_problem_statement: defaultIfEmpty(qc_problem_statement, null),
    delivery_problem_statement: defaultIfEmpty(delivery_problem_statement, null),
    ready_for_delivery_date: defaultIfEmpty(ready_for_delivery_date, null),
    bill_amount: defaultIfEmpty(bill_amount, 0),
    is_home_repair: defaultIfEmpty(is_home_repair, false),
    proposed_cost: defaultIfEmpty(proposed_cost, 0),
    is_challan_needed: defaultIfEmpty(is_challan_needed, false),
    image_1: imagePath_1,
    image_2: imagePath_2,
    image_3: imagePath_3,
    is_reclaimed: defaultIfEmpty(is_reclaimed, false),
    reclaimed_order_uuid: defaultIfEmpty(reclaimed_order_uuid, null),
    created_by: defaultIfEmpty(created_by, null),
    created_at,
    uuid,
    info_uuid,
    problem_statement,
    engineer_uuid: defaultIfEmpty(engineer_uuid, null),
    advance_pay: defaultIfEmpty(advance_pay, 0),
    is_return,
    return_comment,
  };

  try {
    const [data] = await db.insert(order).values(value).returning({
      name: order.uuid,
    });

    return c.json(createToast('create', data.name), HSCode.OK);
  }
  catch (error) {
    console.error('Database insert error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      value,
    });
    throw error;
  }
};

export const createWithoutForm: AppRouteHandler<CreateWithoutFormRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(order).values(value).returning({
    name: order.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  // const updates = c.req.valid('json');

  const formData = await c.req.parseBody();

  // Image Or File Handling
  const userData = await db.query.order.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });

  formData.image_1 = await handleImagePatch(formData.image_1, userData?.image_1 ?? undefined, 'work/order');
  formData.image_2 = await handleImagePatch(formData.image_2, userData?.image_2 ?? undefined, 'work/order');
  formData.image_3 = await handleImagePatch(formData.image_3, userData?.image_3 ?? undefined, 'work/order');

  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);

  const {
    model_uuid,
    brand_uuid,
    created_by,
    updated_at,
    problems_uuid,
    qc_problems_uuid,
    delivery_problems_uuid,
    repairing_problems_uuid,
    accessories,
    quantity,
    proposed_cost,
    bill_amount,
    advance_pay,
  } = formData;

  formData.quantity = quantity || 0;
  formData.proposed_cost = proposed_cost || 0;
  formData.bill_amount = bill_amount || 0;
  formData.advance_pay = advance_pay || 0;

  // Process arrays using raw form data if available
  if (formData) {
    if (problems_uuid || problems_uuid === '') {
      formData.problems_uuid = problems_uuid === '' ? [] : processArrayField(problems_uuid);
      console.warn('Patch problems_uuid processed:', formData.problems_uuid);
    }

    if (qc_problems_uuid || qc_problems_uuid === '') {
      formData.qc_problems_uuid = qc_problems_uuid === '' ? [] : processArrayField(qc_problems_uuid);
      console.warn('Patch qc_problems_uuid processed:', formData.qc_problems_uuid);
    }

    if (delivery_problems_uuid || delivery_problems_uuid === '') {
      formData.delivery_problems_uuid = delivery_problems_uuid === '' ? [] : processArrayField(delivery_problems_uuid);
      console.warn('Patch delivery_problems_uuid processed:', formData.delivery_problems_uuid);
    }

    if (repairing_problems_uuid || repairing_problems_uuid === '') {
      formData.repairing_problems_uuid = repairing_problems_uuid === '' ? [] : processArrayField(repairing_problems_uuid);
      console.warn('Patch repairing_problems_uuid processed:', formData.repairing_problems_uuid);
    }

    if (accessories || accessories === '') {
      formData.accessories = accessories === '' ? [] : processArrayField(accessories);
      console.warn('Patch accessories processed:', formData.accessories);
    }
  }

  let finalModelUuid = model_uuid;
  if (model_uuid) {
    const model = await db
      .select()
      .from(storeSchema.model)
      .where(eq(storeSchema.model.uuid, model_uuid))
      .limit(1);

    if (model.length === 0) {
      const [newModel] = await db
        .insert(storeSchema.model)
        .values({
          uuid: nanoid(),
          brand_uuid,
          name: model_uuid,
          created_by,
          created_at: updated_at,
        })
        .returning({
          uuid: storeSchema.model.uuid,
        });
      finalModelUuid = newModel.uuid;
    }
  }

  function defaultIfEmpty(val: any, def: any) {
    return val === '' ? def : val;
  }

  formData.model_uuid = defaultIfEmpty(formData.model_uuid, null);
  formData.serial_no = defaultIfEmpty(formData.serial_no, null);
  formData.quantity = defaultIfEmpty(formData.quantity, 0);
  formData.problems_uuid = defaultIfEmpty(formData.problems_uuid, []);
  formData.accessories = defaultIfEmpty(formData.accessories, []);
  formData.is_diagnosis_need = defaultIfEmpty(formData.is_diagnosis_need, false);
  formData.warehouse_uuid = defaultIfEmpty(formData.warehouse_uuid, null);
  formData.rack_uuid = defaultIfEmpty(formData.rack_uuid, null);
  formData.floor_uuid = defaultIfEmpty(formData.floor_uuid, null);
  formData.box_uuid = defaultIfEmpty(formData.box_uuid, null);
  formData.updated_at = defaultIfEmpty(formData.updated_at, null);
  formData.remarks = defaultIfEmpty(formData.remarks, null);
  formData.is_transferred_for_qc = defaultIfEmpty(formData.is_transferred_for_qc, false);
  formData.is_ready_for_delivery = defaultIfEmpty(formData.is_ready_for_delivery, false);
  formData.brand_uuid = defaultIfEmpty(formData.brand_uuid, null);
  formData.is_proceed_to_repair = defaultIfEmpty(formData.is_proceed_to_repair, false);
  formData.repairing_problems_uuid = defaultIfEmpty(formData.repairing_problems_uuid, []);
  formData.qc_problems_uuid = defaultIfEmpty(formData.qc_problems_uuid, []);
  formData.delivery_problems_uuid = defaultIfEmpty(formData.delivery_problems_uuid, []);
  formData.repairing_problem_statement = defaultIfEmpty(formData.repairing_problem_statement, null);
  formData.qc_problem_statement = defaultIfEmpty(formData.qc_problem_statement, null);
  formData.delivery_problem_statement = defaultIfEmpty(formData.delivery_problem_statement, null);
  formData.ready_for_delivery_date = defaultIfEmpty(formData.ready_for_delivery_date, null);
  formData.bill_amount = defaultIfEmpty(formData.bill_amount, 0);
  formData.is_home_repair = defaultIfEmpty(formData.is_home_repair, false);
  formData.proposed_cost = defaultIfEmpty(formData.proposed_cost, 0);
  formData.is_challan_needed = defaultIfEmpty(formData.is_challan_needed, false);
  formData.is_reclaimed = defaultIfEmpty(formData.is_reclaimed, false);
  formData.reclaimed_order_uuid = defaultIfEmpty(formData.reclaimed_order_uuid, null);
  formData.created_by = defaultIfEmpty(formData.created_by, null);
  formData.engineer_uuid = defaultIfEmpty(formData.engineer_uuid, null);
  formData.advance_pay = defaultIfEmpty(formData.advance_pay, 0);
  formData.is_return = defaultIfEmpty(formData.is_return, false);
  formData.return_comment = defaultIfEmpty(formData.return_comment, null);

  console.warn(formData, 'Final formData before update');

  try {
    const [data] = await db.update(order)
      .set({ ...formData, model_uuid: finalModelUuid })
      .where(eq(order.uuid, uuid))
      .returning({
        name: order.uuid,
      });

    if (!data)
      return DataNotFound(c);

    return c.json(createToast('update', data.name), HSCode.OK);
  }
  catch (error) {
    console.error('Database update error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      formData,
    });
    throw error;
  }
};

export const patchWithoutForm: AppRouteHandler<PatchWithoutFormRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(order)
    .set(updates)
    .where(eq(order.uuid, uuid))
    .returning({
      name: order.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get order image name

  const orderData = await db
    .select({
      uuid: order.uuid,
      image_1: order.image_1,
      image_2: order.image_2,
      image_3: order.image_3,
      reclaimed_order_uuid: order.reclaimed_order_uuid,
    })
    .from(order)
    .where(eq(order.uuid, uuid))
    .limit(1)
    .then(rows => rows[0]);

  if (orderData && (orderData.image_1 || orderData.image_2 || orderData.image_3)) {
    if (orderData.image_1)
      deleteFile(orderData.image_1);
    if (orderData.image_2)
      deleteFile(orderData.image_2);
    if (orderData.image_3)
      deleteFile(orderData.image_3);
  }

  await db.delete(diagnosis)
    .where(eq(diagnosis.order_uuid, uuid))
    .returning({
      problems_uuid: diagnosis.problems_uuid,
    });

  // Fix: Check if orderData exists and has reclaimed_order_uuid before querying
  if (orderData?.reclaimed_order_uuid) {
    const reclaimedOrderExists = await db.select({
      uuid: orderTable.uuid,
      is_reclaimed: orderTable.is_reclaimed,
    })
      .from(orderTable)
      .where(eq(orderTable.uuid, orderData.reclaimed_order_uuid));

    if (reclaimedOrderExists.length > 0) {
      await db.update(orderTable)
        .set({ is_reclaimed: false })
        .where(eq(orderTable.uuid, orderData.reclaimed_order_uuid));
    }
  }

  const [data] = await db.delete(order)
    .where(eq(order.uuid, uuid))
    .returning({
      name: order.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { qc, is_delivered, work_in_hand, customer_uuid, is_repair, is_return, is_delivery_complete, engineer_uuid } = c.req.valid('query');

  const orderPromise = db
    .select({
      id: orderTable.id,
      order_id: sql`CASE WHEN ${orderTable.reclaimed_order_uuid} IS NULL THEN CONCAT('WO', TO_CHAR(${orderTable.created_at}, 'YY'), '-', ${orderTable.id}) ELSE CONCAT('RWO', TO_CHAR(${orderTable.created_at}, 'YY'), '-', ${orderTable.id}) END`,
      uuid: orderTable.uuid,
      info_uuid: orderTable.info_uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', ${user.id})`,
      user_name: user.name,
      user_phone: user.phone,
      model_uuid: orderTable.model_uuid,
      model_name: storeSchema.model.name,
      brand_uuid: orderTable.brand_uuid,
      brand_name: storeSchema.brand.name,
      serial_no: orderTable.serial_no,
      problems_uuid: orderTable.problems_uuid,
      problem_statement: orderTable.problem_statement,
      accessories: orderTable.accessories,
      is_product_received: info.is_product_received,
      received_date: info.received_date,
      warehouse_uuid: orderTable.warehouse_uuid,
      warehouse_name: storeSchema.warehouse.name,
      rack_uuid: orderTable.rack_uuid,
      rack_name: storeSchema.rack.name,
      floor_uuid: orderTable.floor_uuid,
      floor_name: storeSchema.floor.name,
      box_uuid: orderTable.box_uuid,
      box_name: storeSchema.box.name,
      created_by: orderTable.created_by,
      created_by_name: hrSchema.users.name,
      created_at: orderTable.created_at,
      updated_at: orderTable.updated_at,
      remarks: orderTable.remarks,
      is_diagnosis_need: orderTable.is_diagnosis_need,
      quantity: orderTable.quantity,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', ${info.id})`,
      is_transferred_for_qc: orderTable.is_transferred_for_qc,
      is_ready_for_delivery: orderTable.is_ready_for_delivery,
      is_proceed_to_repair: orderTable.is_proceed_to_repair,
      branch_uuid: storeSchema.warehouse.branch_uuid,
      branch_name: storeSchema.branch.name,
      repairing_problems_uuid: orderTable.repairing_problems_uuid,
      qc_problems_uuid: orderTable.qc_problems_uuid,
      delivery_problems_uuid: orderTable.delivery_problems_uuid,
      repairing_problem_statement: orderTable.repairing_problem_statement,
      qc_problem_statement: orderTable.qc_problem_statement,
      delivery_problem_statement: orderTable.delivery_problem_statement,
      ready_for_delivery_date: orderTable.ready_for_delivery_date,
      diagnosis_problems_uuid: diagnosis.problems_uuid,
      diagnosis_problem_statement: diagnosis.problem_statement,
      bill_amount: PG_DECIMAL_TO_FLOAT(orderTable.bill_amount),
      is_home_repair: orderTable.is_home_repair,
      proposed_cost: PG_DECIMAL_TO_FLOAT(orderTable.proposed_cost),
      is_challan_needed: orderTable.is_challan_needed,
      image_1: orderTable.image_1,
      image_2: orderTable.image_2,
      image_3: orderTable.image_3,
      is_reclaimed: orderTable.is_reclaimed,
      reclaimed_order_uuid: orderTable.reclaimed_order_uuid,
      reclaimed_order_id: sql`CASE WHEN ${reclaimedOrderTable.reclaimed_order_uuid} IS NULL THEN CONCAT('WO', TO_CHAR(${reclaimedOrderTable.created_at}, 'YY'), '-', ${reclaimedOrderTable.id}) ELSE CONCAT('RWO', TO_CHAR(${reclaimedOrderTable.created_at}, 'YY'), '-', ${reclaimedOrderTable.id}) END`,
      new_order_uuid: sql`(SELECT o.uuid FROM work.order o WHERE o.reclaimed_order_uuid = ${orderTable.uuid} AND ${orderTable.is_reclaimed} = true LIMIT 1)`,
      new_order_id: sql`(SELECT CASE WHEN o.reclaimed_order_uuid IS NULL THEN CONCAT('WO', TO_CHAR(o.created_at, 'YY'), '-', o.id) ELSE CONCAT('RWO', TO_CHAR(o.created_at, 'YY'), '-', o.id) END FROM work.order o WHERE o.reclaimed_order_uuid = ${orderTable.uuid} AND ${orderTable.is_reclaimed} = true LIMIT 1)`,
      engineer_uuid: orderTable.engineer_uuid,
      engineer_name: engineerUser.name,
      advance_pay: PG_DECIMAL_TO_FLOAT(orderTable.advance_pay),
      is_return: orderTable.is_return,
      return_comment: orderTable.return_comment,
    })
    .from(orderTable)
    .leftJoin(hrSchema.users, eq(orderTable.created_by, hrSchema.users.uuid))
    .leftJoin(
      storeSchema.model,
      eq(orderTable.model_uuid, storeSchema.model.uuid),
    )
    .leftJoin(
      storeSchema.brand,
      eq(orderTable.brand_uuid, storeSchema.brand.uuid),
    )
    .leftJoin(
      storeSchema.warehouse,
      eq(orderTable.warehouse_uuid, storeSchema.warehouse.uuid),
    )
    .leftJoin(storeSchema.rack, eq(orderTable.rack_uuid, storeSchema.rack.uuid))
    .leftJoin(
      storeSchema.floor,
      eq(orderTable.floor_uuid, storeSchema.floor.uuid),
    )
    .leftJoin(storeSchema.box, eq(orderTable.box_uuid, storeSchema.box.uuid))
    .leftJoin(info, eq(orderTable.info_uuid, info.uuid))
    .leftJoin(user, eq(info.user_uuid, user.uuid))
    .leftJoin(
      storeSchema.branch,
      eq(storeSchema.warehouse.branch_uuid, storeSchema.branch.uuid),
    )
    .leftJoin(diagnosis, eq(orderTable.uuid, diagnosis.order_uuid))
    .leftJoin(reclaimedOrderTable, eq(orderTable.reclaimed_order_uuid, reclaimedOrderTable.uuid))
    .leftJoin(deliverySchema.challan_entry, eq(deliverySchema.challan_entry.order_uuid, orderTable.uuid))
    .leftJoin(deliverySchema.challan, eq(deliverySchema.challan.uuid, deliverySchema.challan_entry.challan_uuid))
    .leftJoin(engineerUser, eq(orderTable.engineer_uuid, engineerUser.uuid));

  // Build filters based on query parameters
  const filters = [];

  // Quality Control filter
  if (qc === 'true') {
    filters.push(
      and(
        eq(orderTable.is_transferred_for_qc, true),
        eq(orderTable.is_ready_for_delivery, false),
      ),
    );
  }

  // Ready for delivery but not yet delivered
  if (is_delivered === 'true') {
    filters.push(
      and(
        eq(orderTable.is_ready_for_delivery, true),
        sql`${deliverySchema.challan_entry.uuid} IS NULL`,
      ),
    );
  }

  // Delivery completed
  if (is_delivery_complete === 'true') {
    filters.push(eq(deliverySchema.challan.is_delivery_complete, true));
  }

  // Work in progress (no action taken yet)
  if (work_in_hand === 'true') {
    filters.push(
      and(
        eq(orderTable.is_return, false),
        eq(orderTable.is_transferred_for_qc, false),
        eq(orderTable.is_ready_for_delivery, false),
        eq(orderTable.is_proceed_to_repair, false),
      ),
    );
  }

  // Returned orders
  if (is_return === 'true') {
    filters.push(eq(orderTable.is_return, true));
  }

  // Customer-specific orders (ready for delivery or challan needed, not yet delivered)
  if (customer_uuid) {
    filters.push(
      and(
        eq(info.user_uuid, customer_uuid),
        or(
          eq(orderTable.is_ready_for_delivery, true),
          eq(orderTable.is_challan_needed, true),
        ),
        not(
          exists(
            db
              .select()
              .from(deliverySchema.challan_entry)
              .where(eq(deliverySchema.challan_entry.order_uuid, orderTable.uuid)),
          ),
        ),
      ),
    );
  }

  // Orders in repair phase
  if (is_repair === 'true') {
    filters.push(
      and(
        eq(orderTable.is_proceed_to_repair, true),
        eq(orderTable.is_transferred_for_qc, false),
        eq(orderTable.is_ready_for_delivery, false),
      ),
    );
  }

  // Engineer-specific orders
  if (engineer_uuid) {
    filters.push(eq(orderTable.engineer_uuid, engineer_uuid));
  }

  // Apply filters if any exist
  if (filters.length > 0) {
    orderPromise.where(and(...filters));
  }

  // Apply ordering - prioritize delivery date for delivered orders, otherwise creation date
  orderPromise.orderBy(
    is_delivered === 'true'
      ? desc(orderTable.ready_for_delivery_date)
      : desc(orderTable.created_at),
  );

  const data = await orderPromise;

  const orderProblemsUUIDs = data
    .map(order => Array.isArray(order.problems_uuid) ? order.problems_uuid : [])
    .flat();
  const diagnosisProblemsUUIDs = data
    .map(order => Array.isArray(order.diagnosis_problems_uuid) ? order.diagnosis_problems_uuid : [])
    .flat();
  const repairingProblemsUUIDs = data
    .map(order => Array.isArray(order.repairing_problems_uuid) ? order.repairing_problems_uuid : [])
    .flat();
  const qcProblemsUUIDs = data
    .map(order => Array.isArray(order.qc_problems_uuid) ? order.qc_problems_uuid : [])
    .flat();
  const deliveryProblemsUUIDs = data
    .map(order => Array.isArray(order.delivery_problems_uuid) ? order.delivery_problems_uuid : [])
    .flat();

  const allProblemsUUIDs = Array.from(
    new Set([
      ...orderProblemsUUIDs,
      ...diagnosisProblemsUUIDs,
      ...repairingProblemsUUIDs,
      ...qcProblemsUUIDs,
      ...deliveryProblemsUUIDs,
    ]),
  );

  const problems = await db
    .select({
      name: problem.name,
      uuid: problem.uuid,
    })
    .from(problem)
    .where(inArray(problem.uuid, allProblemsUUIDs.filter((uuid): uuid is string => typeof uuid === 'string')));

  const problemsMap: Record<string, string> = problems.reduce((acc, problem) => {
    if (problem.uuid && problem.name) {
      acc[problem.uuid] = problem.name;
    }
    return acc;
  }, {} as Record<string, string>);

  const accessories_uuid = data
    .map(order => Array.isArray(order.accessories) ? order.accessories : [])
    .flat();

  const accessories = await db
    .select({
      name: accessory.name,
      uuid: accessory.uuid,
    })
    .from(accessory)
    .where(inArray(accessory.uuid, accessories_uuid.filter((uuid): uuid is string => typeof uuid === 'string')));

  const accessoriesMap = accessories.reduce<Record<string, string>>((acc, accessory) => {
    acc[accessory.uuid] = accessory.name;
    return acc;
  }, {});

  type OrderWithExtras = typeof data[number] & {
    order_problems_name?: string[];
    diagnosis_problems_name?: string[];
    repairing_problems_name?: string[];
    qc_problems_name?: string[];
    delivery_problems_name?: string[];
    accessories_name?: string[];
    product_transfer?: any[];
  };

  (data as OrderWithExtras[]).forEach((order) => {
    order.order_problems_name = (order.problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    order.diagnosis_problems_name = (
      order.diagnosis_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.repairing_problems_name = (
      order.repairing_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.qc_problems_name = (order.qc_problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    order.delivery_problems_name = (
      order.delivery_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.accessories_name = (order.accessories || []).map(
      uuid => accessoriesMap[uuid],
    );
  });

  if (is_repair === 'true') {
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

    // Fetch product transfer data for the order
    for (const order of data) {
      const productTransfer = await fetchData(
        `/v1/store/product-transfer/by/${order.uuid}`,
      );
      (order as OrderWithExtras).product_transfer = productTransfer || [];
    }
  }

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const { engineer_uuid } = c.req.valid('query');

  const orderPromise = db
    .select({
      id: orderTable.id,
      order_id: sql`CASE WHEN ${orderTable.reclaimed_order_uuid} IS NULL THEN CONCAT('WO', TO_CHAR(${orderTable.created_at}, 'YY'), '-',${orderTable.id}) ELSE CONCAT('RWO', TO_CHAR(${orderTable.created_at}, 'YY'), '-',${orderTable.id}) END`,
      uuid: orderTable.uuid,
      info_uuid: orderTable.info_uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', ${user.id})`,
      user_name: user.name,
      user_phone: user.phone,
      model_uuid: orderTable.model_uuid,
      model_name: storeSchema.model.name,
      brand_uuid: orderTable.brand_uuid,
      brand_name: storeSchema.brand.name,
      serial_no: orderTable.serial_no,
      problems_uuid: orderTable.problems_uuid,
      problem_statement: orderTable.problem_statement,
      accessories: orderTable.accessories,
      is_product_received: info.is_product_received,
      received_date: info.received_date,
      warehouse_uuid: orderTable.warehouse_uuid,
      warehouse_name: storeSchema.warehouse.name,
      rack_uuid: orderTable.rack_uuid,
      rack_name: storeSchema.rack.name,
      floor_uuid: orderTable.floor_uuid,
      floor_name: storeSchema.floor.name,
      box_uuid: orderTable.box_uuid,
      box_name: storeSchema.box.name,
      created_by: orderTable.created_by,
      created_by_name: hrSchema.users.name,
      created_at: orderTable.created_at,
      updated_at: orderTable.updated_at,
      remarks: orderTable.remarks,
      is_diagnosis_need: orderTable.is_diagnosis_need,
      quantity: orderTable.quantity,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', ${info.id})`,
      is_transferred_for_qc: orderTable.is_transferred_for_qc,
      is_ready_for_delivery: orderTable.is_ready_for_delivery,
      is_proceed_to_repair: orderTable.is_proceed_to_repair,
      branch_uuid: storeSchema.warehouse.branch_uuid,
      branch_name: storeSchema.branch.name,
      is_delivery_complete: sql`CASE WHEN ${deliverySchema.challan.is_delivery_complete} IS NULL THEN false ELSE ${deliverySchema.challan.is_delivery_complete} END`,
      repairing_problems_uuid: orderTable.repairing_problems_uuid,
      qc_problems_uuid: orderTable.qc_problems_uuid,
      delivery_problems_uuid: orderTable.delivery_problems_uuid,
      repairing_problem_statement: orderTable.repairing_problem_statement,
      qc_problem_statement: orderTable.qc_problem_statement,
      delivery_problem_statement: orderTable.delivery_problem_statement,
      ready_for_delivery_date: orderTable.ready_for_delivery_date,
      diagnosis_problems_uuid: diagnosis.problems_uuid,
      diagnosis_problem_statement: diagnosis.problem_statement,
      bill_amount: PG_DECIMAL_TO_FLOAT(orderTable.bill_amount),
      is_home_repair: orderTable.is_home_repair,
      proposed_cost: PG_DECIMAL_TO_FLOAT(orderTable.proposed_cost),
      is_challan_needed: orderTable.is_challan_needed,
      image_1: orderTable.image_1,
      image_2: orderTable.image_2,
      image_3: orderTable.image_3,
      is_reclaimed: orderTable.is_reclaimed,
      reclaimed_order_uuid: orderTable.reclaimed_order_uuid,
      reclaimed_order_id: sql`CASE WHEN ${reclaimedOrderTable.reclaimed_order_uuid} IS NULL THEN CONCAT('WO', TO_CHAR(${reclaimedOrderTable.created_at}, 'YY'), '-', ${reclaimedOrderTable.id}) ELSE CONCAT('RWO', TO_CHAR(${reclaimedOrderTable.created_at}, 'YY'), '-', ${reclaimedOrderTable.id}) END`,
      new_order_uuid: sql`(SELECT o.uuid FROM work.order o WHERE o.reclaimed_order_uuid = ${orderTable.uuid} AND ${orderTable.is_reclaimed} = true LIMIT 1)`,
      new_order_id: sql`(SELECT CASE WHEN o.reclaimed_order_uuid IS NULL THEN CONCAT('WO', TO_CHAR(o.created_at, 'YY'), '-', o.id) ELSE CONCAT('RWO', TO_CHAR(o.created_at, 'YY'), '-', o.id) END FROM work.order o WHERE o.reclaimed_order_uuid = ${orderTable.uuid} AND ${orderTable.is_reclaimed} = true LIMIT 1)`,
      engineer_uuid: orderTable.engineer_uuid,
      engineer_name: engineerUser.name,
      advance_pay: PG_DECIMAL_TO_FLOAT(orderTable.advance_pay),
      is_return: orderTable.is_return,
      return_comment: orderTable.return_comment,
    })
    .from(orderTable)
    .leftJoin(hrSchema.users, eq(orderTable.created_by, hrSchema.users.uuid))
    .leftJoin(
      storeSchema.model,
      eq(orderTable.model_uuid, storeSchema.model.uuid),
    )
    .leftJoin(
      storeSchema.brand,
      eq(orderTable.brand_uuid, storeSchema.brand.uuid),
    )
    .leftJoin(
      storeSchema.warehouse,
      eq(orderTable.warehouse_uuid, storeSchema.warehouse.uuid),
    )
    .leftJoin(storeSchema.rack, eq(orderTable.rack_uuid, storeSchema.rack.uuid))
    .leftJoin(
      storeSchema.floor,
      eq(orderTable.floor_uuid, storeSchema.floor.uuid),
    )
    .leftJoin(storeSchema.box, eq(orderTable.box_uuid, storeSchema.box.uuid))
    .leftJoin(info, eq(orderTable.info_uuid, info.uuid))
    .leftJoin(user, eq(info.user_uuid, user.uuid))
    .leftJoin(
      storeSchema.branch,
      eq(storeSchema.warehouse.branch_uuid, storeSchema.branch.uuid),
    )
    .leftJoin(
      deliverySchema.challan_entry,
      eq(orderTable.uuid, deliverySchema.challan_entry.order_uuid),
    )
    .leftJoin(
      deliverySchema.challan,
      eq(
        deliverySchema.challan_entry.challan_uuid,
        deliverySchema.challan.uuid,
      ),
    )
    .leftJoin(diagnosis, eq(orderTable.uuid, diagnosis.order_uuid))
    .leftJoin(reclaimedOrderTable, eq(orderTable.reclaimed_order_uuid, reclaimedOrderTable.uuid))
    .leftJoin(engineerUser, eq(orderTable.engineer_uuid, engineerUser.uuid));

  const filters = [];

  // Always filter by the order UUID from the path parameter
  filters.push(eq(orderTable.uuid, uuid));

  // If engineer_uuid is provided, add it to the where clause
  if (engineer_uuid) {
    filters.push(eq(orderTable.engineer_uuid, engineer_uuid));
  }

  if (filters.length > 0) {
    orderPromise.where(and(...filters));
  }

  const data = await orderPromise;

  // Debug: Log the raw data to see what we're getting from the database
  // console.warn('GetOne raw data:', data[0]
  //   ? {
  //       problems_uuid: data[0].problems_uuid,
  //       diagnosis_problems_uuid: data[0].diagnosis_problems_uuid,
  //       repairing_problems_uuid: data[0].repairing_problems_uuid,
  //       qc_problems_uuid: data[0].qc_problems_uuid,
  //       delivery_problems_uuid: data[0].delivery_problems_uuid,
  //       accessories: data[0].accessories,
  //     }
  //   : 'No data');

  // Gather all unique problem UUIDs from all relevant fields
  const orderProblemsUUIDs = data
    .map(order => Array.isArray(order.problems_uuid) ? order.problems_uuid : [])
    .flat();
  const diagnosisProblemsUUIDs = data
    .map(order => Array.isArray(order.diagnosis_problems_uuid) ? order.diagnosis_problems_uuid : [])
    .flat();
  const repairingProblemsUUIDs = data
    .map(order => Array.isArray(order.repairing_problems_uuid) ? order.repairing_problems_uuid : [])
    .flat();
  const qcProblemsUUIDs = data
    .map(order => Array.isArray(order.qc_problems_uuid) ? order.qc_problems_uuid : [])
    .flat();
  const deliveryProblemsUUIDs = data
    .map(order => Array.isArray(order.delivery_problems_uuid) ? order.delivery_problems_uuid : [])
    .flat();

  const allProblemsUUIDs = Array.from(
    new Set([
      ...orderProblemsUUIDs,
      ...diagnosisProblemsUUIDs,
      ...repairingProblemsUUIDs,
      ...qcProblemsUUIDs,
      ...deliveryProblemsUUIDs,
    ]),
  );

  const problems = await db
    .select({
      name: problem.name,
      uuid: problem.uuid,
    })
    .from(problem)
    .where(inArray(problem.uuid, allProblemsUUIDs.filter((uuid): uuid is string => typeof uuid === 'string')));
  const problemsMap: Record<string, string> = problems.reduce((acc, problem) => {
    if (problem.uuid && problem.name) {
      acc[problem.uuid] = problem.name;
    }
    return acc;
  }, {} as Record<string, string>);

  const accessories_uuid = data
    .map(order => Array.isArray(order.accessories) ? order.accessories : [])
    .flat();

  const accessories = await db
    .select({
      name: accessory.name,
      uuid: accessory.uuid,
    })
    .from(accessory)
    .where(inArray(accessory.uuid, accessories_uuid.filter((uuid): uuid is string => typeof uuid === 'string')));

  const accessoriesMap = accessories.reduce<Record<string, string>>((acc, accessory) => {
    acc[accessory.uuid] = accessory.name;
    return acc;
  }, {});

  type OrderWithExtras = typeof data[number] & {
    order_problems_name?: string[];
    diagnosis_problems_name?: string[];
    repairing_problems_name?: string[];
    qc_problems_name?: string[];
    delivery_problems_name?: string[];
    accessories_name?: string[];
    product_transfer?: any[];
  };

  (data as OrderWithExtras[]).forEach((order) => {
    order.order_problems_name = (order.problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    order.diagnosis_problems_name = (
      order.diagnosis_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.repairing_problems_name = (
      order.repairing_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.qc_problems_name = (order.qc_problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    order.delivery_problems_name = (
      order.delivery_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.accessories_name = (order.accessories || []).map(
      uuid => accessoriesMap[uuid],
    );
  });

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

  // Fetch product transfer data for the order
  for (const order of data) {
    const productTransfer = await fetchData(
      `/v1/store/product-transfer/by/${order.uuid}`,
    );
    (order as OrderWithExtras).product_transfer = productTransfer || [];
  }

  if (!data)
    return DataNotFound(c);

  return c.json(data[0] || {}, HSCode.OK);
};

export const getDiagnosisDetailsByOrder: AppRouteHandler<GetDiagnosisDetailsByOrderRoute> = async (c: any) => {
  const { order_uuid } = c.req.valid('param');

  const { engineer_uuid } = c.req.valid('query');

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

  const [order, diagnosis, process, product_transfer] = await Promise.all([
    fetchData(`/v1/work/order/${order_uuid}?engineer_uuid=${engineer_uuid}`),
    fetchData(`/v1/work/diagnosis-by-order/${order_uuid}`),
    fetchData(`/v1/work/process?order_uuid=${order_uuid}`),
    fetchData(`/v1/store/product-transfer/by/${order_uuid}`),
  ]);

  // If engineer_uuid is provided and order is null, return a blank response
  if (engineer_uuid && (!order || Object.keys(order).length === 0)) {
    return c.json({}, HSCode.OK);
  }

  const data = {
    ...order,
    diagnosis: diagnosis || [],
    process: process || [],
    product_transfer: product_transfer || [],
  };

  if (!data)
    return DataNotFound(c);

  return c.json(data, HSCode.OK);
};

export const getByInfo: AppRouteHandler<GetByInfoRoute> = async (c: any) => {
  const { info_uuid } = c.req.valid('param');

  const { engineer_uuid } = c.req.valid('query');

  const orderPromise = db
    .select({
      id: orderTable.id,
      order_id: sql`CASE WHEN ${orderTable.reclaimed_order_uuid} IS NULL THEN CONCAT('WO', TO_CHAR(${orderTable.created_at}, 'YY'), '-', ${orderTable.id}) ELSE CONCAT('RWO', TO_CHAR(${orderTable.created_at}, 'YY'), '-', ${orderTable.id}) END`,
      uuid: orderTable.uuid,
      info_uuid: orderTable.info_uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', ${user.id})`,
      user_name: user.name,
      model_uuid: orderTable.model_uuid,
      model_name: storeSchema.model.name,
      brand_uuid: orderTable.brand_uuid,
      brand_name: storeSchema.brand.name,
      serial_no: orderTable.serial_no,
      problems_uuid: orderTable.problems_uuid,
      problem_statement: orderTable.problem_statement,
      accessories: orderTable.accessories,
      is_product_received: info.is_product_received,
      received_date: info.received_date,
      warehouse_uuid: orderTable.warehouse_uuid,
      warehouse_name: storeSchema.warehouse.name,
      rack_uuid: orderTable.rack_uuid,
      rack_name: storeSchema.rack.name,
      floor_uuid: orderTable.floor_uuid,
      floor_name: storeSchema.floor.name,
      box_uuid: orderTable.box_uuid,
      box_name: storeSchema.box.name,
      created_by: orderTable.created_by,
      created_by_name: hrSchema.users.name,
      created_at: orderTable.created_at,
      updated_at: orderTable.updated_at,
      remarks: orderTable.remarks,
      is_diagnosis_need: orderTable.is_diagnosis_need,
      quantity: orderTable.quantity,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', ${info.id})`,
      is_transferred_for_qc: orderTable.is_transferred_for_qc,
      is_ready_for_delivery: orderTable.is_ready_for_delivery,
      is_delivery_complete: sql`COALESCE(${deliverySchema.challan.is_delivery_complete}, false)`,
      is_proceed_to_repair: orderTable.is_proceed_to_repair,
      branch_uuid: storeSchema.warehouse.branch_uuid,
      branch_name: storeSchema.branch.name,
      repairing_problems_uuid: orderTable.repairing_problems_uuid,
      qc_problems_uuid: orderTable.qc_problems_uuid,
      delivery_problems_uuid: orderTable.delivery_problems_uuid,
      repairing_problem_statement: orderTable.repairing_problem_statement,
      qc_problem_statement: orderTable.qc_problem_statement,
      delivery_problem_statement: orderTable.delivery_problem_statement,
      ready_for_delivery_date: orderTable.ready_for_delivery_date,
      diagnosis_problems_uuid: diagnosis.problems_uuid,
      diagnosis_problem_statement: diagnosis.problem_statement,
      bill_amount: PG_DECIMAL_TO_FLOAT(orderTable.bill_amount),
      is_home_repair: orderTable.is_home_repair,
      proposed_cost: PG_DECIMAL_TO_FLOAT(diagnosis.proposed_cost),
      is_challan_needed: orderTable.is_challan_needed,
      image_1: orderTable.image_1,
      image_2: orderTable.image_2,
      image_3: orderTable.image_3,
      status: diagnosis.status,
      status_update_date: diagnosis.status_update_date,
      challan_no: sql`CONCAT('CH', TO_CHAR(${deliverySchema.challan.created_at}::timestamp, 'YY'), '-', ${deliverySchema.challan.id})`,
      challan_uuid: deliverySchema.challan.uuid,
      challan_type: deliverySchema.challan.challan_type,
      is_reclaimed: orderTable.is_reclaimed,
      reclaimed_order_uuid: orderTable.reclaimed_order_uuid,
      reclaimed_order_id: sql`CASE WHEN ${reclaimedOrderTable.reclaimed_order_uuid} IS NULL THEN CONCAT('WO', TO_CHAR(${reclaimedOrderTable.created_at}, 'YY'), '-', ${reclaimedOrderTable.id}) ELSE CONCAT('RWO', TO_CHAR(${reclaimedOrderTable.created_at}, 'YY'), '-', ${reclaimedOrderTable.id}) END`,
      new_order_uuid: sql`(SELECT o.uuid FROM work.order o WHERE o.reclaimed_order_uuid = ${orderTable.uuid} AND ${orderTable.is_reclaimed} = true LIMIT 1)`,
      new_order_id: sql`(SELECT CASE WHEN o.reclaimed_order_uuid IS NULL THEN CONCAT('WO', TO_CHAR(o.created_at, 'YY'), '-', o.id) ELSE CONCAT('RWO', TO_CHAR(o.created_at, 'YY'), '-', o.id) END FROM work.order o WHERE o.reclaimed_order_uuid = ${orderTable.uuid} AND ${orderTable.is_reclaimed} = true LIMIT 1)`,
      engineer_uuid: orderTable.engineer_uuid,
      engineer_name: engineerUser.name,
      advance_pay: PG_DECIMAL_TO_FLOAT(orderTable.advance_pay),
      is_return: orderTable.is_return,
      return_comment: orderTable.return_comment,
    })
    .from(orderTable)
    .leftJoin(hrSchema.users, eq(orderTable.created_by, hrSchema.users.uuid))
    .leftJoin(
      storeSchema.model,
      eq(orderTable.model_uuid, storeSchema.model.uuid),
    )
    .leftJoin(
      storeSchema.brand,
      eq(orderTable.brand_uuid, storeSchema.brand.uuid),
    )
    .leftJoin(
      storeSchema.warehouse,
      eq(orderTable.warehouse_uuid, storeSchema.warehouse.uuid),
    )
    .leftJoin(storeSchema.rack, eq(orderTable.rack_uuid, storeSchema.rack.uuid))
    .leftJoin(
      storeSchema.floor,
      eq(orderTable.floor_uuid, storeSchema.floor.uuid),
    )
    .leftJoin(storeSchema.box, eq(orderTable.box_uuid, storeSchema.box.uuid))
    .leftJoin(info, eq(orderTable.info_uuid, info.uuid))
    .leftJoin(user, eq(info.user_uuid, user.uuid))
    .leftJoin(
      deliverySchema.challan_entry,
      eq(orderTable.uuid, deliverySchema.challan_entry.order_uuid),
    )
    .leftJoin(
      deliverySchema.challan,
      eq(
        deliverySchema.challan_entry.challan_uuid,
        deliverySchema.challan.uuid,
      ),
    )
    .leftJoin(
      storeSchema.branch,
      eq(storeSchema.warehouse.branch_uuid, storeSchema.branch.uuid),
    )
    .leftJoin(diagnosis, eq(orderTable.uuid, diagnosis.order_uuid))
    .leftJoin(reclaimedOrderTable, eq(orderTable.reclaimed_order_uuid, reclaimedOrderTable.uuid))
    .leftJoin(engineerUser, eq(orderTable.engineer_uuid, engineerUser.uuid));

  const filters = [];
  // Always filter by the info UUID from the path parameter
  filters.push(eq(orderTable.info_uuid, info_uuid));

  // If engineer_uuid is provided, add it to the where clause
  if (engineer_uuid) {
    filters.push(eq(orderTable.engineer_uuid, engineer_uuid));
  }

  if (filters.length > 0) {
    orderPromise.where(and(...filters));
  }

  const data = await orderPromise;

  // Debug: Log the raw data to see what we're getting from the database
  // console.warn('GetByInfo raw data (first item):', data[0]
  //   ? {
  //       problems_uuid: data[0].problems_uuid,
  //       diagnosis_problems_uuid: data[0].diagnosis_problems_uuid,
  //       repairing_problems_uuid: data[0].repairing_problems_uuid,
  //       qc_problems_uuid: data[0].qc_problems_uuid,
  //       delivery_problems_uuid: data[0].delivery_problems_uuid,
  //       accessories: data[0].accessories,
  //     }
  //   : 'No data');

  const orderProblemsUUIDs = data
    .map(order => Array.isArray(order.problems_uuid) ? order.problems_uuid : [])
    .flat();
  const diagnosisProblemsUUIDs = data
    .map(order => Array.isArray(order.diagnosis_problems_uuid) ? order.diagnosis_problems_uuid : [])
    .flat();
  const repairingProblemsUUIDs = data
    .map(order => Array.isArray(order.repairing_problems_uuid) ? order.repairing_problems_uuid : [])
    .flat();
  const qcProblemsUUIDs = data
    .map(order => Array.isArray(order.qc_problems_uuid) ? order.qc_problems_uuid : [])
    .flat();
  const deliveryProblemsUUIDs = data
    .map(order => Array.isArray(order.delivery_problems_uuid) ? order.delivery_problems_uuid : [])
    .flat();

  const allProblemsUUIDs = Array.from(
    new Set([
      ...orderProblemsUUIDs,
      ...diagnosisProblemsUUIDs,
      ...repairingProblemsUUIDs,
      ...qcProblemsUUIDs,
      ...deliveryProblemsUUIDs,
    ]),

  );

  const problems = await db
    .select({
      name: problem.name,
      uuid: problem.uuid,
    })
    .from(problem)
    .where(inArray(problem.uuid, allProblemsUUIDs.filter((uuid): uuid is string => typeof uuid === 'string')));

  const problemsMap: Record<string, string> = problems.reduce((acc, problem) => {
    if (problem.uuid && problem.name) {
      acc[problem.uuid] = problem.name;
    }
    return acc;
  }, {} as Record<string, string>);

  const accessories_uuid = data
    .map(order => Array.isArray(order.accessories) ? order.accessories : [])
    .flat();

  const accessories = await db
    .select({
      name: accessory.name,
      uuid: accessory.uuid,
    })
    .from(accessory)
    .where(inArray(accessory.uuid, accessories_uuid.filter((uuid): uuid is string => typeof uuid === 'string')));
  const accessoriesMap = accessories.reduce<Record<string, string>>((acc, accessory) => {
    acc[accessory.uuid] = accessory.name;
    return acc;
  }, {});

  type OrderWithExtras = typeof data[number] & {
    order_problems_name?: string[];
    diagnosis_problems_name?: string[];
    repairing_problems_name?: string[];
    qc_problems_name?: string[];
    delivery_problems_name?: string[];
    accessories_name?: string[];
    product_transfer?: any[];
  };

  (data as OrderWithExtras[]).forEach((order) => {
    order.order_problems_name = (order.problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    order.diagnosis_problems_name = (
      order.diagnosis_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.repairing_problems_name = (
      order.repairing_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.qc_problems_name = (order.qc_problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    order.delivery_problems_name = (
      order.delivery_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    order.accessories_name = (order.accessories || []).map(
      uuid => accessoriesMap[uuid],
    );
  });

  if (data.length === 0)
    return DataNotFound(c);

  return c.json(data, HSCode.OK);
};
