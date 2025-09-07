import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { users } from '../schema';

//* crud
export const selectSchema = createSelectSchema(users);

export const loginSchema = z.object({
  email: z.string().email(),
  pass: z.string().min(4).max(50),
});

// export const signinOutputSchema = z.object({
//   payload: z.object({
//     uuid: z.string(),
//     name: z.string(),
//     email: z.string(),
//     can_access: z.string(),
//     exp: z.number(),
//   }) as z.Schema<JWTPayload>,
//   token: z.string(),
// });

export const insertSchema = createInsertSchema(
  users,
  {
    uuid: schema => schema.uuid.length(15),
    pass: schema => schema.pass.min(4).max(50),
    designation_uuid: schema => schema.designation_uuid.length(15).optional(),
    department_uuid: schema => schema.department_uuid.length(15).optional(),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    auth_user_id: schema => schema.auth_user_id.optional(),
  },
).required({
  uuid: true,
  name: true,
  email: true,
  pass: true,
  designation_uuid: true,
  department_uuid: true,
  phone: true,
  created_at: true,
}).partial({
  ext: true,
  status: true,
  can_access: true,
  user_type: true,
  business_type: true,
  where_they_find_us: true,
  rating: true,
  price: true,
  updated_at: true,
  remarks: true,
  auth_user_id: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
