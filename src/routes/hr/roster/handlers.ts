import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, GetRosterCalenderByEmployeeUuidRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { roster, shift_group, shifts, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(roster).values(value).returning({
    name: roster.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { id } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(roster)
    .set(updates)
    .where(eq(roster.id, id))
    .returning({
      name: roster.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const [data] = await db.delete(roster)
    .where(eq(roster.id, id))
    .returning({
      name: roster.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const rosterPromise = db
    .select({
      id: roster.id,
      shift_group_uuid: roster.shift_group_uuid,
      shift_group_name: shift_group.name,
      shifts_uuid: roster.shifts_uuid,
      shift_name: shifts.name,
      effective_date: roster.effective_date,
      off_days: roster.off_days,
      created_by: roster.created_by,
      created_by_name: users.name,
      created_at: roster.created_at,
      updated_at: roster.updated_at,
      remarks: roster.remarks,
    })
    .from(roster)
    .leftJoin(shift_group, eq(roster.shift_group_uuid, shift_group.uuid))
    .leftJoin(shifts, eq(roster.shifts_uuid, shifts.uuid))
    .leftJoin(users, eq(roster.created_by, users.uuid))
    .orderBy(desc(roster.created_at));

  const data = await rosterPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const rosterPromise = db
    .select({
      id: roster.id,
      shift_group_uuid: roster.shift_group_uuid,
      shift_group_name: shift_group.name,
      shifts_uuid: roster.shifts_uuid,
      shift_name: shifts.name,
      effective_date: roster.effective_date,
      off_days: roster.off_days,
      created_by: roster.created_by,
      created_by_name: users.name,
      created_at: roster.created_at,
      updated_at: roster.updated_at,
      remarks: roster.remarks,
    })
    .from(roster)
    .leftJoin(shift_group, eq(roster.shift_group_uuid, shift_group.uuid))
    .leftJoin(shifts, eq(roster.shifts_uuid, shifts.uuid))
    .leftJoin(users, eq(roster.created_by, users.uuid))
    .where(eq(roster.id, id));

  const [data] = await rosterPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getRosterCalenderByEmployeeUuid: AppRouteHandler<GetRosterCalenderByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid, year, month } = c.req.valid('param');

  const specialHolidaysQuery = sql`
                                SELECT
                                  gs.generated_date::date AS holiday_date,
                                  sh.name,
                                  sh.from_date,
                                  sh.to_date
                                FROM hr.special_holidays sh
                                JOIN LATERAL (
                                  SELECT generate_series(
                                    GREATEST(sh.from_date::date, TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD')::date),
                                    LEAST(sh.to_date::date, (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date),
                                    INTERVAL '1 day'
                                  ) AS generated_date
                                ) gs ON TRUE
                                WHERE
                                  (
                                    EXTRACT(YEAR FROM sh.to_date) > ${year}
                                    OR (EXTRACT(YEAR FROM sh.to_date) = ${year} AND EXTRACT(MONTH FROM sh.to_date) >= ${month})
                                  )
                                  AND (
                                    EXTRACT(YEAR FROM sh.from_date) < ${year}
                                    OR (EXTRACT(YEAR FROM sh.from_date) = ${year} AND EXTRACT(MONTH FROM sh.from_date) <= ${month})
                                  )
                                ORDER BY gs.generated_date
`;

  const generalHolidayQuery = sql`
                                  SELECT
                                    gh.date,
                                    gh.name
                                  FROM 
                                    hr.general_holidays gh
                                  WHERE
                                    EXTRACT(YEAR FROM gh.date) = ${year}
                                    AND EXTRACT(MONTH FROM gh.date) = ${month}
                                `;

  const query = sql`
                  SELECT 
                    employee.uuid as employee_uuid,
                    users.name as employee_name,
                    employee.start_date,
                    COALESCE(jsonb_agg(
                        DISTINCT jsonb_build_object(
                            'shift_group_uuid',
                            shift_group.uuid,
                            'shift_group_name',
                            shift_group.name,
                            'effective_date',
                            roster.effective_date,
                            'off_days',
                            COALESCE(roster.off_days, '[]'),
                            'created_at',
                            roster.created_at,
                            'start_time',
                            shifts.start_time,
                            'end_time',
                            shifts.end_time
                        )
                    ) FILTER (
                        WHERE
                            shift_group.uuid IS NOT NULL
                    ), '[]') as shift_group,
                    COALESCE(jsonb_agg(
                        jsonb_build_object(
                            'from_date',
                            apply_leave.from_date,
                            'to_date',
                            apply_leave.to_date
                        )
                    ) FILTER (
                        WHERE
                            apply_leave.from_date IS NOT NULL
                            AND apply_leave.to_date IS NOT NULL
                    ), '[]') as applied_leaves
                  FROM 
                    hr.employee 
                  LEFT JOIN
                    hr.users ON employee.user_uuid = users.uuid
                  LEFT JOIN 
                    hr.shift_group ON (SELECT el.type_uuid FROM hr.employee_log el
                      WHERE el.employee_uuid = employee.uuid
                      AND el.type = 'shift_group' AND (
                        EXTRACT(YEAR FROM el.effective_date) <= ${year} AND EXTRACT(MONTH FROM el.effective_date) <= ${month}
                      )
                      ORDER BY el.effective_date DESC
                      LIMIT 1) = shift_group.uuid
                  LEFT JOIN 
                    hr.shifts AS shifts ON shift_group.shifts_uuid = shifts.uuid
                  LEFT JOIN
                    hr.roster ON (
                      (SELECT el.type_uuid FROM hr.employee_log el
                        WHERE el.employee_uuid = employee.uuid
                        AND el.type = 'shift_group' AND (
                          EXTRACT(YEAR FROM el.effective_date) <= ${year} AND EXTRACT(MONTH FROM el.effective_date) <= ${month}
                        )
                        ORDER BY el.effective_date DESC
                        LIMIT 1) = roster.shift_group_uuid
                      AND (
                        EXTRACT(YEAR FROM roster.effective_date) <= ${year} AND EXTRACT(MONTH FROM roster.effective_date) <= ${month}
                      )
                    )
                      LEFT JOIN
                          hr.apply_leave ON (
                              employee.uuid = apply_leave.employee_uuid
                              AND apply_leave.year = ${year}
                              AND (
                                  EXTRACT(YEAR FROM apply_leave.to_date) > ${year}
                                  OR (EXTRACT(YEAR FROM apply_leave.to_date) = ${year} AND EXTRACT(MONTH FROM apply_leave.to_date) >= ${month})
                              )
                              AND (
                                  EXTRACT(YEAR FROM apply_leave.from_date) < ${year}
                                  OR (EXTRACT(YEAR FROM apply_leave.from_date) = ${year} AND EXTRACT(MONTH FROM apply_leave.from_date) <= ${month})
                              )
                          )
                  WHERE 
                    employee.uuid = ${employee_uuid}
                  GROUP BY
                    employee.uuid, users.name
                `;

  const rosterPromise = db.execute(query);
  const specialHolidaysPromise = db.execute(specialHolidaysQuery);
  const generalHolidaysPromise = db.execute(generalHolidayQuery);

  const data = await rosterPromise;
  const specialHolidays = await specialHolidaysPromise;
  const generalHolidays = await generalHolidaysPromise;

  const response = {
    roster: data.rows,
    special_holidays: specialHolidays.rows,
    general_holidays: generalHolidays.rows,
  };

  return c.json(response || [], HSCode.OK);
};
