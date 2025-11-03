import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { fiscal_year } from '@/routes/hr/schema';

import type { SalaryReportRoute } from './routes';

export const salaryReport: AppRouteHandler<SalaryReportRoute> = async (c: any) => {
  const { fiscal_year_uuid } = c.req.valid('param');

  const fiscalYear = await db
    .select()
    .from(fiscal_year)
    .where(sql`${fiscal_year.uuid} = ${fiscal_year_uuid}`)
    .limit(1);

  const from_month_raw = fiscalYear[0]?.from_month;

  const from_month = from_month_raw
    ? (() => {
        // parse as UTC to avoid timezone shift for strings like "YYYY-MM-DD HH:mm:ss"
        const iso = `${from_month_raw.replace(' ', 'T')}Z`;
        const d = new Date(iso);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth(); // 0-based
        const lastDay = new Date(Date.UTC(year, month + 1, 0)); // last day of that month (UTC)
        return lastDay.toISOString().slice(0, 10); // "YYYY-MM-DD"
      })()
    : undefined;

  const to_month = fiscalYear[0]?.to_month;

  const query = sql`
               WITH months AS (
                                SELECT
                                  (generate_series(
                                    date_trunc('month', ${from_month}::date),
                                    date_trunc('month', ${to_month}::date),
                                    interval '1 month'
                                  )::date + INTERVAL '1 month' - INTERVAL '1 day')::date AS month_end
                    )
                SELECT
                    e.uuid as employee_uuid,
                    u.uuid AS employee_user_uuid,
                    u.name AS employee_name,
                    e.employee_id,
                    d.uuid AS department_uuid,
                    d.department AS department_name,
                    des.uuid AS designation_uuid,
                    des.designation AS designation_name,
                    e.profile_picture,
                    e.start_date::date,
                    jsonb_object_agg(
                    to_char(m.month_end, 'YYYY-MM-DD'),
                    jsonb_build_object(
                      'salary', COALESCE(ts.total_salary, 0),
                      'tax', COALESCE(tn.new_tds, 0)
                    )
                  ) FILTER (WHERE m.month_end IS NOT NULL) AS months,
                  SUM(COALESCE(ts.total_salary, 0)) AS total_salary,
                  SUM(COALESCE(tn.new_tds, 0)) AS total_tax,
                  fb_info.festival_bonus_info
                FROM hr.employee e
                CROSS JOIN months m
                LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                LEFT JOIN hr.department d ON d.uuid = u.department_uuid
                LEFT JOIN hr.designation des ON des.uuid = u.designation_uuid
                LEFT JOIN hr.festival_bonus fb ON fb.employee_uuid = e.uuid
                LEFT JOIN hr.festival f ON f.uuid = fb.festival_uuid
                LEFT JOIN LATERAL (
                  SELECT SUM(si.amount) AS total_salary
                  FROM hr.salary_increment si
                  WHERE si.employee_uuid = e.uuid AND si.effective_date::date <= m.month_end::date
                ) ts ON true
                LEFT JOIN LATERAL (
                  SELECT si.new_tds::float8 AS new_tds
                  FROM hr.salary_increment si
                  WHERE si.employee_uuid = e.uuid AND si.effective_date::date <= m.month_end::date
                  ORDER BY si.effective_date DESC
                  LIMIT 1
                ) tn ON true
                LEFT JOIN (
                  SELECT 
                        fb.employee_uuid,
                        jsonb_build_object(
                          'festival_uuid', f.uuid,
                          'festival_name', f.name,
                          'festival_religion', f.religion,
                          'special_consideration', fb.special_consideration::float8,
                          'net_payable', fb.net_payable::float8
                        ) AS festival_bonus_info
                  FROM hr.festival_bonus fb
                  LEFT JOIN hr.festival f ON f.uuid = fb.festival_uuid
                  WHERE fb.fiscal_year_uuid = ${fiscal_year_uuid}
                  GROUP BY fb.employee_uuid, f.uuid, f.name, f.religion, fb.special_consideration, fb.net_payable
                ) fb_info ON fb_info.employee_uuid = e.uuid
                GROUP BY
                  e.uuid, u.uuid, u.name, e.employee_id,
                  d.uuid, d.department, des.uuid, des.designation,
                  e.profile_picture, e.start_date, fb_info.festival_bonus_info
                ORDER BY e.uuid;
                `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
