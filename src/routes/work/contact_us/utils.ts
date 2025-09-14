import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { contact_us } from '../schema';

//* crud
export const selectSchema = createSelectSchema(contact_us);

export const insertSchema = createInsertSchema(
  contact_us,
  {
    id: schema => schema.id,
    name: schema => schema.name.min(1).max(100).optional(),
    phone: schema => schema.phone.optional(),
    email: schema => schema.email.email().optional(),
    subject: schema => schema.subject.min(1),
    message: schema => schema.message.min(1),
    user_uuid: schema => schema.user_uuid.optional(),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  subject: true,
  message: true,
  created_at: true,
}).partial({
  name: true,
  email: true,
  phone: true,
  user_uuid: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
