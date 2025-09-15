import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { handleImagePatch } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile } from '@/utils/upload_file';

import type { CreateRoute, GetByEmployeeUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, employee_document, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
//   const value = c.req.valid('json');

  const formData = await c.req.parseBody();

  const file = formData.file;

  let filePath = null;

  if (file)
    filePath = file ? await insertFile(file, 'public/employee-document') : null;

  // const filePath = await insertFile(file, 'public/employee-document');

  const value = {
    uuid: formData.uuid,
    index: formData.index,
    employee_uuid: formData.employee_uuid,
    document_type: formData.document_type,
    description: formData.description,
    file: filePath,
    created_by: formData.created_by,
    created_at: formData.created_at,
    updated_at: formData.updated_at,
    remarks: formData.remarks,
  };

  const [data] = await db.insert(employee_document).values(value).returning({
    name: employee_document.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  //   const updates = c.req.valid('json');

  const formData = await c.req.parseBody();

  // Image Or File Handling
  const employeeDocumentData = await db.query.employee_document.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });

  formData.file = await handleImagePatch(formData.file, employeeDocumentData?.file ?? undefined, 'public/employee-document');

  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee_document)
    .set(formData)
    .where(eq(employee_document.uuid, uuid))
    .returning({
      name: employee_document.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get employeeDocument cover_image name

  const employeeDocumentData = await db.query.employee_document.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });

  if (employeeDocumentData && employeeDocumentData.file) {
    deleteFile(employeeDocumentData.file);
  }

  const [data] = await db.delete(employee_document)
    .where(eq(employee_document.uuid, uuid))
    .returning({
      name: employee_document.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employeeDocumentPromise = db
    .select({
      uuid: employee_document.uuid,
      index: employee_document.index,
      employee_uuid: employee_document.employee_uuid,
      employee_name: users.name,
      document_type: employee_document.document_type,
      description: employee_document.description,
      file: employee_document.file,
      created_by: employee_document.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_document.created_at,
      updated_at: employee_document.updated_at,
      remarks: employee_document.remarks,
    })
    .from(employee_document)
    .leftJoin(employee, eq(employee_document.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_document.created_by, createdByUser.uuid),
    )
    .orderBy(desc(employee_document.created_at));

  const data = await employeeDocumentPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employeeDocumentPromise = db
    .select({
      uuid: employee_document.uuid,
      index: employee_document.index,
      employee_uuid: employee_document.employee_uuid,
      employee_name: users.name,
      document_type: employee_document.document_type,
      description: employee_document.description,
      file: employee_document.file,
      created_by: employee_document.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_document.created_at,
      updated_at: employee_document.updated_at,
      remarks: employee_document.remarks,
    })
    .from(employee_document)
    .leftJoin(employee, eq(employee_document.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_document.created_by, createdByUser.uuid),
    )
    .where(eq(employee_document.uuid, uuid));

  const [data] = await employeeDocumentPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByEmployeeUuid: AppRouteHandler<GetByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const employeeDocumentPromise = db
    .select({
      uuid: employee_document.uuid,
      index: employee_document.index,
      employee_uuid: employee_document.employee_uuid,
      employee_name: users.name,
      document_type: employee_document.document_type,
      description: employee_document.description,
      file: employee_document.file,
      created_by: employee_document.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_document.created_at,
      updated_at: employee_document.updated_at,
      remarks: employee_document.remarks,
    })
    .from(employee_document)
    .leftJoin(employee, eq(employee_document.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_document.created_by, createdByUser.uuid),
    )
    .where(eq(employee_document.employee_uuid, employee_uuid));

  const data = await employeeDocumentPromise;

  return c.json(data || [], HSCode.OK);
};
