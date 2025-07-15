import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetNoticeRoute, GetOneRoute, GetPolicyRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { policy_and_notice, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(policy_and_notice).values(value).returning({
    name: policy_and_notice.title,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(policy_and_notice)
    .set(updates)
    .where(eq(policy_and_notice.uuid, uuid))
    .returning({
      name: policy_and_notice.title,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(policy_and_notice)
    .where(eq(policy_and_notice.uuid, uuid))
    .returning({
      name: policy_and_notice.title,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const policyAndNoticePromise = db
    .select({
      uuid: policy_and_notice.uuid,
      title: policy_and_notice.title,
      sub_title: policy_and_notice.sub_title,
      url: policy_and_notice.url,
      type: policy_and_notice.type,
      created_at: policy_and_notice.created_at,
      updated_at: policy_and_notice.updated_at,
      created_by: policy_and_notice.created_by,
      created_by_name: users.name,
      remarks: policy_and_notice.remarks,
      status: policy_and_notice.status,
    })
    .from(policy_and_notice)
    .leftJoin(users, eq(policy_and_notice.created_by, users.uuid))
    .orderBy(desc(policy_and_notice.created_at));

  const data = await policyAndNoticePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const policyAndNoticePromise = db
    .select({
      uuid: policy_and_notice.uuid,
      title: policy_and_notice.title,
      sub_title: policy_and_notice.sub_title,
      url: policy_and_notice.url,
      type: policy_and_notice.type,
      created_at: policy_and_notice.created_at,
      updated_at: policy_and_notice.updated_at,
      created_by: policy_and_notice.created_by,
      created_by_name: users.name,
      remarks: policy_and_notice.remarks,
      status: policy_and_notice.status,
    })
    .from(policy_and_notice)
    .leftJoin(users, eq(policy_and_notice.created_by, users.uuid))
    .where(eq(policy_and_notice.uuid, uuid));

  const [data] = await policyAndNoticePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getPolicy: AppRouteHandler<GetPolicyRoute> = async (c: any) => {
  // const { type, status } = c.req.valid('query');

  const policyPromise = db
    .select({
      uuid: policy_and_notice.uuid,
      title: policy_and_notice.title,
      type: policy_and_notice.type,
      created_at: policy_and_notice.created_at,
      updated_at: policy_and_notice.updated_at,
      created_by: policy_and_notice.created_by,
      created_by_name: users.name,
      remarks: policy_and_notice.remarks,
      status: policy_and_notice.status,
    })
    .from(policy_and_notice)
    .leftJoin(users, eq(policy_and_notice.created_by, users.uuid))
    .where(eq(policy_and_notice.type, 'policy'));

  const data = await policyPromise;

  return c.json(data || [], HSCode.OK);
};

export const getNotice: AppRouteHandler<GetNoticeRoute> = async (c: any) => {
  // const { type, status } = c.req.valid('query');

  const noticePromise = db
    .select({
      uuid: policy_and_notice.uuid,
      title: policy_and_notice.title,
      type: policy_and_notice.type,
      created_at: policy_and_notice.created_at,
      updated_at: policy_and_notice.updated_at,
      created_by: policy_and_notice.created_by,
      created_by_name: users.name,
      remarks: policy_and_notice.remarks,
      status: policy_and_notice.status,
    })
    .from(policy_and_notice)
    .leftJoin(users, eq(policy_and_notice.created_by, users.uuid))
    .where(eq(policy_and_notice.type, 'notice'));

  const data = await noticePromise;

  return c.json(data || [], HSCode.OK);
};
