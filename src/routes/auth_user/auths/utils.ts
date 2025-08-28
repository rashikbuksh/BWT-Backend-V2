import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// import { dateTimePattern } from '@/utils';
import { user } from '../schema';

//* crud
export const selectSchema = createSelectSchema(user);

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
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
  user,
  {
    name: schema => schema.name,
    email: schema => schema.email,
  },
).required({
  name: true,
  email: true,
}).partial({
  image: true,
  createdAt: true,
  updatedAt: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
