import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['attendance'];

export const getRequest = createRoute({
  path: '/iclock/cdata',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
      table: z.string().optional().describe('The table name, e.g., ATTLOG, USERINFO'),
      options: z.string().optional().describe('Device options like "all"'),
      language: z.string().optional().describe('Language code'),
      pushver: z.string().optional().describe('Push version like "2.4.1"'),
      DeviceType: z.string().optional().describe('Device type like "att"'),
      PushOptionsFlag: z.string().optional().describe('Push options flag'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'The cdata retrieved'),
  },
});

export const post = createRoute({
  path: '/iclock/cdata',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
      table: z.string().optional().describe('The table name, e.g., ATTLOG, USERINFO'),
      options: z.string().optional().describe('Options parameter'),
      language: z.string().optional().describe('Language code'),
      pushver: z.string().optional().describe('Push version'),
      DeviceType: z.string().optional().describe('Device type'),
      PushOptionsFlag: z.string().optional().describe('Push options flag'),
    }),
    body: {
      content: {
        'text/plain': {
          schema: z.string().describe('Raw text data from device'),
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'The cdata accepted'),
  },
});

// Simple connection test endpoint
export const connectionTest = createRoute({
  path: '/iclock/ping',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'Connection test successful'),
  },
});

// Root iclock endpoint that some devices might call
export const iclockRoot = createRoute({
  path: '/iclock',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'iClock server ready'),
  },
});

export const deviceHealth = createRoute({
  path: '/v1/iclock/device/health',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'The device health status'),
  },
});

export const addBulkUsers = createRoute({
  path: '/iclock/add/user/bulk',
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

// Legacy iClock protocol endpoints that ZKTeco devices expect
export const getRequest_legacy = createRoute({
  path: '/iclock/getrequest',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'Commands for device'),
  },
});

export const deviceCmd = createRoute({
  path: '/iclock/devicecmd',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
      INFO: z.string().optional().describe('Device info string'),
      info: z.string().optional().describe('Device info string'),
      cmds: z.string().optional().describe('Comma-separated command IDs that were executed'),
    }),
    body: {
      content: {
        'text/plain': {
          schema: z.string().optional().describe('Raw text data from device'),
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'Device command processed'),
  },
});

export const customCommand = createRoute({
  path: '/iclock/device/custom-command',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
    body: jsonContent(
      z.object({
        command: z.string().describe('The custom command to send'),
      }),
      'The custom command to send',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'The custom command accepted'),
  },
});

export const clearCommandQueue = createRoute({
  path: '/iclock/device/clear-queue',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'Command queue cleared'),
  },
});

export const getQueueStatus = createRoute({
  path: '/iclock/device/queue-status',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'Queue status retrieved'),
  },
});

export const refreshUsers = createRoute({
  path: '/iclock/device/refresh-users',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'User refresh initiated'),
  },
});

export const deleteUser = createRoute({
  path: '/v1/iclock/delete/user',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'Queue status retrieved'),
  },
});

export const syncAttendanceLogs = createRoute({
  path: '/v1/iclock/sync/attendance-logs',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent({}, 'Queue status retrieved'),
  },
});

export type GetRequestRoute = typeof getRequest;
export type PostRoute = typeof post;
export type ConnectionTestRoute = typeof connectionTest;
export type IclockRootRoute = typeof iclockRoot;
export type DeviceHealthRoute = typeof deviceHealth;
export type AddBulkUsersRoute = typeof addBulkUsers;
export type CustomCommandRoute = typeof customCommand;
export type ClearCommandQueueRoute = typeof clearCommandQueue;
export type GetQueueStatusRoute = typeof getQueueStatus;
export type RefreshUsersRoute = typeof refreshUsers;
export type GetRequestLegacyRoute = typeof getRequest_legacy;
export type DeviceCmdRoute = typeof deviceCmd;
export type DeleteUserRoute = typeof deleteUser;
export type SyncAttendanceLogsRoute = typeof syncAttendanceLogs;

// Import backup route
export { fullBackup } from './backup_routes';
export type { FullBackupRoute } from './backup_routes';
