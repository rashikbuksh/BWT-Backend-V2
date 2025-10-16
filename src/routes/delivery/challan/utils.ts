import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { challan } from '../schema';

//* crud
export const selectSchema = createSelectSchema(challan);

export const insertSchema = createInsertSchema(
  challan,
  {
    uuid: schema => schema.uuid.length(15),
    customer_uuid: schema => schema.customer_uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    vehicle_uuid: schema => schema.vehicle_uuid.length(15),
    courier_uuid: schema => schema.courier_uuid.length(15),
    branch_uuid: schema => schema.branch_uuid.length(15),
    is_delivery_complete: schema => schema.is_delivery_complete.default(false),
    is_delivery_complete_date: schema => schema.is_delivery_complete_date.regex(dateTimePattern, {
      message: 'is_delivery_complete_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  customer_uuid: true,
  employee_uuid: true,
  vehicle_uuid: true,
  courier_uuid: true,
  branch_uuid: true,
  challan_type: true,
  created_by: true,
  created_at: true,
}).partial({
  is_delivery_complete: true,
  is_delivery_complete_date: true,
  payment_method: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
