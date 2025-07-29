import type { AppRouteHandler } from '@/lib/types';

import { asc, eq, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import * as storeSchema from '../../store/schema';
import {
  diagnosis,
  info,
  order,
  problem,
  process,
  section,
} from '../schema';

const engineer_user = alias(users, 'engineer_user');
const user = alias(users, 'user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(process).values(value).returning({
    name: process.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(process)
    .set(updates)
    .where(eq(process.uuid, uuid))
    .returning({
      name: process.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(process)
    .where(eq(process.uuid, uuid))
    .returning({
      name: process.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { order_uuid, entry } = c.req.valid('query');

  let processPromise = db
    .select({
      id: process.id,
      process_id: sql`CONCAT('WP-', TO_CHAR(${process.created_at}, 'YY'), '-', TO_CHAR(${process.id}, 'FM0000'))`,
      uuid: process.uuid,
      section_uuid: process.section_uuid,
      section_name: section.name,
      order_uuid: process.order_uuid,
      diagnosis_uuid: process.diagnosis_uuid,
      engineer_uuid: process.engineer_uuid,
      engineer_name: engineer_user.name,
      problems_uuid: process.problems_uuid,
      problem_statement: process.problem_statement,
      status: process.status,
      status_update_date: process.status_update_date,
      is_transferred_for_qc: process.is_transferred_for_qc,
      is_ready_for_delivery: process.is_ready_for_delivery,
      warehouse_uuid: process.warehouse_uuid,
      warehouse_name: storeSchema.warehouse.name,
      rack_uuid: process.rack_uuid,
      rack_name: storeSchema.rack.name,
      floor_uuid: process.floor_uuid,
      floor_name: storeSchema.floor.name,
      box_uuid: process.box_uuid,
      box_name: storeSchema.box.name,
      process_uuid: process.uuid,
      created_by: process.created_by,
      created_by_name: users.name,
      created_at: process.created_at,
      updated_at: process.updated_at,
      remarks: process.remarks,
      index: process.index,
      branch_uuid: storeSchema.warehouse.branch_uuid,
      branch_name: storeSchema.branch.name,
    })
    .from(process)
    .leftJoin(
      users,
      eq(process.created_by, users.uuid),
    )
    .leftJoin(section, eq(process.section_uuid, section.uuid))
    .leftJoin(
      storeSchema.warehouse,
      eq(process.warehouse_uuid, storeSchema.warehouse.uuid),
    )
    .leftJoin(
      storeSchema.rack,
      eq(process.rack_uuid, storeSchema.rack.uuid),
    )
    .leftJoin(
      storeSchema.floor,
      eq(process.floor_uuid, storeSchema.floor.uuid),
    )
    .leftJoin(
      storeSchema.box,
      eq(process.box_uuid, storeSchema.box.uuid),
    )
    .leftJoin(
      engineer_user,
      eq(process.engineer_uuid, engineer_user.uuid),
    )
    .leftJoin(
      storeSchema.branch,
      eq(storeSchema.warehouse.branch_uuid, storeSchema.branch.uuid),
    )
    .orderBy(asc(process.index));

  if (order_uuid) {
    const diagnosisPromise = db
      .select({
        uuid: diagnosis.uuid,
      })
      .from(diagnosis)
      .where(eq(diagnosis.order_uuid, order_uuid));

    const diagnosisData = await diagnosisPromise;
    // console.log('diagnosisData:', diagnosisData);

    let whereConditions;
    if (diagnosisData.length > 0) {
      whereConditions = or(
        eq(process.diagnosis_uuid, diagnosisData[0].uuid),
        eq(process.order_uuid, order_uuid),
      );
    }
    else {
      whereConditions = eq(process.order_uuid, order_uuid);
    }
    processPromise = (processPromise as any).where(whereConditions);
  }

  let resultIdData = null;
  if (order_uuid) {
    const resultIdPromise = db
      .select({
        order_id: sql`CONCAT('WO-', TO_CHAR(${order.created_at}, 'YY'), '-', TO_CHAR(${order.id}, 'FM0000'))`,
        user_uuid: info.user_uuid,
        user_name: user.name,
        info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
        diagnosis_id: sql`CASE WHEN ${diagnosis.created_at} IS NULL OR ${diagnosis.id} IS NULL THEN NULL ELSE CONCAT('WD-', TO_CHAR(${diagnosis.created_at}, 'YY'), '-', TO_CHAR(${diagnosis.id}, 'FM0000')) END`,
      })
      .from(order)
      .leftJoin(diagnosis, eq(order.uuid, diagnosis.order_uuid))
      .leftJoin(info, eq(order.info_uuid, info.uuid))
      .leftJoin(user, eq(info.user_uuid, user.uuid))
      .where(eq(order.uuid, order_uuid));

    resultIdData = await resultIdPromise;
  }

  const processData = await processPromise;

  const problems_uuid = processData
    .map(process => process.problems_uuid)
    .flat();

  const problems = await db
    .select({
      name: problem.name,
      uuid: problem.uuid,
    })
    .from(problem)
    .where(inArray(problem.uuid, problems_uuid.filter((uuid): uuid is string => typeof uuid === 'string')));

  const problemsMap = problems.reduce((acc, problem) => {
    acc[problem.uuid] = problem.name;
    return acc;
  }, {} as Record<string, string>);

  type ProcessWithExtras = typeof processData[number] & {
    problems_name?: string[];
  };

  (processData as ProcessWithExtras[]).forEach((process) => {
    process.problems_name = (process.problems_uuid || []).map(
      uuid => problemsMap[uuid],
    );
  });

  const formattedData = processData.map(item => ({
    uuid: item.uuid,
    diagnosis_uuid: item.diagnosis_uuid,
    section_uuid: item.section_uuid,
    remarks: item.remarks,
  }));

  const formattedDataWithId
    = resultIdData && resultIdData.length > 0
      ? {
          ...resultIdData[0],
          entry: formattedData,
        }
      : {
          entry: formattedData,
        };

  const responseData = entry ? formattedDataWithId : processData;

  return c.json(responseData || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const processPromise = db
    .select({
      id: process.id,
      process_id: sql`CONCAT('WP-', TO_CHAR(${process.created_at}, 'YY'), '-', TO_CHAR(${process.id}, 'FM0000'))`,
      uuid: process.uuid,
      section_uuid: process.section_uuid,
      diagnosis_uuid: process.diagnosis_uuid,
      engineer_uuid: process.engineer_uuid,
      engineer_name: engineer_user.name,
      problems_uuid: process.problems_uuid,
      problem_statement: process.problem_statement,
      status: process.status,
      status_update_date: process.status_update_date,
      is_transferred_for_qc: process.is_transferred_for_qc,
      is_ready_for_delivery: process.is_ready_for_delivery,
      warehouse_uuid: process.warehouse_uuid,
      rack_uuid: process.rack_uuid,
      floor_uuid: process.floor_uuid,
      box_uuid: process.box_uuid,
      created_by: process.created_by,
      created_by_name: users.name,
      created_at: process.created_at,
      updated_at: process.updated_at,
      remarks: process.remarks,
      index: process.index,
      branch_uuid: storeSchema.warehouse.branch_uuid,
      branch_name: storeSchema.branch.name,
    })
    .from(process)
    .leftJoin(users, eq(process.created_by, users.uuid))
    .leftJoin(section, eq(process.section_uuid, section.uuid))
    .leftJoin(
      storeSchema.warehouse,
      eq(process.warehouse_uuid, storeSchema.warehouse.uuid),
    )
    .leftJoin(
      storeSchema.rack,
      eq(process.rack_uuid, storeSchema.rack.uuid),
    )
    .leftJoin(
      storeSchema.floor,
      eq(process.floor_uuid, storeSchema.floor.uuid),
    )
    .leftJoin(storeSchema.box, eq(process.box_uuid, storeSchema.box.uuid))
    .leftJoin(engineer_user, eq(process.engineer_uuid, engineer_user.uuid))
    .leftJoin(
      storeSchema.branch,
      eq(storeSchema.warehouse.branch_uuid, storeSchema.branch.uuid),
    )
    .where(eq(process.uuid, uuid));

  const [data] = await processPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
