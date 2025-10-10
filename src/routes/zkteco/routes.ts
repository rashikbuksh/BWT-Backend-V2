import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['attendence'];

export const patch = createRoute({
  path: '/iclock/cdata',
  method: 'patch',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
      table: z.string().optional().describe('The table name, e.g., ATTLOG, USERINFO'),
      options: z.string().optional().describe('The table name, e.g., ATTLOG, USERINFO'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'The cdata accepted'),
  },
});

export const deviceHealth = createRoute({
  path: '/device/health',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'The device health status'),
  },
});

export const addBulkUsers = createRoute({
  path: '/iclock/cdata/bulk',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
    body: jsonContent({
      users: z.array(z.object({
        userid: z.string().describe('The user ID'),
        name: z.string().describe('The user name'),
        password: z.string().optional().describe('The user password'),
        card: z.string().optional().describe('The user card number'),
        groupid: z.string().optional().describe('The user group ID'),
        privilege: z.number().optional().describe('The user privilege level'),
        enabled: z.number().optional().describe('Whether the user is enabled (1) or disabled (0)'),
        fingerprint: z.string().optional().describe('The user fingerprint data in base64 format'),
        face: z.string().optional().describe('The user face data in base64 format'),
      })).describe('The list of users to add'),
    }, 'The bulk users to add'),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'The bulk users accepted'),
  },
});

export type PatchRoute = typeof patch;
export type DeviceHealthRoute = typeof deviceHealth;
export type AddBulkUsersRoute = typeof addBulkUsers;
