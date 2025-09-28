import type { AppRouteHandler } from '@/lib/types';

import { setCookie } from 'hono/cookie';
import * as HSCode from 'stoker/http-status-codes';

import env from '@/env';
import { fetchZKAuthToken, fetchZKData } from '@/utils/zk_software';

import type { GetEmployeeFromZKRoute, GetZKDynamicRoute, PostAuthTokenRoute } from './routes';

export const postAuthToken: AppRouteHandler<PostAuthTokenRoute> = async (c: any) => {
  try {
    const token = await fetchZKAuthToken();

    const zkToken = `Token ${token}`;

    // Save token in a secure, HTTP-only cookie
    setCookie(c, 'zk_token', zkToken, {
      httpOnly: true,
      // For cross-site requests from a separate frontend, cookies must be Secure and SameSite=None
      secure: env.NODE_ENV !== 'development',
      sameSite: env.NODE_ENV === 'development' ? 'Lax' : 'None',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

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
    // Fixed path for employees
    const data = await fetchZKData(c, 'personnel/api/employees/');
    return c.json(data, HSCode.OK);
  }
  catch (err: any) {
    const message = err?.message || 'Failed to fetch employee data';
    const status = /missing/i.test(message) ? HSCode.BAD_REQUEST : HSCode.INTERNAL_SERVER_ERROR;
    return c.json({ error: message }, status);
  }
};

export const getZKDynamic: AppRouteHandler<GetZKDynamicRoute> = async (c: any) => {
  try {
    // Extract the subpath after /zk/
    const fullPath = c.req.path; // e.g., /v1/zk/personnel/api/employees/
    const subPath = fullPath.replace(/^\/v\d+\/zk\/?/, '');
    if (!subPath) {
      return c.json({ error: 'Missing ZK path' }, HSCode.BAD_REQUEST);
    }
    const data = await fetchZKData(c, subPath);
    return c.json(data, HSCode.OK);
  }
  catch (err: any) {
    const message = err?.message || 'Failed to fetch ZK data';
    const status = /missing/i.test(message) ? HSCode.BAD_REQUEST : HSCode.INTERNAL_SERVER_ERROR;
    return c.json({ error: message }, status);
  }
};
