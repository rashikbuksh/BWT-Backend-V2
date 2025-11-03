import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { order } from '../schema';

//* crud
export const selectSchema = createSelectSchema(order);

export const insertSchema = createInsertSchema(
  order,
  {
    uuid: schema => schema.uuid.length(15),
    info_uuid: schema => schema.info_uuid.length(15),
    model_uuid: schema => schema.model_uuid.length(15).optional(),
    serial_no: schema => schema.serial_no.optional(),
    quantity: z.number().positive().default(1),
    problems_uuid: schema => schema.problems_uuid.optional(),
    problem_statement: schema => schema.problem_statement,
    accessories: schema => schema.accessories.optional(),
    is_diagnosis_need: schema => schema.is_diagnosis_need.default(false),
    is_diagnosis_need_date: schema => schema.is_diagnosis_need_date.regex(dateTimePattern, {
      message: 'is_diagnosis_need_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    warehouse_uuid: schema => schema.warehouse_uuid.length(15).optional(),
    rack_uuid: schema => schema.rack_uuid.length(15).optional(),
    floor_uuid: schema => schema.floor_uuid.length(15).optional(),
    box_uuid: schema => schema.box_uuid.length(15).optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
    is_transferred_for_qc: schema => schema.is_transferred_for_qc.default(false),
    is_transferred_for_qc_date: schema => schema.is_transferred_for_qc_date.regex(dateTimePattern, {
      message: 'is_transferred_for_qc_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    is_ready_for_delivery: schema => schema.is_ready_for_delivery.default(false),
    ready_for_delivery_date: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'ready_for_delivery_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    brand_uuid: schema => schema.brand_uuid.length(15).optional(),
    is_proceed_to_repair: schema => schema.is_proceed_to_repair.default(false),
    repairing_problems_uuid: schema => schema.repairing_problems_uuid.optional(),
    qc_problems_uuid: schema => schema.qc_problems_uuid.optional(),
    delivery_problems_uuid: schema => schema.delivery_problems_uuid.optional(),
    repairing_problem_statement: schema => schema.repairing_problem_statement.optional(),
    qc_problem_statement: schema => schema.qc_problem_statement.optional(),
    delivery_problem_statement: schema => schema.delivery_problem_statement.optional(),
    bill_amount: z.number().default(0),
    is_home_repair: schema => schema.is_home_repair.default(false),
    proposed_cost: z.number().default(0),
    is_challan_needed: schema => schema.is_challan_needed.default(false),
    engineer_uuid: schema => schema.engineer_uuid.length(15).optional(),
    advance_pay: z.number().optional().default(0),
    is_reclaimed: schema => schema.is_reclaimed.default(false),
    is_reclaimed_date: schema => schema.is_reclaimed_date.regex(dateTimePattern, {
      message: 'is_reclaimed_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
  },
).required({
  uuid: true,
  info_uuid: true,
  problem_statement: true,
  created_at: true,
}).partial({
  model_uuid: true,
  serial_no: true,
  quantity: true,
  problems_uuid: true,
  accessories: true,
  is_diagnosis_need: true,
  is_diagnosis_need_date: true,
  warehouse_uuid: true,
  rack_uuid: true,
  floor_uuid: true,
  box_uuid: true,
  updated_at: true,
  remarks: true,
  is_transferred_for_qc: true,
  is_transferred_for_qc_date: true,
  is_ready_for_delivery: true,
  ready_for_delivery_date: true,
  brand_uuid: true,
  is_diagnosis_completed: true,
  is_diagnosis_completed_date: true,
  is_proceed_to_repair: true,
  is_proceed_to_repair_date: true,
  repairing_problems_uuid: true,
  qc_problems_uuid: true,
  delivery_problems_uuid: true,
  repairing_problem_statement: true,
  qc_problem_statement: true,
  delivery_problem_statement: true,
  bill_amount: true,
  is_home_repair: true,
  proposed_cost: true,
  is_challan_needed: true,
  image_1: true,
  image_2: true,
  image_3: true,
  is_reclaimed: true,
  is_reclaimed_date: true,
  reclaimed_order_uuid: true,
  created_by: true,
  engineer_uuid: true,
  advance_pay: true,
  is_return: true,
  return_comment: true,
  is_delivery_without_challan: true,
  is_delivery_without_challan_date: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
