// import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

// import type {
//   GetUserByAuthUserIdRoute,
// } from './routes';
import { department, designation, users } from '../hr/schema';

export async function getUserByAuthUserId(c: any) {
  const { auth_user_id } = c.req.valid('param');

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
      auth_user_id: users.auth_user_id,
      address: users.address,
      city: users.city,
      district: users.district,
    })
    .from(users)
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .where(eq(users.auth_user_id, auth_user_id));

  const [data] = await userPromise;

  console.log('User Data:', data);

  if (!data) {
    return c.json({ message: 'User not found' }, HSCode.NOT_FOUND);
  }

  return c.json(data || null, HSCode.OK);
}
