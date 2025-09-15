import type { AppRouteHandler } from '@/lib/types';
import type { JWTPayload } from 'hono/utils/jwt/types';

import { and, desc, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { ComparePass, CreateToken, HashPass, isHashedPassword } from '@/middlewares/auth';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type {
  CreateRoute,
  GetCanAccessRoute,
  GetCommonUserRoute,
  GetOneRoute,
  // GetUserByAuthUserIdRoute,
  ListRoute,
  LoginRoute,
  PatchCanAccessRoute,
  PatchRatingPriceRoute,
  PatchRoute,
  PatchUserPasswordRoute,
  PatchUserStatusRoute,
  RemoveRoute,
} from './routes';

import { department, designation, employee, users } from '../schema';

export const loginUser: AppRouteHandler<LoginRoute> = async (c: any) => {
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const { email, pass } = await c.req.json();

  const userPromise = db
    .select({
      uuid: users.uuid,
      name: users.name,
      email: users.email,
      pass: users.pass,
      can_access: users.can_access,
      designation_uuid: users.designation_uuid,
      department_uuid: users.department_uuid,
      ext: users.ext,
      phone: users.phone,
      created_at: users.created_at,
      updated_at: users.updated_at,
      status: users.status,
      remarks: users.remarks,
      designation: designation.designation,
      department: department.department,
      employee_uuid: employee.uuid,
      user_type: users.user_type,
      where_they_find_us: users.where_they_find_us,
      address: users.address,
      city: users.city,
      district: users.district,
      location: sql`${users.address} || ', ' || ${users.city} || ', ' || ${users.district}`,
    })
    .from(users)
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(employee, eq(users.uuid, employee.user_uuid))
    .where(eq(users.email, email));

  const [data] = await userPromise;

  if (!data)
    return DataNotFound(c);

  // if (!data.status) {
  //   return c.json(
  //     { message: 'Account is disabled' },
  //     HSCode.UNAUTHORIZED,
  //   );
  // }

  // Check if the account is disabled

  if (data.status === '0' || data.status === 'false' || data.status === null || !data.status) {
    return c.json(
      createToast('error', 'Account is disabled. Please contact admin.'),
      HSCode.UNAUTHORIZED,
    );
  }

  // Check if password is hashed or plain text
  let match = false;

  if (isHashedPassword(data.pass)) {
    // Password is hashed, use bcrypt compare
    match = await ComparePass(pass, data.pass);
  }
  else {
    // Password is plain text, compare directly
    match = pass === data.pass;
  }

  if (!match) {
    return c.json(
      { message: 'Invalid password' },
      HSCode.UNAUTHORIZED,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    uuid: data.uuid,
    username: data.name,
    // can_access: data.can_access,
    exp: now + 60 * 60 * 24,
    employee_uuid: data.employee_uuid,
  };

  const token = await CreateToken(payload);

  const user = {
    uuid: data.uuid,
    email: data.email,
    name: data.name,
    department_name: data.department,
    designation_name: data.designation,
    employee_uuid: data.employee_uuid,
    user_type: data.user_type,
    phone: data.phone,
    where_they_find_us: data.where_they_find_us,
    address: data.address,
    city: data.city,
    district: data.district,
    location: data.location,
  };

  const can_access = data.can_access;

  return c.json({ payload, token, can_access, user }, HSCode.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const { pass } = await c.req.json();

  value.pass = await HashPass(pass);

  if (value.user_type === 'customer') {
    value.can_access = '{"customer__customer_profile":["read"]}';
    value.status = 1; // Set status to active for customers
  }

  const [data] = await db.insert(users).values(value).returning({
    name: users.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(users)
    .set(updates)
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

  // const [data] = await db.delete(users)
  //   .where(eq(users.uuid, uuid))
  //   .returning({
  //     name: users.name,
  //   });

  // if (!data)
  //   return DataNotFound(c);

  // return c.json(createToast('delete', data.name), HSCode.OK);

  try {
    const [data] = await db.delete(users)
      .where(eq(users.uuid, uuid))
      .returning({
        name: users.name,
      });

    if (!data)
      return DataNotFound(c);

    return c.json(createToast('delete', data.name), HSCode.OK);
  }
  catch (error: any) {
    // Check if it's a foreign key constraint error
    if (error.code === '23503' || error.message.includes('foreign key')) {
      return c.json(
        createToast('error', 'Cannot delete user - user is referenced in other records'),
        HSCode.BAD_REQUEST,
      );
    }
    throw error;
  }
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const { status, user_type, department_name } = c.req.valid('query');

  const userPromise = db
    .select({
      uuid: users.uuid,
      name: users.name,
      email: users.email,
      designation_uuid: users.designation_uuid,
      designation: designation.designation,
      department_uuid: users.department_uuid,
      department: department.department,
      ext: users.ext,
      phone: users.phone,
      created_at: users.created_at,
      updated_at: users.updated_at,
      status: users.status,
      remarks: users.remarks,
      id: users.id,
      user_type: users.user_type,
      business_type: users.business_type,
      where_they_find_us: users.where_they_find_us,
      rating: users.rating,
      price: users.price,
      address: users.address,
      city: users.city,
      district: users.district,
    })
    .from(users)
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .orderBy(desc(users.created_at));

  const filters = [];

  if (status) {
    if (status === 'true' || status === 'false') {
      filters.push(eq(users.status, status === 'true' ? 1 as any : 0 as any));
    }
  }

  if (user_type) {
    filters.push(eq(users.user_type, user_type));
  }

  if (department_name) {
    filters.push(eq(department.department, department_name));
  }
  if (filters.length > 0) {
    userPromise.where(and(...filters));
  }

  const data = await userPromise;

  return c.json(data || {}, HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const userPromise = db
    .select({
      uuid: users.uuid,
      name: users.name,
      email: users.email,
      designation_uuid: users.designation_uuid,
      designation: designation.designation,
      department_uuid: users.department_uuid,
      department: department.department,
      ext: users.ext,
      phone: users.phone,
      created_at: users.created_at,
      updated_at: users.updated_at,
      status: users.status,
      remarks: users.remarks,
      id: users.id,
      user_type: users.user_type,
      business_type: users.business_type,
      where_they_find_us: users.where_they_find_us,
      rating: users.rating,
      price: users.price,
      address: users.address,
      city: users.city,
      district: users.district,
    })
    .from(users)
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .where(eq(users.uuid, uuid));

  const [data] = await userPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || null, HSCode.OK);
};

export const getCommonUser: AppRouteHandler<GetCommonUserRoute> = async (c: any) => {
  const userPromise = db
    .select({
      uuid: users.uuid,
      name: users.name,
      email: users.email,
      designation_uuid: users.designation_uuid,
      designation: designation.designation,
      ext: users.ext,
      phone: users.phone,
    })
    .from(users)
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid));

  const [data] = await userPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || [], HSCode.OK);
};

export const getCanAccess: AppRouteHandler<GetCanAccessRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const userPromise = db
    .select({
      can_access: users.can_access,
    })
    .from(users)
    .where(eq(users.uuid, uuid));

  const [data] = await userPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || null, HSCode.OK);
};

export const patchCanAccess: AppRouteHandler<PatchCanAccessRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const { can_access } = await c.req.json();

  const [data] = await db.update(users)
    .set({ can_access })
    .where(eq(users.uuid, uuid))
    .returning({
      name: users.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const patchUserStatus: AppRouteHandler<PatchUserStatusRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const { status, updated_at } = await c.req.json();

  const [data] = await db.update(users)
    .set({ status, updated_at })
    .where(eq(users.uuid, uuid))
    .returning({
      name: users.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const patchUserPassword: AppRouteHandler<PatchUserPasswordRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const { current_pass, pass, updated_at } = await c.req.json();
  const { is_reset } = c.req.valid('query');

  const userPrevPromise = db
    .select({
      uuid: users.uuid,
      name: users.name,
      pass: users.pass,
    })
    .from(users)
    .where(eq(users.uuid, uuid));

  const [userPrev] = await userPrevPromise;

  if (!userPrev)
    return DataNotFound(c);

  if (is_reset === 'true') {
    const pass2 = await HashPass(pass);

    const [data] = await db.update(users)
      .set({
        pass: pass2,
        updated_at,
      })
      .where(eq(users.uuid, uuid))
      .returning({
        name: users.name,
      });

    if (!data)
      return DataNotFound(c);

    return c.json(createToast('update', data.name), HSCode.OK);
  }
  else {
    let match = false;

    if (isHashedPassword(userPrev.pass)) {
      match = await ComparePass(current_pass, userPrev.pass);
    }
    else {
      match = current_pass === userPrev.pass;
    }

    if (!match) {
      return c.json(
        { message: 'Current password is incorrect' },
        HSCode.UNAUTHORIZED,
      );
    }
    const pass2 = await HashPass(pass);

    const [data] = await db.update(users)
      .set({
        pass: pass2,
        updated_at,
      })
      .where(eq(users.uuid, uuid))
      .returning({
        name: users.name,
      });
    if (!data)
      return DataNotFound(c);

    return c.json(createToast('update', data.name), HSCode.OK);
  }
};

export const patchRatingPrice: AppRouteHandler<PatchRatingPriceRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const { rating, price, updated_at } = await c.req.json();

  const [data] = await db.update(users)
    .set({ rating, price, updated_at })
    .where(eq(users.uuid, uuid))
    .returning({
      name: users.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};
