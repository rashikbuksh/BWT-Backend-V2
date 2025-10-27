import type { AppRouteHandler } from '@/lib/types';

import { and, count, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { handleImagePatch } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile } from '@/utils/upload_file';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute, SelectAllApplyLeaveWithPaginationRoute } from './routes';

import { apply_leave, department, designation, employee, leave_category, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const employeeUser = alias(users, 'employee_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const formData = await c.req.parseBody();

  const file = formData.file;
  let filePath = null;

  if (file)
    filePath = file ? await insertFile(file, 'hr/apply-leave') : null;

  const value = {
    uuid: formData.uuid,
    employee_uuid: formData.employee_uuid,
    leave_category_uuid: formData.leave_category_uuid,
    year: formData.year,
    type: formData.type,
    from_date: formData.from_date,
    to_date: formData.to_date,
    reason: formData.reason,
    file: filePath,
    created_by: formData.created_by,
    created_at: formData.created_at,
    updated_at: formData.updated_at,
    remarks: formData.remarks,
    approval: formData.approval,
  };

  const [data] = await db.insert(apply_leave).values({
    ...value,
  }).returning({
    name: apply_leave.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const formData = await c.req.parseBody();

  // Image Or File Handling
  const applyLeavePromise = db
    .select({
      file: apply_leave.file,
    })
    .from(apply_leave)
    .where(eq(apply_leave.uuid, uuid));

  const [applyLeaveData] = await applyLeavePromise;

  formData.file = await handleImagePatch(formData.file, applyLeaveData?.file ?? undefined, 'hr/apply-leave');

  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(apply_leave)
    .set(formData)
    .where(eq(apply_leave.uuid, uuid))
    .returning({
      name: apply_leave.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get applyLeave file name
  const applyLeavePromise = db
    .select({
      file: apply_leave.file,
    })
    .from(apply_leave)
    .where(eq(apply_leave.uuid, uuid));

  const [applyLeaveData] = await applyLeavePromise;

  if (applyLeaveData && applyLeaveData.file) {
    deleteFile(applyLeaveData.file);
  }

  const [data] = await db.delete(apply_leave)
    .where(eq(apply_leave.uuid, uuid))
    .returning({
      name: apply_leave.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { employee_uuid, approval } = c.req.valid('query');

  const apply_leavePromise = db
    .select({
      uuid: apply_leave.uuid,
      employee_uuid: apply_leave.employee_uuid,
      employee_name: employeeUser.name,
      leave_category_uuid: apply_leave.leave_category_uuid,
      leave_category_name: leave_category.name,
      year: apply_leave.year,
      type: apply_leave.type,
      from_date: apply_leave.from_date,
      to_date: apply_leave.to_date,
      reason: apply_leave.reason,
      file: apply_leave.file,
      created_by: apply_leave.created_by,
      created_by_name: createdByUser.name,
      created_at: apply_leave.created_at,
      updated_at: apply_leave.updated_at,
      remarks: apply_leave.remarks,
      approval: apply_leave.approval,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: employeeUser.department_uuid,
      designation_uuid: employeeUser.designation_uuid,
      department_name: department.department,
      designation_name: designation.designation,
    })
    .from(apply_leave)
    .leftJoin(
      leave_category,
      eq(apply_leave.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(employee, eq(apply_leave.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .leftJoin(
      createdByUser,
      eq(apply_leave.created_by, createdByUser.uuid),
    )
    .orderBy(desc(apply_leave.created_at));

  const filters = [];

  if (employee_uuid) {
    filters.push(eq(apply_leave.employee_uuid, employee_uuid));
  }

  if (approval) {
    filters.push(eq(apply_leave.approval, approval));
  }

  if (filters.length > 0) {
    apply_leavePromise.where(and(...filters));
  }
  const data = await apply_leavePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const apply_leavePromise = db
    .select({
      uuid: apply_leave.uuid,
      employee_uuid: apply_leave.employee_uuid,
      employee_name: employeeUser.name,
      leave_category_uuid: apply_leave.leave_category_uuid,
      leave_category_name: leave_category.name,
      year: apply_leave.year,
      type: apply_leave.type,
      from_date: apply_leave.from_date,
      to_date: apply_leave.to_date,
      reason: apply_leave.reason,
      file: apply_leave.file,
      created_by: apply_leave.created_by,
      created_by_name: createdByUser.name,
      created_at: apply_leave.created_at,
      updated_at: apply_leave.updated_at,
      remarks: apply_leave.remarks,
      approval: apply_leave.approval,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: employeeUser.department_uuid,
      designation_uuid: employeeUser.designation_uuid,
      department_name: department.department,
      designation_name: designation.designation,
    })
    .from(apply_leave)
    .leftJoin(
      leave_category,
      eq(apply_leave.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(employee, eq(apply_leave.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .leftJoin(
      createdByUser,
      eq(apply_leave.created_by, createdByUser.uuid),
    )
    .where(eq(apply_leave.uuid, uuid));

  const [data] = await apply_leavePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const selectAllApplyLeaveWithPagination: AppRouteHandler<SelectAllApplyLeaveWithPaginationRoute> = async (c: any) => {
  let {
    page = 1,
    limit = 10,
    approval,
    employee_uuid,
    leave_category_uuid,
    from_date,
    to_date,
    year,
  } = c.req.valid('query');

  page = Number.parseInt(page, 10);
  limit = Number.parseInt(limit, 10);
  const offset = (page - 1) * limit;

  // Collect filters
  const filters = [];
  if (approval)
    filters.push(eq(apply_leave.approval, approval));
  if (employee_uuid)
    filters.push(eq(apply_leave.employee_uuid, employee_uuid));
  if (leave_category_uuid)
    filters.push(eq(apply_leave.leave_category_uuid, leave_category_uuid));
  if (from_date)
    filters.push(eq(apply_leave.from_date, from_date));
  if (to_date)
    filters.push(eq(apply_leave.to_date, to_date));
  if (year)
    filters.push(eq(apply_leave.year, year));

  const resultPromise = db
    .select({
      uuid: apply_leave.uuid,
      employee_uuid: apply_leave.employee_uuid,
      employee_name: employeeUser.name,
      leave_category_uuid: apply_leave.leave_category_uuid,
      leave_category_name: leave_category.name,
      year: apply_leave.year,
      type: apply_leave.type,
      from_date: apply_leave.from_date,
      to_date: apply_leave.to_date,
      reason: apply_leave.reason,
      file: apply_leave.file,
      created_by: apply_leave.created_by,
      created_by_name: createdByUser.name,
      created_at: apply_leave.created_at,
      updated_at: apply_leave.updated_at,
      remarks: apply_leave.remarks,
      approval: apply_leave.approval,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: employeeUser.department_uuid,
      designation_uuid: employeeUser.designation_uuid,
      department_name: department.department,
      designation_name: designation.designation,
    })
    .from(apply_leave)
    .leftJoin(employee, eq(apply_leave.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .leftJoin(
      leave_category,
      eq(apply_leave.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(createdByUser, eq(apply_leave.created_by, createdByUser.uuid))
    .orderBy(desc(apply_leave.created_at))
    .limit(limit)
    .offset(offset);

  if (filters.length) {
    resultPromise.where(filters.length === 1 ? filters[0] : filters.reduce((prev, curr) => sql`${prev} AND ${curr}`));
  }

  const data = await resultPromise;

  const countPromise = db
    .select({ count: count(apply_leave.uuid) })
    .from(apply_leave);

  if (filters.length) {
    countPromise.where(filters.length === 1 ? filters[0] : filters.reduce((prev, curr) => sql`${prev} AND ${curr}`));
  }

  const countResult = await countPromise;
  const totalRecords = Number(countResult[0].count);

  const pagination = {
    total_record: totalRecords,
    current_page: Number(page),
    total_page: Math.ceil(totalRecords / limit),
    next_page:
          Number(page) + 1 > Math.ceil(totalRecords / limit)
            ? null
            : Number(page) + 1,
    prev_page: Number(page) - 1 <= 0 ? null : Number(page) - 1,
  };

  const response = {
    pagination,
    data,
  };

  return c.json(response, HSCode.OK);
};
