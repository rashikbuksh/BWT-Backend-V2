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

export const bulkInsertSchema = z.object({
  names: z.array(z.string().min(1).max(100)),
  emails: z.array(z.string().email()),
  reports: z.array(z.any().openapi({
    type: 'string',
    format: 'binary',
    description: 'Report files to upload',
  })),
}).refine(data =>
  data.names.length === data.emails.length
  && data.names.length === data.reports.length, {
  message: 'All arrays must have the same length',
});
