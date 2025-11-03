import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { department, designation, employee, festival, festival_bonus, fiscal_year, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');
const employeeUser = alias(users, 'employee_user');

// export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
//   const value = c.req.valid('json');

//   const [data] = await db.insert(festival_bonus).values(value).returning({
//     name: festival_bonus.uuid,
//   });

//   return c.json(createToast('create', data.name), HSCode.OK);
// };

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const employeeData = await db.select().from(employee);

  const value = c.req.valid('json');
  const rows = Array.isArray(value) ? value : [value];

  if (rows.length === 0)
    return ObjectNotFound(c);

  if (rows.length > employeeData.length) {
    return c.json(
      {
        toastType: 'error',
        message: 'Cannot create more festival bonuses than existing employees',
      },
      HSCode.UNPROCESSABLE_ENTITY,
    );
  }

  if (rows.length < employeeData.length) {
    return c.json(
      {
        toastType: 'error',
        message: 'Cannot create fewer festival bonuses than existing employees',
      },
      HSCode.UNPROCESSABLE_ENTITY,
    );
  }

  const inserted = await db.insert(festival_bonus).values(rows).returning({
    name: festival_bonus.uuid,
  });

  if (!inserted || inserted.length === 0)
    return DataNotFound(c);

  if (inserted.length === 1) {
    return c.json(createToast('create', inserted[0].name), HSCode.OK);
  }

  const uuids = inserted.map((r: any) => r.name);
  const toast = createToast('create', `${uuids.length} employee festival bonuses`);
  return c.json({ ...toast, created_count: uuids.length, created: uuids }, HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(festival_bonus)
    .set(updates)
    .where(eq(festival_bonus.uuid, uuid))
    .returning({
      name: festival_bonus.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(festival_bonus)
    .where(eq(festival_bonus.uuid, uuid))
    .returning({
      name: festival_bonus.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { fiscal_year_uuid } = c.req.valid('query');
  const festivalBonusPromise = db
    .select({
      uuid: festival_bonus.uuid,
      employee_uuid: festival_bonus.employee_uuid,
      employee_name: employeeUser.name,
      department_name: department.department,
      designation_name: designation.designation,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      festival_uuid: festival_bonus.festival_uuid,
      festival_name: festival.name,
      festival_religion: festival.religion,
      fiscal_year_uuid: festival_bonus.fiscal_year_uuid,
      fiscal_year_year: fiscal_year.year,
      fiscal_year_from_month: fiscal_year.from_month,
      fiscal_year_to_month: fiscal_year.to_month,
      fiscal_year_challan_info: fiscal_year.challan_info,
      special_consideration: PG_DECIMAL_TO_FLOAT(festival_bonus.special_consideration),
      net_payable: PG_DECIMAL_TO_FLOAT(festival_bonus.net_payable),
      created_by: festival_bonus.created_by,
      created_by_name: createdByUser.name,
      created_at: festival_bonus.created_at,
      updated_by: festival_bonus.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: festival_bonus.updated_at,
      remarks: festival_bonus.remarks,
    })
    .from(festival_bonus)
    .leftJoin(employee, eq(festival_bonus.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employeeUser.department_uuid, department.uuid))
    .leftJoin(designation, eq(employeeUser.designation_uuid, designation.uuid))
    .leftJoin(festival, eq(festival_bonus.festival_uuid, festival.uuid))
    .leftJoin(fiscal_year, eq(festival_bonus.fiscal_year_uuid, fiscal_year.uuid))
    .leftJoin(createdByUser, eq(festival_bonus.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(festival_bonus.updated_by, updatedByUser.uuid))
    .orderBy(desc(festival_bonus.created_at));

  if (fiscal_year_uuid) {
    festivalBonusPromise.where(
      eq(festival_bonus.fiscal_year_uuid, fiscal_year_uuid),
    );
  }

  const data = await festivalBonusPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const festivalBonusPromise = db
    .select({
      uuid: festival_bonus.uuid,
      employee_uuid: festival_bonus.employee_uuid,
      employee_name: employeeUser.name,
      department_name: department.department,
      designation_name: designation.designation,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      festival_uuid: festival_bonus.festival_uuid,
      festival_name: festival.name,
      festival_religion: festival.religion,
      fiscal_year_uuid: festival_bonus.fiscal_year_uuid,
      fiscal_year_year: fiscal_year.year,
      fiscal_year_from_month: fiscal_year.from_month,
      fiscal_year_to_month: fiscal_year.to_month,
      fiscal_year_challan_info: fiscal_year.challan_info,
      special_consideration: PG_DECIMAL_TO_FLOAT(festival_bonus.special_consideration),
      net_payable: PG_DECIMAL_TO_FLOAT(festival_bonus.net_payable),
      created_by: festival_bonus.created_by,
      created_by_name: createdByUser.name,
      created_at: festival_bonus.created_at,
      updated_by: festival_bonus.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: festival_bonus.updated_at,
      remarks: festival_bonus.remarks,
    })
    .from(festival_bonus)
    .leftJoin(employee, eq(festival_bonus.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employeeUser.department_uuid, department.uuid))
    .leftJoin(designation, eq(employeeUser.designation_uuid, designation.uuid))
    .leftJoin(festival, eq(festival_bonus.festival_uuid, festival.uuid))
    .leftJoin(fiscal_year, eq(festival_bonus.fiscal_year_uuid, fiscal_year.uuid))
    .leftJoin(createdByUser, eq(festival_bonus.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(festival_bonus.updated_by, updatedByUser.uuid))
    .where(eq(festival_bonus.uuid, uuid));

  const [data] = await festivalBonusPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
