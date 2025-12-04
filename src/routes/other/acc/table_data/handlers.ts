import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { table_name } = c.req.query();

  console.log('table_name', table_name);

  const option = [
    { value: 'inventory.purchase', label: 'IP' },
  ];

  let result;

  try {
    if (
      [
        'inventory.purchase',
      ].includes(table_name)
    ) {
      result
        = await db.execute(sql`
            SELECT 
              uuid as value,
              concat(${sql.raw(`'${option?.find(val => val.value === table_name)?.label || ''}'`)}, to_char(created_at, 'YY'::text), '-', id::text) as label
            FROM ${sql.raw(table_name)};
          `);
    }
    else if (['hr.users', 'inventory.vendor'].includes(table_name)) {
      result = table_name === 'hr.users'
        ? await db.execute(sql`
        SELECT 
          uuid as value,
          name as label
        FROM ${sql.raw(table_name)}
        WHERE user_type IN ('customer', 'web');
      `)
        : await db.execute(sql`
        SELECT 
          uuid as value,
          company_name as label
        FROM ${sql.raw(table_name)};
      `);
    }

    // Ensure we return an array when no rows are found and a valid HTTP status code
    return c.json(result?.rows || [], 200);
  }
  catch (error) {
    return c.json(error, 500);
  }
};
