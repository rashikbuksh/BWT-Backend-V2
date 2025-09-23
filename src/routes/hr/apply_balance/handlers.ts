import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { handleImagePatch } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile } from '@/utils/upload_file';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { apply_balance, employee, leave_category, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const formData = await c.req.parseBody();

  const file = formData.file;
  let filePath = null;

  if (file)
    filePath = file ? await insertFile(file, 'hr/apply-balance') : null;

  const value = {
    uuid: formData.uuid,
    employee_uuid: formData.employee_uuid,
    leave_category_uuid: formData.leave_category_uuid,
    year: formData.year,
    days_count: formData.days_count,
    from_date: formData.from_date,
    reason: formData.reason,
    file: filePath,
    created_by: formData.created_by,
    created_at: formData.created_at,
    updated_at: formData.updated_at,
    remarks: formData.remarks,
    approval: formData.approval,
  };

  const [data] = await db.insert(apply_balance).values(value).returning({
    name: apply_balance.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const formData = await c.req.parseBody();

  // Image Or File Handling
  const applyBalancePromise = db
    .select({
      file: apply_balance.file,
    })
    .from(apply_balance)
    .where(eq(apply_balance.uuid, uuid));

  const [applyBalanceData] = await applyBalancePromise;

  formData.file = await handleImagePatch(formData.file, applyBalanceData?.file ?? undefined, 'hr/apply-balance');

  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(apply_balance)
    .set(formData)
    .where(eq(apply_balance.uuid, uuid))
    .returning({
      name: apply_balance.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get applyBalance file name
  const applyBalancePromise = db
    .select({
      file: apply_balance.file,
    })
    .from(apply_balance)
    .where(eq(apply_balance.uuid, uuid));

  const [applyBalanceData] = await applyBalancePromise;

  if (applyBalanceData && applyBalanceData.file) {
    deleteFile(applyBalanceData.file);
  }

  const [data] = await db.delete(apply_balance)
    .where(eq(apply_balance.uuid, uuid))
    .returning({
      name: apply_balance.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const applyBalancePromise = db
    .select({
      uuid: apply_balance.uuid,
      employee_uuid: apply_balance.employee_uuid,
      employee_name: users.name,
      leave_category_uuid: apply_balance.leave_category_uuid,
      leave_category_name: leave_category.name,
      year: apply_balance.year,
      days_count: apply_balance.days_count,
      reason: apply_balance.reason,
      file: apply_balance.file,
      created_by: apply_balance.created_by,
      created_by_name: createdByUser.name,
      created_at: apply_balance.created_at,
      updated_at: apply_balance.updated_at,
      remarks: apply_balance.remarks,
    })
    .from(apply_balance)
    .leftJoin(employee, eq(apply_balance.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      leave_category,
      eq(apply_balance.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(
      createdByUser,
      eq(apply_balance.created_by, createdByUser.uuid),
    )
    .orderBy(desc(apply_balance.created_at));

  const data = await applyBalancePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const applyBalancePromise = db
    .select({
      uuid: apply_balance.uuid,
      employee_uuid: apply_balance.employee_uuid,
      employee_name: users.name,
      leave_category_uuid: apply_balance.leave_category_uuid,
      leave_category_name: leave_category.name,
      year: apply_balance.year,
      days_count: apply_balance.days_count,
      reason: apply_balance.reason,
      file: apply_balance.file,
      created_by: apply_balance.created_by,
      created_by_name: createdByUser.name,
      created_at: apply_balance.created_at,
      updated_at: apply_balance.updated_at,
      remarks: apply_balance.remarks,
    })
    .from(apply_balance)
    .leftJoin(employee, eq(apply_balance.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      leave_category,
      eq(apply_balance.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(
      createdByUser,
      eq(apply_balance.created_by, createdByUser.uuid),
    )
    .where(eq(apply_balance.uuid, uuid));

  const [data] = await applyBalancePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
