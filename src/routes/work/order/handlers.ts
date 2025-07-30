import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, exists, inArray, not, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { nanoid } from '@/lib/nanoid';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import * as deliverySchema from '@/routes/delivery/schema';
import * as hrSchema from '@/routes/hr/schema';
import * as storeSchema from '@/routes/store/schema';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile, updateFile } from '@/utils/upload_file';

import type { CreateRoute, GetByInfoRoute, GetDiagnosisDetailsByOrderRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { accessory, diagnosis, info, order, problem } from '../schema';

const user = alias(hrSchema.users, 'user');
const orderTable = alias(order, 'work_order');

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

  const value = {
    is_diagnosis_need,
    is_proceed_to_repair,
    is_challan_needed,
    is_home_repair,
    brand_uuid,
    model_uuid: finalModelUuid,
    quantity: quantity || 0,
    proposed_cost: proposed_cost || 0,
    bill_amount: bill_amount || 0,
    serial_no,
    problems_uuid: processedProblemsUuid,
    problem_statement,
    accessories: processedAccessories,
    warehouse_uuid,
    rack_uuid,
    floor_uuid,
    box_uuid,
    remarks,
    image_1: imagePath_1,
    image_2: imagePath_2,
    image_3: imagePath_3,
    info_uuid,
    uuid,
    created_at,
    created_by,
    is_reclaimed,
    reclaimed_order_uuid,
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

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  // const updates = c.req.valid('json');

  const formData = await c.req.parseBody();

  // updates includes image then do it else exclude it
  if ((formData.image_1 && typeof formData.image_1 === 'object')
    || (formData.image_2 && typeof formData.image_2 === 'object')
    || (formData.image_3 && typeof formData.image_3 === 'object')) {
    // get user image name
    const userData = await db.query.order.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });

    if (userData && userData.image_1 && formData.image_1) {
      const imagePath = await updateFile(formData.image_1, userData.image_1, 'work/order');
      formData.image_1 = imagePath;
    }
    else if (formData.image_1) {
      const imagePath = await insertFile(formData.image_1, 'work/order');
      formData.image_1 = imagePath;
    }

    if (userData && userData.image_2 && formData.image_2) {
      const imagePath = await updateFile(formData.image_2, userData.image_2, 'work/order');
      formData.image_2 = imagePath;
    }
    else if (formData.image_2) {
      const imagePath = await insertFile(formData.image_2, 'work/order');
      formData.image_2 = imagePath;
    }

    if (userData && userData.image_3 && formData.image_3) {
      const imagePath = await updateFile(formData.image_3, userData.image_3, 'work/order');
      formData.image_3 = imagePath;
    }
    else if (formData.image_3) {
      const imagePath = await insertFile(formData.image_3, 'work/order');
      formData.image_3 = imagePath;
    }
  }

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
  } = formData;

  formData.quantity = quantity || 0;
  formData.proposed_cost = proposed_cost || 0;
  formData.bill_amount = bill_amount || 0;

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

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get order image name

  const orderData = await db.query.order.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });

  if (orderData && (orderData.image_1 || orderData.image_2 || orderData.image_3)) {
    if (orderData.image_1)
      deleteFile(orderData.image_1);
    if (orderData.image_2)
      deleteFile(orderData.image_2);
    if (orderData.image_3)
      deleteFile(orderData.image_3);
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
  const { qc, is_delivered, work_in_hand, customer_uuid, is_repair } = c.req.valid('query');

  const orderPromise = db
    .select({
      id: orderTable.id,
      order_id: sql`CONCAT('WO', TO_CHAR(${orderTable.created_at}, 'YY'), '-', TO_CHAR(${orderTable.id}, 'FM0000'))`,
      uuid: orderTable.uuid,
      info_uuid: orderTable.info_uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', TO_CHAR(${user.id}::integer, 'FM0000'))`,
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
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
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
    .orderBy(desc(orderTable.created_at));

  const filters = [];

  if (qc === 'true') {
    filters.push(
      and(
        eq(orderTable.is_transferred_for_qc, true),
        eq(orderTable.is_ready_for_delivery, false),
      ),
    );
  }

  if (is_delivered === 'true') {
    filters.push(eq(orderTable.is_ready_for_delivery, true));
  }

  if (work_in_hand === 'true') {
    filters.push(
      and(
        eq(orderTable.is_transferred_for_qc, false),
        eq(orderTable.is_ready_for_delivery, false),
        eq(orderTable.is_proceed_to_repair, false),
      ),
    );
  }

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
              .where(
                eq(
                  deliverySchema.challan_entry.order_uuid,
                  orderTable.uuid,
                ),
              ),
          ),
        ),
      ),
    );
  }
  if (is_repair === 'true') {
    filters.push(
      and(
        eq(orderTable.is_proceed_to_repair, true),
        eq(orderTable.is_transferred_for_qc, false),
        eq(orderTable.is_ready_for_delivery, false),
      ),
    );
  }

  if (filters.length > 0) {
    orderPromise.where(and(...filters));
  }

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

  const orderPromise = db
    .select({
      id: orderTable.id,
      order_id: sql`CONCAT('WO', TO_CHAR(${orderTable.created_at}, 'YY'), '-', TO_CHAR(${orderTable.id}, 'FM0000'))`,
      uuid: orderTable.uuid,
      info_uuid: orderTable.info_uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', TO_CHAR(${user.id}::integer, 'FM0000'))`,
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
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
      is_transferred_for_qc: orderTable.is_transferred_for_qc,
      is_ready_for_delivery: orderTable.is_ready_for_delivery,
      is_proceed_to_repair: orderTable.is_proceed_to_repair,
      branch_uuid: storeSchema.warehouse.branch_uuid,
      branch_name: storeSchema.branch.name,
      is_delivery_complete: deliverySchema.challan.is_delivery_complete,
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
    .where(eq(orderTable.uuid, uuid));

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
    fetchData(`/v1/work/order/${order_uuid}`),
    fetchData(`/v1/work/diagnosis-by-order/${order_uuid}`),
    fetchData(`/v1/work/process?order_uuid=${order_uuid}`),
    fetchData(`/v1/store/product-transfer/by/${order_uuid}`),
  ]);

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

  const orderPromise = db
    .select({
      id: orderTable.id,
      order_id: sql`CONCAT('WO', TO_CHAR(${orderTable.created_at}, 'YY'), '-', TO_CHAR(${orderTable.id}, 'FM0000'))`,
      uuid: orderTable.uuid,
      info_uuid: orderTable.info_uuid,
      user_uuid: info.user_uuid,
      user_id: sql`CONCAT('HU', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', TO_CHAR(${user.id}::integer, 'FM0000'))`,
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
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
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
      challan_no: sql`CONCAT('CH', TO_CHAR(${deliverySchema.challan.created_at}::timestamp, 'YY'), '-', TO_CHAR(${deliverySchema.challan.id}, 'FM0000'))`,
      challan_uuid: deliverySchema.challan.uuid,
      challan_type: deliverySchema.challan.challan_type,
      is_reclaimed: orderTable.is_reclaimed,
      reclaimed_order_uuid: orderTable.reclaimed_order_uuid,
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
    .where(eq(orderTable.info_uuid, info_uuid));

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
