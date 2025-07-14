import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { info, order } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const orderPromise = db
    .select({
      value: order.uuid,
      label: sql`CONCAT(
            'WO',
            TO_CHAR(${order.created_at}, 'YY'),
            ' - ',
            TO_CHAR(${order.id}, 'FM0000'),
            ' (',
            'WI',
            TO_CHAR(${info.created_at}, 'YY'),
            ' - ',
            TO_CHAR(${info.id}, 'FM0000'),
            ')' , ' - ' ,${users.name} ,' - ' ,${users.phone}
        )`,
    })
    .from(order)
    .leftJoin(
      info,
      eq(order.info_uuid, info.uuid),
    )
    .leftJoin(
      users,
      eq(info.user_uuid, users.uuid),
    );

  const data = await orderPromise;

  return c.json(data, HSCode.OK);
};
