import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, gt, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type {
  CreateRoute,
  GetOneRoute,
  ListRoute,
  PatchRoute,
  RemoveRoute,
  SelectEmployeeLateDayByEmployeeUuidRoute,
  SelectEmployeePunchLogPerDayByEmployeeUuidRoute,
  SelectLateEntryDateByEmployeeUuidRoute,
} from './routes';

import { device_list, employee, punch_log, shift_group, shifts, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(punch_log).values(value).returning({
    name: punch_log.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(punch_log)
    .set(updates)
    .where(eq(punch_log.uuid, uuid))
    .returning({
      name: punch_log.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(punch_log)
    .where(eq(punch_log.uuid, uuid))
    .returning({
      name: punch_log.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { employee_uuid } = c.req.valid('query');

  const punchLogPromise = db
    .select({
      uuid: punch_log.uuid,
      employee_uuid: punch_log.employee_uuid,
      employee_name: users.name,
      device_list_uuid: punch_log.device_list_uuid,
      device_list_name: device_list.name,
      punch_type: punch_log.punch_type,
      punch_time: punch_log.punch_time,
    })
    .from(punch_log)
    .leftJoin(device_list, eq(punch_log.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(punch_log.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(
      employee_uuid ? eq(punch_log.employee_uuid, employee_uuid) : undefined,
    )
    .orderBy(desc(punch_log.punch_time));

  const data = await punchLogPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const punchLogPromise = db
    .select({
      uuid: punch_log.uuid,
      employee_uuid: punch_log.employee_uuid,
      employee_name: users.name,
      device_list_uuid: punch_log.device_list_uuid,
      device_list_name: device_list.name,
      punch_type: punch_log.punch_type,
      punch_time: punch_log.punch_time,
    })
    .from(punch_log)
    .leftJoin(device_list, eq(punch_log.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(punch_log.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(eq(punch_log.uuid, uuid));

  const [data] = await punchLogPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const selectLateEntryDateByEmployeeUuid: AppRouteHandler<SelectLateEntryDateByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const punch_logPromise = db
    .select({
      uuid: punch_log.uuid,
      employee_uuid: punch_log.employee_uuid,
      employee_name: users.name,
      device_list_uuid: punch_log.device_list_uuid,
      device_list_name: device_list.name,
      punch_type: punch_log.punch_type,
      punch_time: punch_log.punch_time,
    })
    .from(punch_log)
    .leftJoin(device_list, eq(punch_log.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(punch_log.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(shift_group, eq(employee.shift_group_uuid, shift_group.uuid))
    .leftJoin(shifts, eq(shift_group.shifts_uuid, shifts.uuid))
    .where(
      and(
        eq(punch_log.employee_uuid, employee_uuid),
        gt(punch_log.punch_time, shifts.late_time),
      ),
    )
    .orderBy(desc(punch_log.punch_time));

  const data = await punch_logPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || [], HSCode.OK);
};

export const selectEmployeePunchLogPerDayByEmployeeUuid: AppRouteHandler<SelectEmployeePunchLogPerDayByEmployeeUuidRoute> = async (c: any) => {
  const { from_date, to_date } = c.req.valid('query');

  const { employee_uuid } = c.req.valid('param');

  // get year and month from the from_date
  const fromDateYear = from_date ? new Date(from_date).getFullYear() : null;
  const fromDateMonth = from_date ? new Date(from_date).getMonth() + 1 : null;
  const toDateYear = to_date ? new Date(to_date).getFullYear() : null;
  const toDateMonth = to_date ? new Date(to_date).getMonth() + 1 : null;

  const SpecialHolidaysQuery = sql`
      SELECT date(gs.generated_date) AS holiday_date, sh.name, 'special' AS holiday_type
      FROM hr.special_holidays sh
      JOIN LATERAL (
        SELECT generate_series(sh.from_date::date, sh.to_date::date, INTERVAL '1 day') AS generated_date
      ) gs ON TRUE
      WHERE
        ${
          fromDateYear && fromDateMonth
            ? sql`(
          EXTRACT(YEAR FROM sh.to_date) > ${fromDateYear}
          OR (EXTRACT(YEAR FROM sh.to_date) = ${fromDateYear} AND EXTRACT(MONTH FROM sh.to_date) >= ${fromDateMonth})
        )`
            : sql`true`
        }
        AND ${
          toDateYear && toDateMonth
            ? sql`(
          EXTRACT(YEAR FROM sh.from_date) < ${toDateYear}
          OR (EXTRACT(YEAR FROM sh.from_date) = ${toDateYear} AND EXTRACT(MONTH FROM sh.from_date) <= ${toDateMonth})
        )`
            : sql`true`
        }
      ORDER BY holiday_date;
    `;

  const generalHolidayQuery = sql`
      SELECT date(date) AS holiday_date, name, 'general' AS holiday_type
      FROM hr.general_holidays
      WHERE
        ${
          fromDateYear && fromDateMonth
            ? sql`(
              EXTRACT(YEAR FROM date) > ${fromDateYear}
              OR (EXTRACT(YEAR FROM date) = ${fromDateYear} AND EXTRACT(MONTH FROM date) >= ${fromDateMonth})
            )`
            : sql`true`
        }
        AND ${
          toDateYear && toDateMonth
            ? sql`(
              EXTRACT(YEAR FROM date) < ${toDateYear}
              OR (EXTRACT(YEAR FROM date) = ${toDateYear} AND EXTRACT(MONTH FROM date) <= ${toDateMonth})
            )`
            : sql`true`
        }
      ORDER BY holiday_date;
    `;

  const specialHolidaysPromise = db.execute(SpecialHolidaysQuery);
  const generalHolidaysPromise = db.execute(generalHolidayQuery);

  const [specialHolidaysResult, generalHolidaysResult] = await Promise.all([
    specialHolidaysPromise,
    generalHolidaysPromise,
  ]);

  const punch_log_query = sql`
      WITH date_series AS (
        SELECT generate_series(${from_date}::date, ${to_date}::date, INTERVAL '1 day')::date AS punch_date
      ),
      user_dates AS (
        SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
        FROM hr.users u
        CROSS JOIN date_series d
      )
      SELECT
        ud.user_uuid,
        ud.employee_name,
        DATE(ud.punch_date) AS punch_date,
        MIN(pl.punch_time) AS entry_time,
        MAX(pl.punch_time) AS exit_time,
        (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8 AS duration_hours
      FROM hr.employee e
      LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
      LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
      WHERE 
        e.uuid = ${employee_uuid}
      GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date
      ORDER BY ud.user_uuid, ud.punch_date;
    `;

  const punch_logPromise = db.execute(punch_log_query);

  const data = await punch_logPromise;

  const response = [{
    data: data?.rows,
    special_holidays: specialHolidaysResult?.rows,
    general_holidays: generalHolidaysResult?.rows,
  }];

  return c.json(response || [], HSCode.OK);
};

export const selectEmployeeLateDayByEmployeeUuid: AppRouteHandler<SelectEmployeeLateDayByEmployeeUuidRoute> = async (c: any) => {
  const { from_date, to_date } = c.req.valid('query');

  const { employee_uuid } = c.req.valid('param');
  const fromDateYear = from_date ? new Date(from_date).getFullYear() : null;
  const fromDateMonth = from_date ? new Date(from_date).getMonth() + 1 : null;
  const toDateYear = to_date ? new Date(to_date).getFullYear() : null;
  const toDateMonth = to_date ? new Date(to_date).getMonth() + 1 : null;

  const SpecialHolidaysQuery = sql`
      SELECT date(gs.generated_date) AS holiday_date, sh.name, 'special' AS holiday_type
      FROM hr.special_holidays sh
      JOIN LATERAL (
        SELECT generate_series(sh.from_date::date, sh.to_date::date, INTERVAL '1 day') AS generated_date
      ) gs ON TRUE
      WHERE
        ${
          fromDateYear && fromDateMonth
            ? sql`(
          EXTRACT(YEAR FROM sh.to_date) > ${fromDateYear}
          OR (EXTRACT(YEAR FROM sh.to_date) = ${fromDateYear} AND EXTRACT(MONTH FROM sh.to_date) >= ${fromDateMonth})
        )`
            : sql`true`
        }
        AND ${
          toDateYear && toDateMonth
            ? sql`(
          EXTRACT(YEAR FROM sh.from_date) < ${toDateYear}
          OR (EXTRACT(YEAR FROM sh.from_date) = ${toDateYear} AND EXTRACT(MONTH FROM sh.from_date) <= ${toDateMonth})
        )`
            : sql`true`
        }
      ORDER BY holiday_date;
    `;

  const generalHolidayQuery = sql`
      SELECT date(date) AS holiday_date, name, 'general' AS holiday_type
      FROM hr.general_holidays
      WHERE
        ${
          fromDateYear && fromDateMonth
            ? sql`(
              EXTRACT(YEAR FROM date) > ${fromDateYear}
              OR (EXTRACT(YEAR FROM date) = ${fromDateYear} AND EXTRACT(MONTH FROM date) >= ${fromDateMonth})
            )`
            : sql`true`
        }
        AND ${
          toDateYear && toDateMonth
            ? sql`(
              EXTRACT(YEAR FROM date) < ${toDateYear}
              OR (EXTRACT(YEAR FROM date) = ${toDateYear} AND EXTRACT(MONTH FROM date) <= ${toDateMonth})
            )`
            : sql`true`
        }
      ORDER BY holiday_date;
    `;

  const specialHolidaysPromise = db.execute(SpecialHolidaysQuery);
  const generalHolidaysPromise = db.execute(generalHolidayQuery);

  const [specialHolidaysResult, generalHolidaysResult] = await Promise.all([
    specialHolidaysPromise,
    generalHolidaysPromise,
  ]);

  const punch_log_query = sql`
      WITH date_series AS (
        SELECT generate_series(${from_date}::date, ${to_date}::date, INTERVAL '1 day')::date AS punch_date
      ),
      user_dates AS (
        SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
        FROM hr.users u
        CROSS JOIN date_series d
      )
      SELECT
        ud.user_uuid,
        ud.employee_name,
        DATE(ud.punch_date) AS punch_date,
        MIN(pl.punch_time) AS entry_time,
        MAX(pl.punch_time) AS exit_time,
        (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8 AS duration_hours
      FROM hr.employee e
      LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
      LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
      LEFT JOIN hr.shift_group sg ON e.shift_group_uuid = sg.uuid
      LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
      WHERE 
        e.uuid = ${employee_uuid}
        AND pl.punch_time > s.late_time
      GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date
      ORDER BY ud.user_uuid, ud.punch_date;
    `;

  const punch_logPromise = db.execute(punch_log_query);

  const data = await punch_logPromise;

  const response = [{
    data: data?.rows,
    special_holidays: specialHolidaysResult?.rows,
    general_holidays: generalHolidaysResult?.rows,
  }];

  return c.json(response || [], HSCode.OK);
};
