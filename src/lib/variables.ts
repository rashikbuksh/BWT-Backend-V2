import { asc, desc, or, sql } from 'drizzle-orm';
import { char, decimal, timestamp } from 'drizzle-orm/pg-core';

import { insertFile, updateFile } from '@/utils/upload_file';

import type { ColumnProps } from './types';

export function defaultUUID(column = 'uuid') {
  return char(column, {
    length: 15,
  });
}

export const uuid_primary = defaultUUID().primaryKey();

export function DateTime(column: ColumnProps['datetime']) {
  return timestamp(column, {
    mode: 'string',
    withTimezone: false,
  });
}

export function PG_DECIMAL(column: ColumnProps['default']) {
  return decimal(column, {
    precision: 20,
    scale: 4,
  }).notNull();
}

export function PG_DECIMAL_TO_FLOAT(column: any, table = true) {
  if (table) {
    const tableName = column.table[Symbol.for('drizzle:Name')];
    return sql`coalesce(${sql.raw(tableName)}.${sql.raw(column.name)}, 0)::float8`;
  }
  else {
    return sql`${column}::float8`;
  }
}

export function constructSelectAllQuery(
  options: {
    baseQuery: any;
    params: any;
    defaultSortField?: string;
    additionalSearchFields?: string[];
    searchFieldNames?: string;
    field_value?: string;
  },
) {
  let {
    baseQuery,
    params,
    defaultSortField = 'created_at',
    additionalSearchFields = [],
    searchFieldNames,
    field_value,
  } = options;

  const { q, page, limit, sort, orderby } = params;

  const avoidFields = [
    'uuid',
    'id',
    'created_at',
    'updated_at',
    'department_head',
    'appointment_date',
    'resign_date',
    'deadline',
    'published_date',
    'file',
    'cover_image',
    'documents',
    'image',
    'table_name',
    'page_name',
    'programs',
    'type',
    'is_global',
  ];

  // Get search fields from the main table
  const searchFields = Object.keys(baseQuery.config.table[Symbol.for('drizzle:Columns')]).filter(
    field =>
      avoidFields.includes(field) === false,
  );

  // Get table name from baseQuery
  const tableNameSymbol = Object.getOwnPropertySymbols(baseQuery.config.table).find(symbol =>
    symbol.toString().includes('OriginalName'),
  );
  const tableName = tableNameSymbol ? baseQuery.config.table[tableNameSymbol] : '';

  // Include table name with fields for the main table
  const searchFieldsWithTable = searchFields.map(field => `"${tableName}"."${field}"`);

  // Include additional search fields from joined tables
  const joinedTables = baseQuery.config.joins || [];
  joinedTables.forEach((join: any) => {
    const joinTableNameSymbol = Object.getOwnPropertySymbols(join.table).find(symbol =>
      symbol.toString().includes('OriginalName'),
    );

    const joinTableName = joinTableNameSymbol ? join.table[joinTableNameSymbol] : '';

    const joinTableFields = Object.keys(join.table[Symbol.for('drizzle:Columns')]).filter(
      field =>
        avoidFields.includes(field) === false,
    ).filter(field => additionalSearchFields.includes(field));

    const joinFieldsWithTable = joinTableFields.map(field => joinTableName ? `"${joinTableName}"."${field}"` : `"${field}"`);

    searchFieldsWithTable.push(...joinFieldsWithTable);
  });

  // Include additional search fields from joined tables
  const allSearchFields = [...searchFieldsWithTable];

  // Apply search filter
  if (searchFieldNames !== undefined && field_value !== undefined) {
    const matchedSearchFields = allSearchFields.filter(field => field.includes(searchFieldNames));

    const searchConditions = matchedSearchFields
      ? sql`LOWER(CAST(${sql.raw(matchedSearchFields[0])} AS TEXT)) LIKE LOWER(${`%${field_value}%`})`
      : sql``;

    if (searchConditions) {
      baseQuery = baseQuery.where(sql`${or(searchConditions)}`);
    }
  }
  else {
    if (q) {
      const searchConditions = allSearchFields.map((field) => {
        return sql`LOWER(CAST(${sql.raw(field)} AS TEXT)) LIKE LOWER(${`%${q}%`})`;
      });

      if (searchConditions.length > 0) {
        baseQuery = baseQuery.where(sql`${or(...searchConditions)}`);
      }
    }
  }

  // Apply sorting
  if (sort) {
    // const order = orderby === 'asc' ? asc : desc;
    // baseQuery = baseQuery.orderBy(
    //   order(baseQuery.config.table[Symbol.for('drizzle:Columns')][sort]),
    // );
    const order = orderby === 'asc' ? asc : desc;

    // Resolve column definition instead of executing the query
    const mainCols = baseQuery.config.table[Symbol.for('drizzle:Columns')] || {};
    let sortColumn = mainCols[sort];

    if (!sortColumn) {
      const joins = baseQuery.config.joins || [];
      for (const j of joins) {
        const jCols = j.table[Symbol.for('drizzle:Columns')] || {};
        if (jCols[sort]) {
          sortColumn = jCols[sort];
          break;
        }
      }
    }

    if (!sortColumn) {
      sortColumn = mainCols[defaultSortField];
    }

    baseQuery = baseQuery.orderBy(order(sortColumn));
  }
  else {
    baseQuery = baseQuery.orderBy(
      desc(
        baseQuery.config.table[Symbol.for('drizzle:Columns')][
          defaultSortField
        ],
      ),
    );
  }

  // Apply pagination
  if (page && limit) {
    const limitValue = Number(limit); // Set your desired limit per page
    const offset = (Number(page) - 1) * limitValue;
    baseQuery = baseQuery.limit(limitValue).offset(offset);
  }

  return baseQuery;
}

export async function getHolidayCountsDateRange(from_date: string, to_date: string) {
  const db = (await import('@/db')).default;

  const specialHolidaysQuery = sql`
    SELECT COALESCE(SUM(
      CASE 
        WHEN sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date
        THEN LEAST(sh.to_date::date, ${to_date}::date) - GREATEST(sh.from_date::date, ${from_date}::date) + 1
        ELSE 0
      END
    ), 0) AS total_special_holidays
    FROM hr.special_holidays sh
    WHERE sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date`;

  const generalHolidayQuery = sql`
    SELECT COALESCE(COUNT(*), 0) AS total_general_holidays
    FROM hr.general_holidays gh
    WHERE gh.date >= ${from_date}::date AND gh.date <= ${to_date}::date`;

  const [specialResult, generalResult] = await Promise.all([
    db.execute(specialHolidaysQuery),
    db.execute(generalHolidayQuery),
  ]);

  return {
    special: specialResult.rows[0]?.total_special_holidays || 0,
    general: generalResult.rows[0]?.total_general_holidays || 0,
  };
}

export async function getHolidayStatus(date: string) {
  const db = (await import('@/db')).default;

  const generalQ = sql`
    SELECT gh.name
    FROM hr.general_holidays gh
    WHERE gh.date = ${date}::date
    LIMIT 1
  `;

  const specialQ = sql`
    SELECT sh.name
    FROM hr.special_holidays sh
    WHERE ${date}::date BETWEEN sh.from_date::date AND sh.to_date::date
    LIMIT 1
  `;

  const [generalRes, specialRes] = await Promise.all([
    db.execute(generalQ),
    db.execute(specialQ),
  ]);

  const general_name = generalRes.rows[0]?.name ?? null;
  const special_name = specialRes.rows[0]?.name ?? null;

  return {
    is_general_holiday: general_name !== null,
    general_holiday_name: general_name,
    is_special_holiday: special_name !== null,
    special_holiday_name: special_name,
  };
}

export async function getOffDayCountsDateRange(employee_uuid: string, from_date: string, to_date: string) {
  const db = (await import('@/db')).default;

  const offDaysQuery = sql`
    WITH params AS (
      SELECT ${from_date}::date AS start_date, ${to_date}::date AS end_date
    ),
    employee_shift_periods AS (
      SELECT
        el.employee_uuid,
        el.type_uuid AS shift_group_uuid,
        el.effective_date,
        LEAD(el.effective_date) OVER (PARTITION BY el.employee_uuid ORDER BY el.effective_date) AS next_effective_date
      FROM hr.employee_log el
      CROSS JOIN params p
      WHERE el.type = 'shift_group'
        AND el.effective_date <= p.end_date
        AND el.employee_uuid = ${employee_uuid}
    ),
    roster_periods AS (
      SELECT
        esp.employee_uuid,
        r.shift_group_uuid,
        r.effective_date,
        LEAD(r.effective_date) OVER (PARTITION BY r.shift_group_uuid ORDER BY r.effective_date) AS next_effective_date,
        r.off_days::jsonb AS off_days
      FROM employee_shift_periods esp
      JOIN hr.roster r ON r.shift_group_uuid = esp.shift_group_uuid
      CROSS JOIN params p
      WHERE r.effective_date <= p.end_date
    ),
    date_ranges AS (
      SELECT
        employee_uuid,
        shift_group_uuid,
        GREATEST(effective_date, (SELECT start_date FROM params)) AS period_start,
        LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params)) AS period_end,
        off_days
      FROM roster_periods
      WHERE GREATEST(effective_date, (SELECT start_date FROM params)) <= LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params))
    ),
    all_offset_days AS (
      SELECT dr.employee_uuid,
        dr.shift_group_uuid,
        gs::date AS day,
        od.dname
      FROM date_ranges dr
      CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS gs
      CROSS JOIN LATERAL jsonb_array_elements_text(dr.off_days) AS od(dname)
    )
    SELECT COALESCE(COUNT(*), 0) AS total_off_days
    FROM all_offset_days
    WHERE lower(to_char(day, 'Dy')) = lower(dname)
  `;

  const result = await db.execute(offDaysQuery);

  return result.rows[0]?.total_off_days || 0;
}

export async function getEmployeeAttendanceForDate(employee_uuid: string | null, date: string) {
  const db = (await import('@/db')).default;

  const query = sql`
    WITH sg_off_days AS (
      WITH params AS (
        SELECT ${date}::date AS start_date, ${date}::date AS end_date
      ),
      roster_periods AS (
        SELECT r.shift_group_uuid,
          r.effective_date,
          r.off_days::JSONB AS off_days,
          LEAD(r.effective_date) OVER (PARTITION BY r.shift_group_uuid ORDER BY r.effective_date) AS next_effective_date
        FROM hr.roster r
        CROSS JOIN params p
        WHERE r.effective_date <= p.end_date
      ),
      date_ranges AS (
        SELECT shift_group_uuid,
          GREATEST(effective_date, (SELECT start_date FROM params)) AS period_start,
          LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params)) AS period_end,
          off_days
        FROM roster_periods
        WHERE GREATEST(effective_date, (SELECT start_date FROM params)) <= LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params))
      ),
      all_days AS (
        SELECT dr.shift_group_uuid,
          gs::date AS day,
          dr.off_days
        FROM date_ranges dr
        CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS gs
      ),
      expanded AS (
        SELECT shift_group_uuid,
          day,
          TRUE AS is_offday
        FROM all_days
        CROSS JOIN LATERAL jsonb_array_elements_text(off_days) AS od(dname)
        WHERE lower(to_char(day, 'Dy')) = lower(od.dname)
      )
      SELECT * FROM expanded
    ),
    attendance_data AS (
      SELECT
        e.uuid AS employee_uuid,
        u.uuid AS user_uuid,
        u.name AS employee_name,
        s.name AS shift_name,
        s.start_time,
        s.end_time,
        s.late_time,
        s.early_exit_before,
        ${date}::date AS punch_date,
        MIN(pl.punch_time) AS entry_time,
        MAX(pl.punch_time) AS exit_time,
        CASE 
          WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
            (EXTRACT(EPOCH FROM MAX(pl.punch_time)::time - MIN(pl.punch_time)::time) / 3600)::float8
          ELSE NULL
        END AS working_hours,
        CASE
          WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR sod.is_offday OR al.reason IS NOT NULL THEN 0
          ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
        END AS expected_working_hours,
        CASE 
          WHEN MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time > s.late_time::time THEN
            (EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::float8
          ELSE NULL
        END AS late_hours,
        CASE 
          WHEN MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN
            (EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::float8
          ELSE NULL
        END AS early_exit_hours,
        GREATEST(
          COALESCE(
            CASE 
              WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
                (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8
              ELSE 0
            END, 0
          ) - COALESCE(
            CASE
              WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR sod.is_offday OR al.reason IS NOT NULL THEN 0
              ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
            END, 0
          ), 0
        )::float8 AS overtime_hours,
        CASE WHEN gh.date IS NOT NULL THEN TRUE ELSE FALSE END AS is_general_holiday,
        CASE WHEN sp.is_special = 1 THEN TRUE ELSE FALSE END AS is_special_holiday,
        CASE WHEN sod.is_offday THEN TRUE ELSE FALSE END AS is_off_day,
        CASE 
          WHEN gh.date IS NULL AND sp.is_special IS NULL AND sod.is_offday IS NOT TRUE AND al.reason IS NULL 
            AND MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time <= s.late_time::time THEN TRUE
          ELSE FALSE
        END AS is_present,
        CASE 
          WHEN gh.date IS NULL AND sp.is_special IS NULL AND sod.is_offday IS NOT TRUE AND al.reason IS NULL 
            AND MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time > s.late_time::time THEN TRUE
          ELSE FALSE
        END AS is_late,
        CASE 
          WHEN gh.date IS NULL AND sp.is_special IS NULL AND sod.is_offday IS NOT TRUE AND al.reason IS NULL 
            AND MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN TRUE
          ELSE FALSE
        END AS is_early_exit,
        CASE WHEN al.reason IS NOT NULL THEN al.reason ELSE NULL END AS leave_reason,
        dept.department AS department_name,
        des.designation AS designation_name,
        et.name AS employment_type_name,
        w.name AS workplace_name,
        CASE 
          WHEN gh.date IS NULL AND sp.is_special IS NULL AND sod.is_offday IS NOT TRUE AND al.reason IS NULL 
            AND MIN(pl.punch_time) IS NULL THEN TRUE
          ELSE FALSE
        END AS is_absent,
        CASE WHEN me_late.employee_uuid IS NOT NULL THEN TRUE ELSE FALSE END AS is_late_application,
        CASE WHEN me_field.employee_uuid IS NOT NULL THEN TRUE ELSE FALSE END AS is_field_visit
      FROM hr.employee e
      LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = ${date}::date
      LEFT JOIN LATERAL (
        SELECT r.shifts_uuid AS shifts_uuid
        FROM hr.roster r
        WHERE r.shift_group_uuid = (
          SELECT el.type_uuid
          FROM hr.employee_log el
          WHERE el.employee_uuid = e.uuid
            AND el.type = 'shift_group'
            AND el.effective_date::date <= ${date}::date
          ORDER BY el.effective_date DESC
          LIMIT 1
        )
        AND r.effective_date <= ${date}::date
        ORDER BY r.effective_date DESC
        LIMIT 1
      ) sg_sel ON TRUE
      LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
      LEFT JOIN hr.general_holidays gh ON gh.date = ${date}::date
      LEFT JOIN hr.users u ON e.user_uuid = u.uuid
      LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
      LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
      LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
      LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
      LEFT JOIN hr.manual_entry me_late ON me_late.employee_uuid = e.uuid
          AND me_late.entry_time::date = ${date}::date
          AND me_late.approval = 'approved'
          AND me_late.type = 'late_application'
      LEFT JOIN hr.manual_entry me_field ON me_field.employee_uuid = e.uuid
        AND me_field.entry_time::date = ${date}::date
        AND me_field.approval = 'approved'
        AND me_field.type = 'field_visit'
      LEFT JOIN LATERAL (
        SELECT 1 AS is_special
        FROM hr.special_holidays sh
        WHERE ${date}::date BETWEEN sh.from_date::date AND sh.to_date::date
        LIMIT 1
      ) AS sp ON TRUE
      LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid
        AND ${date}::date BETWEEN al.from_date::date AND al.to_date::date
        AND al.approval = 'approved'
      LEFT JOIN sg_off_days sod ON sod.shift_group_uuid = (
        SELECT el.type_uuid
        FROM hr.employee_log el
        WHERE el.employee_uuid = e.uuid
          AND el.type = 'shift_group'
          AND el.effective_date::date <= ${date}::date
        ORDER BY el.effective_date DESC
        LIMIT 1
      ) AND sod.day = ${date}::date
      ${employee_uuid ? sql`WHERE e.uuid = ${employee_uuid}` : sql``}
      GROUP BY e.uuid, u.uuid, u.name, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, gh.date, sp.is_special, sod.is_offday, al.reason, dept.department, des.designation, et.name, w.name, me_late.employee_uuid, me_field.employee_uuid
    )
    SELECT * FROM attendance_data
  `;

  const result = await db.execute(query);

  return result.rows[0] || null;
}

export async function isEmployeeOffDay(employee_uuid: string, date: string): Promise<boolean> {
  const db = (await import('@/db')).default;

  const query = sql`
    WITH sg AS (
      SELECT el.type_uuid AS shift_group_uuid
      FROM hr.employee_log el
      WHERE el.employee_uuid = ${employee_uuid}
        AND el.type = 'shift_group'
        AND el.effective_date::date <= ${date}::date
      ORDER BY el.effective_date DESC
      LIMIT 1
    ),
    roster_sel AS (
      SELECT r.off_days::jsonb AS off_days
      FROM hr.roster r
      JOIN sg ON r.shift_group_uuid = sg.shift_group_uuid
      WHERE r.effective_date <= ${date}::date
      ORDER BY r.effective_date DESC
      LIMIT 1
    ),
    expanded AS (
      SELECT od.dname
      FROM roster_sel rs
      CROSS JOIN LATERAL jsonb_array_elements_text(rs.off_days) AS od(dname)
      WHERE lower(od.dname) = lower(to_char(${date}::date, 'Dy'))
    )
    SELECT CASE WHEN EXISTS (SELECT 1 FROM expanded) THEN TRUE ELSE FALSE END AS is_off_day;
  `;

  const result = await db.execute(query);
  return result.rows[0]?.is_off_day === true;
}

export async function handleImagePatch(newImage: any, oldImagePath: string | undefined, folder: string) {
  if (oldImagePath && typeof newImage === 'object') {
    return await updateFile(newImage, oldImagePath, folder);
  }
  if (typeof newImage === 'object') {
    return await insertFile(newImage, folder);
  }
  return oldImagePath;
}

// export async function getEmployeeAttendanceForDateRange(employee_uuid: string, from_date: string, to_date: string) {
//   const db = (await import('@/db')).default;

//   const query = sql`
//     WITH params AS (
//       SELECT ${from_date}::date AS start_date, ${to_date}::date AS end_date
//     ),
//     dates AS (
//       SELECT generate_series(start_date, end_date, INTERVAL '1 day')::date AS punch_date
//       FROM params
//     ),
//     attendance_data AS (
//       SELECT
//         e.uuid AS employee_uuid,
//         u.uuid AS user_uuid,
//         u.name AS employee_name,
//         s.name AS shift_name,
//         s.start_time,
//         s.end_time,
//         s.late_time,
//         s.early_exit_before,
//         sg.name AS shift_group_name,
//         e.start_date::date,
//         d.punch_date,
//         MIN(pl.punch_time) AS entry_time,
//         MAX(pl.punch_time) AS exit_time,
//         CASE
//           WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
//             (EXTRACT(EPOCH FROM MAX(pl.punch_time)::time - MIN(pl.punch_time)::time) / 3600)::float8
//           ELSE NULL
//         END AS working_hours,
//         CASE
//           WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR hr.is_employee_off_day(e.uuid, d.punch_date)=true OR al.reason IS NOT NULL THEN 0
//           ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
//         END AS expected_working_hours,
//         CASE
//           WHEN MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time > s.late_time::time THEN
//             (EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::float8
//           ELSE NULL
//         END AS late_hours,
//         CASE
//           WHEN MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN
//             (EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::float8
//           ELSE NULL
//         END AS early_exit_hours,
//         GREATEST(
//           COALESCE(
//             CASE
//               WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
//                 (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8
//               ELSE 0
//             END, 0
//           ) - COALESCE(
//             CASE
//               WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR hr.is_employee_off_day(e.uuid, d.punch_date)=true OR al.reason IS NOT NULL THEN 0
//               ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
//             END, 0
//           ), 0
//         )::float8 AS overtime_hours,
//         CASE WHEN gh.date IS NOT NULL THEN TRUE ELSE FALSE END AS is_general_holiday,
//         CASE WHEN sp.is_special = 1 THEN TRUE ELSE FALSE END AS is_special_holiday,
//         CASE WHEN hr.is_employee_off_day(e.uuid, d.punch_date)=true THEN TRUE ELSE FALSE END AS is_off_day,
//         CASE
//           WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
//             AND MIN(pl.punch_time) IS NOT NULL THEN TRUE
//           ELSE FALSE
//         END AS is_present,
//         CASE
//           WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
//             AND MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time > s.late_time::time THEN TRUE
//           ELSE FALSE
//         END AS is_late,
//         CASE
//           WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
//             AND MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN TRUE
//           ELSE FALSE
//         END AS is_early_exit,
//         CASE WHEN al.reason IS NOT NULL THEN al.reason ELSE NULL END AS leave_reason,
//         dept.department AS department_name,
//         des.designation AS designation_name,
//         et.name AS employment_type_name,
//         w.name AS workplace_name,
//         CASE
//           WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
//             AND MIN(pl.punch_time) IS NULL THEN TRUE
//           ELSE FALSE
//         END AS is_absent,
//         CASE WHEN ap_late.employee_uuid IS NOT NULL THEN TRUE ELSE FALSE END AS is_late_application,
//         CASE WHEN me_field.employee_uuid IS NOT NULL THEN TRUE ELSE FALSE END AS is_field_visit
//       FROM hr.employee e
//       CROSS JOIN dates d
//       LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = d.punch_date
//       LEFT JOIN LATERAL (
//         SELECT r.shifts_uuid AS shifts_uuid,
//               r.shift_group_uuid AS shift_group_uuid
//         FROM hr.roster r
//         WHERE r.shift_group_uuid = (
//           SELECT el.type_uuid
//           FROM hr.employee_log el
//           WHERE el.employee_uuid = e.uuid
//             AND el.type = 'shift_group'
//             AND el.effective_date::date <= d.punch_date
//           ORDER BY el.effective_date DESC
//           LIMIT 1
//         )
//         AND r.effective_date <= d.punch_date
//         ORDER BY r.effective_date DESC
//         LIMIT 1
//       ) sg_sel ON TRUE
//       LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
//       LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
//       LEFT JOIN hr.general_holidays gh ON gh.date = d.punch_date
//       LEFT JOIN hr.users u ON e.user_uuid = u.uuid
//       LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
//       LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
//       LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
//       LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
//       LEFT JOIN hr.apply_late ap_late ON ap_late.employee_uuid = e.uuid
//           AND ap_late.date::date = d.punch_date
//           AND ap_late.status = 'approved'
//       LEFT JOIN hr.manual_entry me_field ON me_field.employee_uuid = e.uuid
//         AND me_field.entry_time::date = d.punch_date
//         AND me_field.approval = 'approved'
//         AND me_field.type = 'field_visit'
//       LEFT JOIN LATERAL (
//         SELECT 1 AS is_special
//         FROM hr.special_holidays sh
//         WHERE d.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
//         LIMIT 1
//       ) AS sp ON TRUE
//       LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid
//         AND d.punch_date BETWEEN al.from_date::date AND al.to_date::date
//         AND al.approval = 'approved'
//       GROUP BY e.uuid, u.uuid, u.name, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, gh.date, sp.is_special,al.reason, dept.department, des.designation, et.name, w.name, ap_late.employee_uuid, me_field.employee_uuid, d.punch_date, sg.name, e.start_date
//     )
//     SELECT
//       ad.employee_uuid,
//       ad.user_uuid,
//       ad.employee_name,
//       ad.designation_name,
//       ad.department_name,
//       ad.workplace_name,
//       ad.employment_type_name,
//       ad.start_date,
//       (SELECT COUNT(*) FROM dates)::int AS total_days,
//       COUNT(*) FILTER (WHERE ad.is_present)::float8    AS present_days,
//       COUNT(*) FILTER (WHERE ad.is_late)::float8        AS late_days,
//       COUNT(*) FILTER (WHERE ad.is_early_exit)::float8   AS early_exit_days,
//       COUNT(*) FILTER (WHERE ad.leave_reason IS NOT NULL)::float8  AS leave_days,
//       COUNT(*) FILTER (WHERE ad.is_off_day AND NOT ad.is_general_holiday AND NOT ad.is_special_holiday)::float8 AS off_days,
//       COUNT(*) FILTER (WHERE ad.is_general_holiday)::float8  AS general_holidays,
//       COUNT(*) FILTER (WHERE ad.is_special_holiday)::float8  AS special_holidays,
//       ((SELECT COUNT(*) FROM dates) - COUNT(*) FILTER (WHERE ad.is_off_day OR ad.is_general_holiday OR ad.is_special_holiday OR ad.leave_reason IS NOT NULL))::int AS working_days,
//       COUNT(*) FILTER (WHERE ad.is_absent)::float8       AS absent_days,
//       COUNT(*) FILTER (WHERE ad.is_late_application)::float8  AS approved_lates,
//       COUNT(*) FILTER (WHERE ad.is_field_visit)::float8  AS field_visit_days,
//       -- Sum late_hours only for rows flagged as is_late
//       COALESCE(SUM(ad.late_hours) FILTER (WHERE ad.is_late), 0)::float8      AS total_late_hours,
//       -- Sum early_exit_hours only for rows flagged as is_early_exit
//       COALESCE(SUM(ad.early_exit_hours) FILTER (WHERE ad.is_early_exit), 0)::float8 AS total_early_exit_hours,
//       COALESCE(SUM(ad.working_hours), 0)::float8   AS working_hours,
//       COALESCE(SUM(ad.expected_working_hours), 0)::float8 AS expected_hours,
//       COALESCE(SUM(ad.overtime_hours), 0)::float8  AS overtime_hours
//     FROM attendance_data ad
//     WHERE ${employee_uuid ? sql`ad.employee_uuid = ${employee_uuid}` : sql`TRUE`}
//     GROUP BY ad.employee_uuid, ad.user_uuid, ad.employee_name, ad.designation_name, ad.department_name, ad.workplace_name, ad.employment_type_name, ad.start_date
//     ORDER BY ad.employee_name
//   `;
//   const result = await db.execute(query);

//   return result.rows || [];
// }
