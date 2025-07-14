import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/hr/users/value/label',
  method: 'get',
  tags,
  request: {
    query: z.object({
      type: z.string().optional(),
      designation: z.string().optional(),
      department: z.string().optional(),
      is_ready_for_delivery: z.string().optional(),
      is_delivery_complete: z.string().optional(),
      challan_uuid: z.string().optional(),
      filteredUser: z.string().optional(),
      user_uuid: z.string().optional(),
      is_challan_needed: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
      'The valueLabel of user',
    ),
  },
});

export const userAccess = createRoute({
  path: '/other/hr/users-can-access/value/label',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
        can_access: z.string(),
      }),
      'The valueLabel can_access of user',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
export type UserAccessRoute = typeof userAccess;
