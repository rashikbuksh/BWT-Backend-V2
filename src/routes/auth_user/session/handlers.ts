import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type {
  ListRoute,
} from './routes';

import { session } from '../schema';

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const sessionPromise = db
    .select({
      id: session.id,
      expiresAt: session.expiresAt,
      token: session.token,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      userId: session.userId,
    })
    .from(session);

  const data = await sessionPromise;

  return c.json(data || [], HSCode.OK);
};
