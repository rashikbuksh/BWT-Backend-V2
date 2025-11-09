import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { createRoute, z } from '@hono/zod-openapi';

import { bulkInsertSchema, bulkInsertWithoutFormSchema, insertSchema } from './utils';

const tags = ['reports'];

export const reportSendToEmail = createRoute({
  path: '/report/send-to-email',
  method: 'post',
  description: 'Send Report to Email',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: {
            ...insertSchema,
          },
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      'Report sent to email successfully',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },

});

// NOW, update your route definition to use this new schema
export const bulkReportSendToEmail = createRoute({
  path: '/report/bulk-send-to-email',
  method: 'post',
  description: 'Send Bulk Reports to Emails',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: {
            ...bulkInsertSchema,
          },
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      'Bulk Reports sent to emails successfully',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(bulkInsertSchema), // Use the same schema for error mapping
      'The validation error(s)',
    ),
  },
});

export const bulkReportSendToEmailWithoutForm = createRoute({
  path: '/report/bulk-send-to-email-without-form',
  method: 'post',
  description: 'Send Bulk Reports to Emails without form-data',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.array(bulkInsertWithoutFormSchema),
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      'Bulk Reports sent to emails successfully',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(bulkInsertSchema), // Use the same schema for error mapping
      'The validation error(s)',
    ),
  },
});

export type ReportSendToEmailRoute = typeof reportSendToEmail;
export type BulkReportSendToEmailRoute = typeof bulkReportSendToEmail;
export type BulkReportSendToEmailWithoutFormRoute = typeof bulkReportSendToEmailWithoutForm;
