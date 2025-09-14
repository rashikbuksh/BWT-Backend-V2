import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { contact_us } from '../schema';

//* crud
export const selectSchema = createSelectSchema(contact_us);

export const insertSchema = createInsertSchema(
  contact_us,
  {
    id: schema => schema.id,
    first_name: schema => schema.first_name.optional(),
    last_name: schema => schema.last_name.optional(),
    phone: schema => schema.phone.optional(),
    subject: schema => schema.subject.min(1),
    message: schema => schema.message.min(1),
    user_uuid: schema => schema.user_uuid.optional(),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  id: true,
  subject: true,
  message: true,
  created_at: true,
}).partial({
  first_name: true,
  last_name: true,
  phone: true,
  user_uuid: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
