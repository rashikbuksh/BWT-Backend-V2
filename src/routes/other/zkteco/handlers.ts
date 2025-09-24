import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import { fetchZKAuthToken, fetchZKEmployeeData } from '@/utils/zk_software';

import type { GetEmployeeFromZKRoute, PostAuthTokenRoute } from './routes';

export const postAuthToken: AppRouteHandler<PostAuthTokenRoute> = async (c: any) => {
  try {
    const token = await fetchZKAuthToken();

    const zkToken = `Token ${token}`;

    return c.json({ token: zkToken }, HSCode.OK);
  }
  catch (err: any) {
    const message = err?.message || 'Auth failed';
    const status = /missing/i.test(message) ? HSCode.BAD_REQUEST : HSCode.INTERNAL_SERVER_ERROR;
    return c.json({ error: message }, status);
  }
};

export const getEmployeeFromZK: AppRouteHandler<GetEmployeeFromZKRoute> = async (c: any) => {
  try {
    const employeeData = await fetchZKEmployeeData();

    return c.json(employeeData, HSCode.OK);
  }
  catch (err: any) {
    const message = err?.message || 'Failed to fetch employee data';
    const status = /missing/i.test(message) ? HSCode.BAD_REQUEST : HSCode.INTERNAL_SERVER_ERROR;
    return c.json({ error: message }, status);
  }
};
