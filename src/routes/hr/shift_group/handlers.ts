import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { roster, shift_group, shifts, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const rosterData = await db
    .select()
    .from(roster)
    .where(and(
      eq(roster.shift_group_uuid, value.uuid),
      eq(roster.shifts_uuid, value.shifts_uuid),
      eq(roster.effective_date, value.effective_date),
    ));

  if (rosterData.length > 0) {
    return c.json(createToast('error', 'Shift Group already assigned in Roster'), HSCode.BAD_REQUEST);
  }

  const [data] = await db.insert(shift_group).values(value).returning({
    name: shift_group.name,
  });

  // await db.insert(roster).values({
  //   shift_group_uuid: value.uuid,
  //   shifts_uuid: value.shifts_uuid,
  //   effective_date: value.effective_date,
  //   created_by: value.created_by,
  //   off_days: value.off_days,
  //   created_at: value.created_at,
  // });

  if (value.uuid != null && value.shifts_uuid != null && value.effective_date != null && value.created_by != null && value.off_days != null && value.created_at != null) {
    await db.insert(roster).values({
      shift_group_uuid: value.uuid,
      shifts_uuid: value.shifts_uuid,
      effective_date: value.effective_date,
      created_by: value.created_by,
      off_days: value.off_days,
      created_at: value.created_at,
    });
  }

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const rosterData = await db
    .select()
    .from(roster)
    .where(and(
      eq(roster.shift_group_uuid, uuid),
      eq(roster.shifts_uuid, updates.shifts_uuid),
      eq(roster.effective_date, updates.effective_date),
    ));

  if (rosterData.length > 0) {
    return c.json(createToast('error', 'Shift Group already assigned in Roster'), HSCode.BAD_REQUEST);
  }

  const [data] = await db.update(shift_group)
    .set(updates)
    .where(eq(shift_group.uuid, uuid))
    .returning({
      name: shift_group.name,
    });

  // await db.insert(roster).values({
  //   shift_group_uuid: uuid,
  //   shifts_uuid: updates.shifts_uuid,
  //   effective_date: updates.effective_date,
  //   created_by: updates.created_by,
  //   off_days: updates.off_days,
  //   created_at: updates.updated_at,
  // });

  if (uuid != null && updates.shifts_uuid != null && updates.effective_date != null && updates.created_by != null && updates.off_days != null && updates.updated_at != null) {
    await db.insert(roster).values({
      shift_group_uuid: uuid,
      shifts_uuid: updates.shifts_uuid,
      effective_date: updates.effective_date,
      created_by: updates.created_by,
      off_days: updates.off_days,
      created_at: updates.updated_at,
    });
  }

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(shift_group)
    .where(eq(shift_group.uuid, uuid))
    .returning({
      name: shift_group.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const shiftGroupPromise = db
    .select({
      uuid: shift_group.uuid,
      id: shift_group.id,
      name: shift_group.name,
      default_shift: shift_group.default_shift,
      shifts_uuid: shift_group.shifts_uuid,
      shifts_name: shifts.name,
      status: shift_group.status,
      off_days: shift_group.off_days,
      effective_date: shift_group.effective_date,
      created_by: shift_group.created_by,
      created_by_name: users.name,
      created_at: shift_group.created_at,
      updated_at: shift_group.updated_at,
      remarks: shift_group.remarks,
      current_shift: sql`(
                          SELECT 
                                json_build_object(
                                  'shifts_uuid', r.shifts_uuid,
                                  'effective_date', r.effective_date,
                                  'shift_group_uuid', r.shift_group_uuid,
                                  'created_at', r.created_at,
                                  'off_days', r.off_days,
                                  'shift_group_name', sg.name,
                                  'shift_name', s.name,
                                  'shift_start_time', s.start_time,
                                  'shift_end_time', s.end_time
                                ) AS current_shift
                          FROM hr.roster r
                          LEFT JOIN hr.shifts s ON r.shifts_uuid = s.uuid
                          LEFT JOIN hr.shift_group sg ON r.shift_group_uuid = sg.uuid
                          WHERE r.shift_group_uuid = ${shift_group.uuid} AND r.shifts_uuid = ${shift_group.shifts_uuid} AND r.effective_date::date <= CURRENT_DATE::date
                          ORDER BY r.effective_date::date DESC
                          LIMIT 1
      )`,
      next_shift: sql`(
                          SELECT 
                                json_build_object(
                                  'shifts_uuid', r.shifts_uuid,
                                  'effective_date', r.effective_date,
                                  'shift_group_uuid', r.shift_group_uuid,
                                  'created_at', r.created_at,
                                  'off_days', r.off_days,
                                  'shift_group_name', sg.name,
                                  'shift_name', s.name,
                                  'shift_start_time', s.start_time,
                                  'shift_end_time', s.end_time
                                ) AS next_shift
                          FROM hr.roster r
                          LEFT JOIN hr.shifts s ON r.shifts_uuid = s.uuid
                          LEFT JOIN hr.shift_group sg ON r.shift_group_uuid = sg.uuid
                          WHERE r.shift_group_uuid = ${shift_group.uuid} AND r.shifts_uuid = ${shift_group.shifts_uuid} AND r.effective_date::date > CURRENT_DATE::date
                          ORDER BY r.effective_date::date ASC
                          LIMIT 1
      )`,

    })
    .from(shift_group)
    .leftJoin(shifts, eq(shift_group.shifts_uuid, shifts.uuid))
    .leftJoin(users, eq(shift_group.created_by, users.uuid))
    .orderBy(desc(shift_group.created_at));

  const data = await shiftGroupPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const shiftGroupPromise = db
    .select({
      uuid: shift_group.uuid,
      id: shift_group.id,
      name: shift_group.name,
      default_shift: shift_group.default_shift,
      shifts_uuid: shift_group.shifts_uuid,
      shifts_name: shifts.name,
      status: shift_group.status,
      off_days: shift_group.off_days,
      effective_date: shift_group.effective_date,
      created_by: shift_group.created_by,
      created_by_name: users.name,
      created_at: shift_group.created_at,
      updated_at: shift_group.updated_at,
      remarks: shift_group.remarks,
    })
    .from(shift_group)
    .leftJoin(shifts, eq(shift_group.shifts_uuid, shifts.uuid))
    .leftJoin(users, eq(shift_group.created_by, users.uuid))
    .where(eq(shift_group.uuid, uuid));

  const [data] = await shiftGroupPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
