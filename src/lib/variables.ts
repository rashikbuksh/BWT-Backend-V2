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

export async function handleImagePatch(newImage: any, oldImagePath: string | undefined, folder: string) {
  if (oldImagePath && typeof newImage === 'object') {
    return await updateFile(newImage, oldImagePath, folder);
  }
  if (typeof newImage === 'object') {
    return await insertFile(newImage, folder);
  }
  return oldImagePath;
}
