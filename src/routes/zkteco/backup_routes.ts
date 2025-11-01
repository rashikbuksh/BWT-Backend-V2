import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['attendance'];

export const fullBackup = createRoute({
  path: '/iclock/device/full-backup',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
    body: jsonContent(
      z.object({
        includeAttlogs: z.boolean().optional().default(true).describe('Include attendance logs'),
        includeUsers: z.boolean().optional().default(true).describe('Include user information'),
        includeBiometric: z.boolean().optional().default(true).describe('Include biometric data'),
        includeFaceTemplates: z.boolean().optional().default(false).describe('Include face templates'),
        includeConfig: z.boolean().optional().default(true).describe('Include device configuration'),
        startDate: z.string().optional().describe('Start date for attendance logs (YYYY-MM-DD HH:mm:ss)'),
        endDate: z.string().optional().describe('End date for attendance logs (YYYY-MM-DD HH:mm:ss)'),
      }),
      'Backup configuration options',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        ok: z.boolean(),
        sn: z.string(),
        message: z.string(),
        queuedCommands: z.array(z.string()),
        estimatedTime: z.string(),
      }),
      'Full backup initiated successfully',
    ),
    [HSCode.BAD_REQUEST]: jsonContent(
      z.object({
        error: z.string(),
      }),
      'Invalid request parameters',
    ),
  },
});

export type FullBackupRoute = typeof fullBackup;
