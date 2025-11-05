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

// You can then create your variations from this base
export const insertSchema = mySchema.required();

export const patchSchema = mySchema.partial();

// And the select schema is just the base schema
export const selectSchema = mySchema;
