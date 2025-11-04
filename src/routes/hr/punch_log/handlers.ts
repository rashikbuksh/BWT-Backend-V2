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

import { department, designation, device_list, employee, punch_log, shifts, users } from '../schema';

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

  const { employee_uuid, date } = c.req.valid('query');

  const punchLogPromise = db
    .select({
      uuid: punch_log.uuid,
      employee_uuid: punch_log.employee_uuid,
      employee_name: users.name,
      device_list_uuid: punch_log.device_list_uuid,
      device_list_name: device_list.name,
      punch_type: punch_log.punch_type,
      punch_time: punch_log.punch_time,
      department_name: department.department,
      designation_name: designation.designation,
      profile_picture: employee.profile_picture,
    })
    .from(punch_log)
    .leftJoin(device_list, eq(punch_log.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(punch_log.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .orderBy(desc(punch_log.punch_time));

  const filters = [];

  if (employee_uuid) {
    filters.push(eq(punch_log.employee_uuid, employee_uuid));
  }

  if (date) {
    filters.push(sql`${punch_log.punch_time}::date = ${date}::date`);
  }

  if (filters.length > 0) {
    punchLogPromise.where(and(...filters));
  }

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
      department_name: department.department,
      designation_name: designation.designation,
    })
    .from(punch_log)
    .leftJoin(device_list, eq(punch_log.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(punch_log.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
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
  // const { employee_uuid } = c.req.valid('param');

  const { employee_uuid, apply_late_uuid } = c.req.valid('query');

  const punch_log_query = sql`
                            SELECT
                              e.uuid AS employee_uuid,
                              e.user_uuid,
                              u.name AS employee_name,
                              d.department AS employee_department_name,
                              des.designation AS employee_designation_name,
                              pl.punch_date,
                              pl.entry_time,
                              pl.exit_time,
                              (EXTRACT(EPOCH FROM pl.exit_time::time - pl.entry_time::time) / 3600)::float8 AS duration_hours,
                              s.late_time::time,
                              (EXTRACT(EPOCH FROM pl.entry_time::time - s.late_time::time) / 3600)::float8 AS late_hours
                            FROM hr.employee e
                            LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                            LEFT JOIN hr.department d ON u.department_uuid = d.uuid
                            LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                            LEFT JOIN 
                                    (
                                      SELECT 
                                        pl.employee_uuid,
                                        DATE(pl.punch_time) AS punch_date,
                                        MIN(pl.punch_time) AS entry_time,
                                        MAX(pl.punch_time) AS exit_time
                                      FROM hr.punch_log pl
                                      LEFT JOIN hr.employee emp ON pl.employee_uuid = emp.uuid
                                      GROUP BY pl.employee_uuid, DATE(pl.punch_time)
                                    ) AS pl ON e.uuid = pl.employee_uuid
                            LEFT JOIN hr.shift_group sg ON (SELECT el.type_uuid
                                                           FROM hr.employee_log el
                                                           WHERE el.employee_uuid = e.uuid
                                                           AND el.type = 'shift_group' AND el.effective_date <= pl.punch_date
                                                           ORDER BY el.effective_date DESC
                                                           LIMIT 1) = sg.uuid
                            LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
                            LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid AND pl.punch_date::date BETWEEN al.from_date::date AND al.to_date::date
                                      AND al.approval = 'approved'
                            LEFT JOIN hr.apply_late al2 ON al2.employee_uuid = e.uuid AND pl.punch_date::date = al2.date::date
                            WHERE ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`true`}
                            AND al.uuid IS NULL
                            AND (al2.uuid IS NULL OR al2.status = 'rejected')
                            AND pl.entry_time::time > s.late_time::time AND pl.punch_date NOT IN (
                              SELECT date FROM hr.apply_late WHERE employee_uuid = e.uuid AND date IS NOT NULL AND (${apply_late_uuid ? sql`uuid != ${apply_late_uuid}` : sql`true`})
                            )
                            AND (
                              (SELECT is_general_holiday FROM hr.is_general_holiday(pl.punch_date)) IS false
                              AND (SELECT is_special_holiday FROM hr.is_special_holiday(pl.punch_date)) IS false
                              AND hr.is_employee_off_day(e.uuid, pl.punch_date) = false
                            )
                            GROUP BY e.user_uuid, u.name, pl.punch_date, pl.entry_time, pl.exit_time, s.late_time, d.department, des.designation, e.uuid
                            ORDER BY pl.punch_date DESC
                            `;

  const punch_logPromise = db.execute(punch_log_query);

  const data = await punch_logPromise;

  return c.json(data?.rows || [], HSCode.OK);
};
