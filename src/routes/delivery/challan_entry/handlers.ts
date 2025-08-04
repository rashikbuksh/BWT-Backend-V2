import type { AppRouteHandler } from '@/lib/types';

import { eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import * as storeSchema from '@/routes/store/schema';
import * as workSchema from '@/routes/work/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetChallanEntryByChallanRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { challan, challan_entry } from '../schema';

const user = alias(users, 'user');
const workOrder = alias(workSchema.order, 'work_order');
export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(challan_entry).values(value).returning({
    name: challan_entry.challan_uuid,
  });

  return c.json(createToast('create', data.name ?? ''), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(challan_entry)
    .set(updates)
    .where(eq(challan_entry.uuid, uuid))
    .returning({
      name: challan_entry.challan_uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name ?? ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(challan_entry)
    .where(eq(challan_entry.uuid, uuid))
    .returning({
      name: challan_entry.challan_uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name ?? ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const challanEntryPromise = db
    .select({
      uuid: challan_entry.uuid,
      challan_uuid: challan_entry.challan_uuid,
      challan_id: sql`CONCAT ('CH', TO_CHAR(${challan.created_at}::timestamp, 'YY'), '-', ${challan.id})`,
      order_uuid: challan_entry.order_uuid,
      order_id: sql`CONCAT ('WO', TO_CHAR(${workSchema.order.created_at}::timestamp, 'YY'), '-', ${workSchema.order.id})`,
      created_by: challan_entry.created_by,
      created_by_name: users.name,
      created_at: challan_entry.created_at,
      updated_at: challan_entry.updated_at,
      remarks: challan_entry.remarks,
    })
    .from(challan_entry)
    .leftJoin(
      users,
      eq(challan_entry.created_by, users.uuid),
    )
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .leftJoin(
      workSchema.order,
      eq(challan_entry.order_uuid, workSchema.order.uuid),
    );
  const data = await challanEntryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const challanEntryPromise = db
    .select({
      uuid: challan_entry.uuid,
      challan_uuid: challan_entry.challan_uuid,
      challan_id: sql`CONCAT ('CH', TO_CHAR(${challan.created_at}::timestamp, 'YY'), '-', ${challan.id})`,
      order_uuid: challan_entry.order_uuid,
      order_id: sql`CONCAT ('WO', TO_CHAR(${workSchema.order.created_at}::timestamp, 'YY'), '-', ${workSchema.order.id})`,
      created_by: challan_entry.created_by,
      created_by_name: users.name,
      created_at: challan_entry.created_at,
      updated_at: challan_entry.updated_at,
      remarks: challan_entry.remarks,
    })
    .from(challan_entry)
    .leftJoin(
      users,
      eq(challan_entry.created_by, users.uuid),
    )
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .leftJoin(
      workSchema.order,
      eq(challan_entry.order_uuid, workSchema.order.uuid),
    )
    .where(eq(challan_entry.uuid, uuid));

  const [data] = await challanEntryPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getChallanEntryByChallan: AppRouteHandler<GetChallanEntryByChallanRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // console.log('Fetching challan entries for challan UUID:', uuid);

  const challanEntryPromise = db
    .select({
      uuid: challan_entry.uuid,
      challan_uuid: challan_entry.challan_uuid,
      challan_no: sql`CONCAT ('CH', TO_CHAR(${challan.created_at}::timestamp, 'YY'), '-', ${challan.id})`,
      order_uuid: challan_entry.order_uuid,
      order_id: sql`CONCAT ('WO', TO_CHAR(${workOrder.created_at}::timestamp, 'YY'), '-', ${workOrder.id})`,
      info_uuid: workOrder.info_uuid,
      user_uuid: workSchema.info.user_uuid,
      user_id: sql`CONCAT ('US', TO_CHAR(${user.created_at}::timestamp, 'YY'), '-', ${user.id})`,
      user_name: user.name,
      model_uuid: workOrder.model_uuid,
      model_name: storeSchema.model.name,
      brand_uuid: workOrder.brand_uuid,
      brand_name: storeSchema.brand.name,
      serial_no: workOrder.serial_no,
      problems_uuid: workOrder.problems_uuid,
      problem_statement: workOrder.problem_statement,
      accessories: workOrder.accessories,
      is_product_received: workSchema.info.is_product_received,
      received_date: workSchema.info.received_date,
      warehouse_uuid: workOrder.warehouse_uuid,
      warehouse_name: storeSchema.warehouse.name,
      rack_uuid: workOrder.rack_uuid,
      rack_name: storeSchema.rack.name,
      floor_uuid: workOrder.floor_uuid,
      floor_name: storeSchema.floor.name,
      box_uuid: workOrder.box_uuid,
      box_name: storeSchema.box.name,
      created_by: challan_entry.created_by,
      created_by_name: users.name,
      created_at: challan_entry.created_at,
      updated_at: challan_entry.updated_at,
      remarks: challan_entry.remarks,
      is_diagnosis_need: workOrder.is_diagnosis_need,
      quantity: workOrder.quantity,
      info_id: sql`CONCAT ('WI', TO_CHAR(${workSchema.info.created_at}::timestamp, 'YY'), '-', ${workSchema.info.id})`,
      is_transferred_for_qc: workOrder.is_transferred_for_qc,
      is_ready_for_delivery: workOrder.is_ready_for_delivery,
      bill_amount: PG_DECIMAL_TO_FLOAT(workOrder.bill_amount),
      repairing_problems_uuid: workOrder.repairing_problems_uuid,
      qc_problems_uuid: workOrder.qc_problems_uuid,
      delivery_problems_uuid: workOrder.delivery_problems_uuid,
      repairing_problem_statement: workOrder.repairing_problem_statement,
      qc_problem_statement: workOrder.qc_problem_statement,
      delivery_problem_statement: workOrder.delivery_problem_statement,
      ready_for_delivery_date: workOrder.ready_for_delivery_date,
      diagnosis_problems_uuid: workSchema.diagnosis.problems_uuid,
      diagnosis_problem_statement: workSchema.diagnosis.problem_statement,
      is_home_repair: workOrder.is_home_repair,
      proposed_cost: PG_DECIMAL_TO_FLOAT(workOrder.proposed_cost),
      is_challan_needed: workOrder.is_challan_needed,
      image_1: workOrder.image_1,
      image_2: workOrder.image_2,
      image_3: workOrder.image_3,

    })
    .from(challan_entry)
    .leftJoin(
      users,
      eq(challan_entry.created_by, users.uuid),
    )
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .leftJoin(
      workOrder,
      eq(challan_entry.order_uuid, workOrder.uuid),
    )
    .leftJoin(
      storeSchema.model,
      eq(workOrder.model_uuid, storeSchema.model.uuid),
    )
    .leftJoin(
      storeSchema.brand,
      eq(workOrder.brand_uuid, storeSchema.brand.uuid),
    )
    .leftJoin(
      storeSchema.warehouse,
      eq(workOrder.warehouse_uuid, storeSchema.warehouse.uuid),
    )
    .leftJoin(
      storeSchema.rack,
      eq(workOrder.rack_uuid, storeSchema.rack.uuid),
    )
    .leftJoin(
      storeSchema.floor,
      eq(workOrder.floor_uuid, storeSchema.floor.uuid),
    )
    .leftJoin(
      storeSchema.box,
      eq(workOrder.box_uuid, storeSchema.box.uuid),
    )
    .leftJoin(
      workSchema.info,
      eq(workOrder.info_uuid, workSchema.info.uuid),
    )
    .leftJoin(user, eq(workSchema.info.user_uuid, user.uuid))
    .leftJoin(
      workSchema.diagnosis,
      eq(workOrder.uuid, workSchema.diagnosis.order_uuid),
    )
    .where(eq(challan_entry.challan_uuid, uuid));

  const data = await challanEntryPromise;

  const orderProblemsUUIDs = data
    .map(item => Array.isArray(item.problems_uuid) ? item.problems_uuid : [])
    .flat();
  const diagnosisProblemsUUIDs = data
    .map(item => Array.isArray(item.diagnosis_problems_uuid) ? item.diagnosis_problems_uuid : [])
    .flat();
  const repairingProblemsUUIDs = data
    .map(item => Array.isArray(item.repairing_problems_uuid) ? item.repairing_problems_uuid : [])
    .flat();
  const qcProblemsUUIDs = data
    .map(item => Array.isArray(item.qc_problems_uuid) ? item.qc_problems_uuid : [])
    .flat();
  const deliveryProblemsUUIDs = data
    .map(item => Array.isArray(item.delivery_problems_uuid) ? item.delivery_problems_uuid : [])
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
      name: workSchema.problem.name,
      uuid: workSchema.problem.uuid,
    })
    .from(workSchema.problem)
    .where(inArray(workSchema.problem.uuid, allProblemsUUIDs.filter((uuid): uuid is string => typeof uuid === 'string')));

  const problemsMap: Record<string, string> = problems.reduce((acc, problem) => {
    if (problem.uuid && problem.name) {
      acc[problem.uuid] = problem.name;
    }
    return acc;
  }, {} as Record<string, string>);

  const accessories_uuid = data.map(item => item.accessories).flat();
  const accessories = await db
    .select({
      uuid: workSchema.accessory.uuid,
      name: workSchema.accessory.name,
    })
    .from(workSchema.accessory)
    .where(inArray(workSchema.accessory.uuid, accessories_uuid.filter((uuid): uuid is string => typeof uuid === 'string')));

  const accessoriesMap: Record<string, string> = accessories.reduce((acc, accessory) => {
    if (accessory.uuid && accessory.name) {
      acc[accessory.uuid] = accessory.name;
    }
    return acc;
  }, {} as Record<string, string>);

  type ChallanEntryWithExtras = typeof data[number] & {
    order_problems_name?: string[];
    diagnosis_problems_name?: string[];
    repairing_problems_name?: string[];
    qc_problems_name?: string[];
    delivery_problems_name?: string[];
    accessories_name?: string[];
    product_transfer?: any[];
  };

  (data as ChallanEntryWithExtras[]).forEach((item) => {
    item.order_problems_name = (item.problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    item.diagnosis_problems_name = (
      item.diagnosis_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    item.repairing_problems_name = (
      item.repairing_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    item.qc_problems_name = (item.qc_problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
    item.delivery_problems_name = (
      item.delivery_problems_uuid || []
    ).map(uuid => problemsMap[uuid]);
    item.accessories_name = (item.accessories || []).map(
      uuid => accessoriesMap[uuid],
    );
  });

  // if (!data || data.length === 0)
  //   return DataNotFound(c);

  return c.json(data || [], HSCode.OK);
};
