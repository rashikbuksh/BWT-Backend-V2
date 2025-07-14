import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { box, branch, floor, rack, warehouse } from '@/routes/store/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { diagnosis, info, order, problem } from '../schema';

const info_user = alias(users, 'info_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(diagnosis).values(value).returning({
    name: diagnosis.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(diagnosis)
    .set(updates)
    .where(eq(diagnosis.uuid, uuid))
    .returning({
      name: diagnosis.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(diagnosis)
    .where(eq(diagnosis.uuid, uuid))
    .returning({
      name: diagnosis.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: diagnosis.uuid,
    id: diagnosis.id,
    diagnosis_id: sql`CONCAT('WD', TO_CHAR(${diagnosis.created_at}, 'YY'), '-', TO_CHAR(${diagnosis.id}, 'FM0000'))`,
    order_uuid: diagnosis.order_uuid,
    order_id: sql`CONCAT('WO', TO_CHAR(${order.created_at}, 'YY'), '-', TO_CHAR(${order.id}, 'FM0000'))`,
    engineer_uuid: diagnosis.engineer_uuid,
    problems_uuid: diagnosis.problems_uuid,
    problem_statement: diagnosis.problem_statement,
    status: diagnosis.status,
    status_update_date: diagnosis.status_update_date,
    proposed_cost: PG_DECIMAL_TO_FLOAT(diagnosis.proposed_cost),
    is_proceed_to_repair: diagnosis.is_proceed_to_repair,
    created_by: diagnosis.created_by,
    created_by_name: users.name,
    created_at: diagnosis.created_at,
    updated_at: diagnosis.updated_at,
    remarks: diagnosis.remarks,
    warehouse_uuid: order.warehouse_uuid,
    warehouse_name: warehouse.name,
    rack_uuid: order.rack_uuid,
    rack_name: rack.name,
    floor_uuid: order.floor_uuid,
    floor_name: floor.name,
    box_uuid: order.box_uuid,
    box_name: box.name,
    is_diagnosis_need: order.is_diagnosis_need,
    customer_problem_statement: diagnosis.customer_problem_statement,
    customer_remarks: diagnosis.customer_remarks,
    info_uuid: order.info_uuid,
    user_uuid: info.user_uuid,
    user_name: info_user.name,
    user_phone: info_user.phone,
    info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
    branch_uuid: warehouse.branch_uuid,
    branch_name: branch.name,
    order_problems_uuid: order.problems_uuid,
    order_problem_statement: order.problem_statement,
  })
    .from(diagnosis)
    .leftJoin(users, eq(diagnosis.created_by, users.uuid))
    .leftJoin(order, eq(diagnosis.order_uuid, order.uuid))
    .leftJoin(warehouse, eq(order.warehouse_uuid, warehouse.uuid))
    .leftJoin(rack, eq(order.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(order.floor_uuid, floor.uuid))
    .leftJoin(box, eq(order.box_uuid, box.uuid))
    .leftJoin(info, eq(order.info_uuid, info.uuid))
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .leftJoin(info_user, eq(info.user_uuid, info_user.uuid))
    .where(eq(diagnosis.is_proceed_to_repair, false))
    .orderBy(desc(diagnosis.created_at));

  const data = await resultPromise;

  // Gather all unique UUIDs from both diagnosis.problems_uuid and order_problems_uuid
  const diagnosisProblemsUUIDs = data
    .filter(d => d.problems_uuid != null)
    .map(d => d.problems_uuid)
    .flat();

  const orderProblemsUUIDs = data
    .filter(d => d.order_problems_uuid != null)
    .map(d => d.order_problems_uuid)
    .flat();

  const allProblemsUUIDs = Array.from(
    new Set([...diagnosisProblemsUUIDs, ...orderProblemsUUIDs]),
  ).filter((uuid): uuid is string => typeof uuid === 'string');

  let problemsMap: Record<string, string> = {};

  if (allProblemsUUIDs.length > 0) {
    const problems = await db
      .select({
        name: problem.name,
        uuid: problem.uuid,
      })
      .from(problem)
      .where(inArray(problem.uuid, allProblemsUUIDs));

    problemsMap = problems.reduce((acc, problem) => {
      acc[problem.uuid] = problem.name;
      return acc;
    }, {} as Record<string, string>);
  }

  // Define type for diagnosis with extras
  type DiagnosisWithExtras = typeof data[number] & {
    diagnosis_problems_name?: string[];
    order_problems_name?: string[];
  };

  (data as DiagnosisWithExtras[]).forEach((diagnosis) => {
    // diagnosis_problems_name
    if (
      diagnosis.problems_uuid
      && Array.isArray(diagnosis.problems_uuid)
    ) {
      diagnosis.diagnosis_problems_name = diagnosis.problems_uuid.map(
        uuid => problemsMap[uuid] || uuid,
      );
    }
    else {
      diagnosis.diagnosis_problems_name = [];
    }

    // order_problems_name
    if (
      diagnosis.order_problems_uuid
      && Array.isArray(diagnosis.order_problems_uuid)
    ) {
      diagnosis.order_problems_name
        = diagnosis.order_problems_uuid.map(
          uuid => problemsMap[uuid] || uuid,
        );
    }
    else {
      diagnosis.order_problems_name = [];
    }
  });

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db
    .select({
      uuid: diagnosis.uuid,
      id: diagnosis.id,
      diagnosis_id: sql`CONCAT('WD', TO_CHAR(${diagnosis.created_at}, 'YY'), TO_CHAR(${diagnosis.id}, 'FM0000'))`,
      order_uuid: diagnosis.order_uuid,
      order_id: sql`CONCAT('WO', TO_CHAR(${order.created_at}, 'YY'), '-', TO_CHAR(${order.id}, 'FM0000'))`,
      engineer_uuid: diagnosis.engineer_uuid,
      problems_uuid: diagnosis.problems_uuid,
      problem_statement: diagnosis.problem_statement,
      status: diagnosis.status,
      status_update_date: diagnosis.status_update_date,
      proposed_cost: PG_DECIMAL_TO_FLOAT(diagnosis.proposed_cost),
      is_proceed_to_repair: diagnosis.is_proceed_to_repair,
      created_by: diagnosis.created_by,
      created_by_name: users.name,
      created_at: diagnosis.created_at,
      updated_at: diagnosis.updated_at,
      remarks: diagnosis.remarks,
      warehouse_uuid: order.warehouse_uuid,
      warehouse_name: warehouse.name,
      rack_uuid: order.rack_uuid,
      rack_name: rack.name,
      floor_uuid: order.floor_uuid,
      floor_name: floor.name,
      box_uuid: order.box_uuid,
      box_name: box.name,
      is_diagnosis_need: order.is_diagnosis_need,
      customer_problem_statement: diagnosis.customer_problem_statement,
      customer_remarks: diagnosis.customer_remarks,
      info_uuid: order.info_uuid,
      user_uuid: info.user_uuid,
      user_name: info_user.name,
      user_phone: info_user.phone,
      info_id: sql`CONCAT('WI', TO_CHAR(${info.created_at}::timestamp, 'YY'), '-', TO_CHAR(${info.id}, 'FM0000'))`,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
      order_problems_uuid: order.problems_uuid,
      order_problem_statement: order.problem_statement,
    })
    .from(diagnosis)
    .leftJoin(users, eq(diagnosis.created_by, users.uuid))
    .leftJoin(order, eq(diagnosis.order_uuid, order.uuid))
    .leftJoin(warehouse, eq(order.warehouse_uuid, warehouse.uuid))
    .leftJoin(rack, eq(order.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(order.floor_uuid, floor.uuid))
    .leftJoin(box, eq(order.box_uuid, box.uuid))
    .leftJoin(info, eq(order.info_uuid, info.uuid))
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .leftJoin(info_user, eq(info.user_uuid, info_user.uuid))
    .where(eq(diagnosis.uuid, uuid));

  const [data] = await resultPromise;

  if (!data)
    return DataNotFound(c);

  // Gather all unique UUIDs from both diagnosis.problems_uuid and order_problems_uuid
  const diagnosisProblemsUUIDs = data.problems_uuid ? [data.problems_uuid].flat() : [];
  const orderProblemsUUIDs = data.order_problems_uuid ? [data.order_problems_uuid].flat() : [];

  const allProblemsUUIDs = Array.from(
    new Set([...diagnosisProblemsUUIDs, ...orderProblemsUUIDs]),
  ).filter((uuid): uuid is string => typeof uuid === 'string');

  let problemsMap: Record<string, string> = {};

  if (allProblemsUUIDs.length > 0) {
    const problems = await db
      .select({
        name: problem.name,
        uuid: problem.uuid,
      })
      .from(problem)
      .where(inArray(problem.uuid, allProblemsUUIDs));

    problemsMap = problems.reduce((acc, problem) => {
      acc[problem.uuid] = problem.name;
      return acc;
    }, {} as Record<string, string>);
  }

  // Define type for diagnosis with extras
  type DiagnosisWithExtras = typeof data & {
    diagnosis_problems_name?: string[];
    order_problems_name?: string[];
  };

  const diagnosisWithExtras = data as DiagnosisWithExtras;

  // diagnosis_problems_name
  if (
    diagnosisWithExtras.problems_uuid
    && Array.isArray(diagnosisWithExtras.problems_uuid)
  ) {
    diagnosisWithExtras.diagnosis_problems_name = diagnosisWithExtras.problems_uuid.map(
      uuid => problemsMap[uuid] || uuid,
    );
  }
  else {
    diagnosisWithExtras.diagnosis_problems_name = [];
  }

  // order_problems_name
  if (
    diagnosisWithExtras.order_problems_uuid
    && Array.isArray(diagnosisWithExtras.order_problems_uuid)
  ) {
    diagnosisWithExtras.order_problems_name
      = diagnosisWithExtras.order_problems_uuid.map(
        uuid => problemsMap[uuid] || uuid,
      );
  }
  else {
    diagnosisWithExtras.order_problems_name = [];
  }

  return c.json(diagnosisWithExtras, HSCode.OK);
};
