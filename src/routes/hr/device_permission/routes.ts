import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.device_permission'];

export const list = createRoute({
  path: '/hr/device-permission',
  method: 'get',
  tags,
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      device_list_uuid: z.string().optional(),
      permission_type: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of device-permission',
    ),
  },
});

export const create = createRoute({
  path: '/hr/device-permission',
  method: 'post',
  request: {
    body: jsonContentRequired(
      z.array(insertSchema),
      'The device-permission data',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
      'The created device-permission',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.array(insertSchema)),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/device-permission/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested device-permission',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Device-permission not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/device-permission/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The device-permission updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated device-permission',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Device-permission not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/device-permission/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Device-permission deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Device-permission not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getNotAssignedEmployeeForPermissionByDeviceListUuid = createRoute({
  path: '/hr/device-permission-for-employee/by/{device_list_uuid}',
  method: 'get',
  request: {
    params: z.object({
      device_list_uuid: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The device permission details',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Device permission details not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const syncUser = createRoute({
  path: '/hr/sync-to-device',
  method: 'post',
  request: {
    query: z.object({
      sn: z.string(),
      employee_uuid: z.string(),
      temporary: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      pin: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The employee sync to device',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee sync to device not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetNotAssignedEmployeeForPermissionByDeviceListUuidRoute = typeof getNotAssignedEmployeeForPermissionByDeviceListUuid;
export type PostSyncUser = typeof syncUser;
