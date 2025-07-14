import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { process } from '../schema';

//* crud
export const selectSchema = createSelectSchema(process);

export const insertSchema = createInsertSchema(
  process,
  {
    uuid: schema => schema.uuid.length(15),
    section_uuid: schema => schema.section_uuid.length(15),
    order_uuid: schema => schema.order_uuid.length(15),
    diagnosis_uuid: schema => schema.diagnosis_uuid.length(15),
    engineer_uuid: schema => schema.engineer_uuid.length(15),
    warehouse_uuid: schema => schema.warehouse_uuid.length(15),
    rack_uuid: schema => schema.rack_uuid.length(15),
    floor_uuid: schema => schema.floor_uuid.length(15),
    box_uuid: schema => schema.box_uuid.length(15),
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
  id: true,
  uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  index: true,
  section_uuid: true,
  order_uuid: true,
  diagnosis_uuid: true,
  engineer_uuid: true,
  problems_uuid: true,
  problem_statement: true,
  status: true,
  status_update_date: true,
  is_transferred_for_qc: true,
  is_ready_for_delivery: true,
  warehouse_uuid: true,
  rack_uuid: true,
  floor_uuid: true,
  box_uuid: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
