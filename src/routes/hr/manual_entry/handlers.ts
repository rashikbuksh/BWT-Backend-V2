import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { constructSelectAllQuery } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, ManualEntryByEmployeeRoute, PatchRoute, RemoveRoute, SelectAllManualEntryWithPaginationFieldVisitRoute } from './routes';

import { department, designation, device_list, employee, manual_entry, users } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const createdByDesignation = alias(designation, 'createdByDesignation');
const createdByDepartment = alias(department, 'createdByDepartment');
const createdByEmployee = alias(employee, 'createdByEmployee');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(manual_entry).values(value).returning({
    name: manual_entry.type,
  });

  return c.json(createToast('create', data?.name ?? ''), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(manual_entry)
    .set(updates)
    .where(eq(manual_entry.uuid, uuid))
    .returning({
      name: manual_entry.type,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data?.name ?? ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(manual_entry)
    .where(eq(manual_entry.uuid, uuid))
    .returning({
      name: manual_entry.type,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data?.name ?? ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { employee_uuid, type, approval } = c.req.valid('query');

  const resultPromise = db
    .select({
      uuid: manual_entry.uuid,
      employee_uuid: manual_entry.employee_uuid,
      type: manual_entry.type,
      entry_time: manual_entry.entry_time,
      exit_time: manual_entry.exit_time,
      reason: manual_entry.reason,
      area: manual_entry.area,
      device_list_uuid: manual_entry.device_list_uuid,
      device_name: device_list.name,
      employee_name: users.name,
      created_at: manual_entry.created_at,
      updated_at: manual_entry.updated_at,
      created_by: manual_entry.created_by,
      created_by_name: createdByUser.name,
      remarks: manual_entry.remarks,
      approval: manual_entry.approval,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: users.department_uuid,
      department_name: department.department,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
    })
    .from(manual_entry)
    .leftJoin(device_list, eq(manual_entry.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(manual_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(createdByUser, eq(manual_entry.created_by, createdByUser.uuid))
    .leftJoin(
      createdByEmployee,
      eq(createdByUser.uuid, createdByEmployee.user_uuid),
    )
    .orderBy(desc(manual_entry.created_at));

  const filters = [];

  if (employee_uuid) {
    filters.push(eq(manual_entry.employee_uuid, employee_uuid));
  }

  if (type) {
    if (type === 'others') {
      filters.push(or(
        eq(manual_entry.type, 'field_visit'),
        eq(manual_entry.type, 'manual_entry'),
      ));
    }
    else {
      filters.push(eq(manual_entry.type, type));
    }
  }
  if (approval) {
    filters.push(eq(manual_entry.approval, approval));
  }

  if (filters.length > 0) {
    resultPromise.where(and(...filters));
  }

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db
    .select({
      uuid: manual_entry.uuid,
      employee_uuid: manual_entry.employee_uuid,
      type: manual_entry.type,
      entry_time: manual_entry.entry_time,
      exit_time: manual_entry.exit_time,
      reason: manual_entry.reason,
      area: manual_entry.area,
      device_list_uuid: manual_entry.device_list_uuid,
      device_name: device_list.name,
      employee_name: users.name,
      created_at: manual_entry.created_at,
      updated_at: manual_entry.updated_at,
      created_by: manual_entry.created_by,
      created_by_name: createdByUser.name,
      remarks: manual_entry.remarks,
      approval: manual_entry.approval,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: employee.department_uuid,
      department_name: department.department,
      designation_uuid: employee.designation_uuid,
      designation_name: designation.designation,
    })
    .from(manual_entry)
    .leftJoin(device_list, eq(manual_entry.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(manual_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(createdByUser, eq(manual_entry.created_by, createdByUser.uuid))
    .leftJoin(
      createdByEmployee,
      eq(createdByUser.uuid, createdByEmployee.user_uuid),
    )
    .where(eq(manual_entry.uuid, uuid));

  const [data] = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const manualEntryByEmployee: AppRouteHandler<ManualEntryByEmployeeRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');
  const { field_visit_uuid, type } = c.req.valid('query');
  // console.log('employee_uuid', employee_uuid);

  const manual_entryPromise = db
    .select({
      uuid: manual_entry.uuid,
      employee_uuid: manual_entry.employee_uuid,
      employee_name: users.name,
      department_uuid: users.department_uuid,
      department_name: department.department,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
      type: manual_entry.type,
      entry_time: manual_entry.entry_time,
      exit_time: manual_entry.exit_time,
      reason: manual_entry.reason,
      area: manual_entry.area,
      created_by: manual_entry.created_by,
      created_by_name: createdByUser.name,
      created_by_designation_name: createdByDesignation.designation,
      created_by_department_name: createdByDepartment.department,
      created_at: manual_entry.created_at,
      updated_at: manual_entry.updated_at,
      remarks: manual_entry.remarks,
      device_list_uuid: manual_entry.device_list_uuid,
      device_list_name: device_list.name,
      approval: manual_entry.approval,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      created_by_start_date: createdByEmployee.start_date,
      created_by_profile_picture: createdByEmployee.profile_picture,

    })
    .from(manual_entry)
    .leftJoin(employee, eq(manual_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(manual_entry.created_by, createdByUser.uuid),
    )
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(createdByDesignation, eq(createdByUser.designation_uuid, createdByDesignation.uuid))
    .leftJoin(createdByDepartment, eq(createdByUser.department_uuid, createdByDepartment.uuid))
    .leftJoin(createdByEmployee, eq(createdByUser.uuid, createdByEmployee.user_uuid))
    .leftJoin(
      device_list,
      eq(manual_entry.device_list_uuid, device_list.uuid),
    )
    .where(
      and(
        eq(manual_entry.employee_uuid, employee_uuid),
        type
          ? eq(manual_entry.type, type)
          : eq(manual_entry.type, 'field_visit'),
        ...(field_visit_uuid
          ? [eq(manual_entry.uuid, field_visit_uuid)]
          : []),
      ),
    )
    .orderBy(desc(manual_entry.created_at));

  if (!type) {
    manual_entryPromise.limit(5);
  }

  const data = await manual_entryPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || [], HSCode.OK);
};

export const selectAllManualEntryWithPaginationFieldVisit: AppRouteHandler<SelectAllManualEntryWithPaginationFieldVisitRoute> = async (c: any) => {
  const { approval, is_pagination, field_name, field_value } = c.req.valid('query');

  const resultPromise = db
    .select({
      uuid: manual_entry.uuid,
      employee_uuid: manual_entry.employee_uuid,
      employee_name: users.name,
      type: manual_entry.type,
      entry_time: manual_entry.entry_time,
      exit_time: manual_entry.exit_time,
      reason: manual_entry.reason,
      area: manual_entry.area,
      created_by: manual_entry.created_by,
      created_by_name: createdByUser.name,
      created_at: manual_entry.created_at,
      updated_at: manual_entry.updated_at,
      remarks: manual_entry.remarks,
      department_uuid: users.department_uuid,
      department_name: department.department,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
      device_list_uuid: manual_entry.device_list_uuid,
      device_list_name: device_list.name,
      approval: manual_entry.approval,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,

    })
    .from(manual_entry)
    .leftJoin(employee, eq(manual_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(
      createdByUser,
      eq(manual_entry.created_by, createdByUser.uuid),
    )
    .leftJoin(
      device_list,
      eq(manual_entry.device_list_uuid, device_list.uuid),
    );

  if (approval) {
    resultPromise.where(
      and(
        eq(manual_entry.type, 'field_visit'),
        eq(manual_entry.approval, approval),
      ),
    );
  }
  else {
    resultPromise.where(eq(manual_entry.type, 'field_visit'));
  }

  resultPromise.orderBy(desc(manual_entry.created_at));

  const page = Number(c.req.query.page) || 1;
  const limit = Number(c.req.query.limit) || 10;

  // const resultPromiseForCount = await resultPromise;

  const baseQuery
    = is_pagination === 'true'
      ? constructSelectAllQuery({
          baseQuery: resultPromise,
          params: c.req.valid('query'),
          defaultSortField: 'created_at',
          additionalSearchFields: [users.name.name],
          searchFieldNames: field_name,
          field_value,
        })
      : resultPromise;

  const data = await baseQuery;

  const pagination
    = is_pagination === 'true'
      ? {
          total_record: data.length,
          current_page: Number(page),
          total_page: Math.ceil(
            data.length / limit,
          ),
          next_page:
                page + 1
                > Math.ceil(data.length / limit)
                  ? null
                  : page + 1,
          prev_page: page - 1 <= 0 ? null : page - 1,
        }
      : null;

  const response
    = is_pagination === 'true'
      ? {
          data,
          pagination,
        }
      : data;

  return c.json(response, HSCode.OK);
};
