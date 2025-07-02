import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';
import { deleteFile, insertFile, updateFile } from '@/utils/upload_file';

import type {
  CreateRoute,
  // GetCanAccessRoute,
  GetOneRoute,
  ListRoute,
  // PatchCanAccessRoute,
  PatchRoute,
  // PatchStatusRoute,
  RemoveRoute,
  // SigninRoute,
} from './routes';

import { auth_user, department, designation, users } from '../schema';

// export const signin: AppRouteHandler<SigninRoute> = async (c: any) => {
//   const updates = c.req.valid('json');

//   if (Object.keys(updates).length === 0)
//     return ObjectNotFound(c);

//   const { email, pass } = await c.req.json();
//   const resultPromise = db.select({
//     email: users.email,
//     // pass: users.pass,
//     // status: users.status,
//     uuid: users.uuid,
//     name: users.name,
//     // can_access: users.can_access,
//     department_uuid: users.department_uuid,
//     designation_uuid: users.designation_uuid,
//     department_name: department.name,
//     designation_name: designation.name,
//   })
//     .from(users)
//     .leftJoin(department, eq(users.department_uuid, department.uuid))
//     .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
//     .where(eq(users.email, email));

//   const [data] = await resultPromise;

//   if (!data)
//     return DataNotFound(c);

//   if (!data.status) {
//     return c.json(
//       { message: 'Account is disabled' },
//       HSCode.UNAUTHORIZED,
//     );
//   }

//   const match = ComparePass(pass, data.pass);
//   if (!match) {
//     return c.json({ message: 'Email/Password does not match' }, HSCode.UNAUTHORIZED);
//   }

//   const now = Math.floor(Date.now() / 1000);
//   const payload: JWTPayload = {
//     uuid: data.uuid,
//     username: data.name,
//     email: data.email,
//     can_access: data.can_access,
//     exp: now + 60 * 60 * 24,
//   };

//   const token = await CreateToken(payload);

//   const user = {
//     uuid: data.uuid,
//     name: data.name,
//     department_name: data.department_name,
//     designation_name: data.designation_name,
//   };

//   const can_access = data.can_access;
//   return c.json({ payload, token, can_access, user }, HSCode.OK);
// };

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  // const value = c.req.valid('json');

  // const { pass } = await c.req.json();

  // value.pass = await HashPass(pass);

  const formData = await c.req.parseBody();

  // formData.pass = await HashPass(formData.pass);

  const image = formData.image;
  let imagePath = null;

  if (image)
    imagePath = await insertFile(image, 'public/users');

  const value = {
    uuid: formData.uuid,
    name: formData.name,
    department_uuid: formData.department_uuid,
    designation_uuid: formData.designation_uuid,
    office: formData.office,
    phone: formData.phone,
    email: formData.email,
    // pass: formData.pass,
    image: imagePath,
    created_at: formData.created_at,
    updated_at: formData.updated_at,
    // status: formData.status,
    // can_access: formData.can_access,
    remarks: formData.remarks,
  };

  // value.pass = await HashPass(value.pass);

  const [data] = await db.insert(users).values(value).returning({
    name: users.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const formData = await c.req.parseBody();

  // updates includes image then do it else exclude it
  if (formData.image && typeof formData.image === 'object') {
    // get user image name
    const userData = await db.query.users.findFirst({
      where(fields, operators) {
        return operators.eq(fields.uuid, uuid);
      },
    });

    if (userData && userData.image) {
      const imagePath = await updateFile(formData.image, userData.image, 'public/users');
      formData.image = imagePath;
    }
    else {
      const imagePath = await insertFile(formData.image, 'public/users');
      formData.image = imagePath;
    }
  }

  if (Object.keys(formData).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(users)
    .set(formData)
    .where(eq(users.uuid, uuid))
    .returning({
      name: users.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  // get user image name

  const userData = await db.query.users.findFirst({
    where(fields, operators) {
      return operators.eq(fields.uuid, uuid);
    },
  });

  if (userData && userData.image) {
    deleteFile(userData.image);
  }

  const [data] = await db.delete(users)
    .where(eq(users.uuid, uuid))
    .returning({
      name: users.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: users.uuid,
    name: users.name,
    department_uuid: users.department_uuid,
    designation_uuid: users.designation_uuid,
    department_name: department.name,
    designation_name: designation.name,
    office: users.office,
    phone: users.phone,
    email: users.email,
    image: users.image,
    created_at: users.created_at,
    updated_at: users.updated_at,
    status: auth_user.status,
    can_access: auth_user.can_access,
    remarks: users.remarks,
  })
    .from(users)
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(auth_user, eq(users.uuid, auth_user.user_uuid));

  const data = await resultPromise;

  return c.json(data || {}, HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: users.uuid,
    name: users.name,
    department_uuid: users.department_uuid,
    designation_uuid: users.designation_uuid,
    department_name: department.name,
    designation_name: designation.name,
    office: users.office,
    phone: users.phone,
    email: users.email,
    image: users.image,
    created_at: users.created_at,
    updated_at: users.updated_at,
    status: auth_user.status,
    can_access: auth_user.can_access,
    remarks: users.remarks,
  })
    .from(users)
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(auth_user, eq(users.uuid, auth_user.user_uuid))
    .where(eq(users.uuid, uuid));

  const [data] = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || null, HSCode.OK);
};

// export const getCanAccess: AppRouteHandler<GetCanAccessRoute> = async (c: any) => {
//   const { uuid } = c.req.valid('param');

//   const resultPromise = db.select({
//     can_access: users.can_access,
//   })
//     .from(users)
//     .where(eq(users.uuid, uuid));

//   const [data] = await resultPromise;

//   if (!data)
//     return DataNotFound(c);

//   return c.json(data || null, HSCode.OK);
// };

// export const patchCanAccess: AppRouteHandler<PatchCanAccessRoute> = async (c: any) => {
//   const { uuid } = c.req.valid('param');
//   const { can_access } = await c.req.json();

//   const [data] = await db.update(users)
//     .set({ can_access })
//     .where(eq(users.uuid, uuid))
//     .returning({
//       name: users.name,
//     });

//   if (!data)
//     return DataNotFound(c);

//   return c.json(createToast('update', data.name), HSCode.OK);
// };

// export const patchStatus: AppRouteHandler<PatchStatusRoute> = async (c: any) => {
//   const { uuid } = c.req.valid('param');
//   const { status } = await c.req.json();

//   const [data] = await db.update(users)
//     .set({ status })
//     .where(eq(users.uuid, uuid))
//     .returning({
//       name: users.name,
//     });

//   if (!data)
//     return DataNotFound(c);

//   return c.json(createToast('update', data.name), HSCode.OK);
// };
