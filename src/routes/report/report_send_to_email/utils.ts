import { z } from 'zod';

/// This is just a plain Zod schema. No Drizzle needed.
export const mySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  report: z.string().openapi({
    type: 'string',
    format: 'binary',
    description: 'Report file to upload (PDF, Excel, etc.)',
  }),
});

export const insertSchema = mySchema.required();

export const patchSchema = mySchema.partial();

export const selectSchema = mySchema;

export const bulkInsertSchema = z.array(
  z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    report: z.any().openapi({
      type: 'string',
      format: 'binary',
      description: 'Report file to upload',
    }),
  }),
);

export const bulkInsertWithoutFormSchema = z.object({
  email: z.string().email(),
  employee_name: z.string(),
  start_date: z.string(),
  employee_designation_name: z.string(),
  employee_department_name: z.string(),
  total_salary: z.number(),
});
