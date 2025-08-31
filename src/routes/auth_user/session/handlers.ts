import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import { auth } from '@/lib/auth';

import type {
  ListRoute,
} from './routes';

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  return c.json(session || [], HSCode.OK);
};
