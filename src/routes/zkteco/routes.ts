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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        timestamp: z.string(),
      }),
      'The cdata retrieved',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        timestamp: z.string(),
      }),
      'The cdata accepted',
    ),
  },
});

// Simple connection test endpoint
export const connectionTest = createRoute({
  path: '/v1/iclock/ping',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        status: z.string(),
      }),
      'Connection test successful',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        ready: z.boolean(),
      }),
      'iClock server ready',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        status: z.string(),
        deviceSN: z.string().optional(),
        health: z.string(),
      }),
      'The device health status',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        usersProcessed: z.number(),
        timestamp: z.string(),
      }),
      'The bulk users accepted',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        commands: z.array(z.string()),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'Commands for device',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        commandsProcessed: z.array(z.string()).optional(),
        timestamp: z.string(),
      }),
      'Device command processed',
    ),
  },
});

export const customCommand = createRoute({
  path: '/v1/iclock/device/custom-command',
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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        command: z.string(),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'The custom command accepted',
    ),
  },
});

export const clearCommandQueue = createRoute({
  path: '/v1/iclock/device/clear-queue',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        queueCleared: z.boolean(),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'Command queue cleared',
    ),
  },
});

export const getQueueStatus = createRoute({
  path: '/v1/iclock/device/queue-status',
  method: 'get',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        queueLength: z.number(),
        pendingCommands: z.array(z.string()),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'Queue status retrieved',
    ),
  },
});

export const refreshUsers = createRoute({
  path: '/v1/iclock/device/refresh-users',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        refreshInitiated: z.boolean(),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'User refresh initiated',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        userDeleted: z.boolean(),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'User deletion processed',
    ),
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
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        logsSynced: z.number(),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'Attendance logs sync completed',
    ),
  },
});

export const syncEmployees = createRoute({
  path: '/v1/iclock/sync-employees',
  method: 'post',
  request: {
    query: z.object({
      sn: z.string().optional().describe('Specific device serial number (optional)'),
    }),
    body: jsonContent(z.object({
      dryRun: z.boolean().optional().default(false).describe('Preview changes without executing'),
      employee_uuids: z.array(z.string()).optional().describe('List of employee UUIDs to sync (optional)'),
    }), 'Sync configuration'),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(z.object({
      ok: z.boolean(),
      message: z.string(),
      syncResults: z.object({
        totalEmployees: z.number(),
        devicesProcessed: z.number(),
        usersAdded: z.number(),
        usersSkipped: z.number(),
        errors: z.number(),
        details: z.array(z.object({
          employee: z.object({
            pin: z.string(),
            name: z.string(),
            email: z.string(),
          }),
          action: z.string(),
          devices: z.array(z.string()),
          success: z.boolean(),
          error: z.string().optional(),
        })),
      }),
    }), 'Employee sync results'),
    [HSCode.BAD_REQUEST]: jsonContent(z.object({
      error: z.string(),
    }), 'Invalid request'),
    [HSCode.INTERNAL_SERVER_ERROR]: jsonContent(z.object({
      error: z.string(),
    }), 'Server error'),
  },
});

export const addTemporaryUser = createRoute({
  path: '/zkteco/add-temporary-user',
  method: 'post',
  request: {
    query: z.object({
      sn: z.string().optional().describe('Specific device serial number (optional)'),
    }),
    body: jsonContent(z.object({
      pin: z.string().optional().describe('User PIN number (will be auto-generated if not provided)'),
      name: z.string().describe('User name'),
      start_date: z.string().describe('Access start date-time in ISO 8601 format'),
      end_date: z.string().describe('Access end date-time in ISO 8601 format'),
      privilege: z.string().optional().default('0').describe('User privilege (0=user, 1=admin)'),
      password: z.string().optional().default('').describe('User password'),
      cardno: z.string().optional().default('').describe('Card number'),
      timeZone: z.string().optional().default('1').describe('Time zone ID (1-50)'),
    }), 'Temporary user configuration'),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(z.object({
      success: z.boolean(),
      pin: z.string(),
      name: z.string(),
      accessDurationMinutes: z.number(),
      expiryTime: z.string(),
      devicesProcessed: z.number(),
      successCount: z.number(),
      failureCount: z.number(),
      results: z.array(z.object({
        device: z.string(),
        success: z.boolean(),
        commands: z.array(z.string()).optional(),
        expiryTime: z.string().optional(),
        note: z.string().optional(),
        error: z.string().optional(),
      })),
    }), 'Temporary user added successfully'),
    [HSCode.BAD_REQUEST]: jsonContent(z.object({
      success: z.boolean(),
      error: z.string(),
    }), 'Invalid request'),
    [HSCode.INTERNAL_SERVER_ERROR]: jsonContent(z.object({
      success: z.boolean(),
      error: z.string(),
    }), 'Server error'),
  },
});

export const cancelTemporaryAccess = createRoute({
  path: '/zkteco/cancel-temporary-access',
  method: 'post',
  request: {
    query: z.object({
      sn: z.string().optional().describe('Specific device serial number (optional)'),
      pin: z.string().describe('User PIN to cancel access for'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(z.object({
      success: z.boolean(),
      pin: z.string(),
      results: z.array(z.object({
        device: z.string(),
        success: z.boolean(),
        note: z.string().optional(),
        error: z.string().optional(),
      })),
    }), 'Temporary access cancelled'),
    [HSCode.BAD_REQUEST]: jsonContent(z.object({
      success: z.boolean(),
      error: z.string(),
    }), 'Invalid request'),
  },
});

export const getTemporaryUsersRoute = createRoute({
  path: '/zkteco/temporary-users',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(z.object({
      success: z.boolean(),
      temporaryUsers: z.array(z.object({
        key: z.string(),
        pin: z.string(),
        deviceSn: z.string(),
        expiryTime: z.string(),
        timeRemainingMinutes: z.number(),
      })),
      totalCount: z.number(),
    }), 'List of active temporary users'),
  },
});

export const employeeBiometricSyncFromDeviceToBackend = createRoute({
  path: '/v1/iclock/sync/employee-biometric/device-to-backend',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        employeesSynced: z.number(),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'Employee biometric data sync completed',
    ),
  },
});

export const employeeBiometricSyncFromBackendToDevice = createRoute({
  path: '/v1/iclock/sync/employee-biometric/backend-to-device',
  method: 'post',
  request: {
    query: z.object({
      SN: z.string().optional().describe('The device Serial Number'),
      sn: z.string().optional().describe('The device Serial Number'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string(),
        employeesSynced: z.number(),
        deviceSN: z.string().optional(),
        timestamp: z.string(),
      }),
      'Employee biometric data sync completed',
    ),
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
export type SyncEmployeesRoute = typeof syncEmployees;
export type AddTemporaryUserRoute = typeof addTemporaryUser;
export type CancelTemporaryAccessRoute = typeof cancelTemporaryAccess;
export type GetTemporaryUsersRoute = typeof getTemporaryUsersRoute;
export type EmployeeBiometricSyncFromDeviceToBackendRoute = typeof employeeBiometricSyncFromDeviceToBackend;
export type EmployeeBiometricSyncFromBackendToDeviceRoute = typeof employeeBiometricSyncFromBackendToDevice;

// Import backup route
export { fullBackup } from './backup_routes';
export type { FullBackupRoute } from './backup_routes';
