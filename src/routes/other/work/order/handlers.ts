import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { info, order } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { is_repair } = c.req.valid('query');
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

  const filters = [];

  if (is_repair === 'true') {
    filters.push(
      and(
        eq(order.is_proceed_to_repair, true),
        eq(order.is_transferred_for_qc, false),
        eq(order.is_ready_for_delivery, false),
      ),
    );
  }

  if (filters.length > 0) {
    orderPromise.where(and(...filters));
  }

  const data = await orderPromise;

  return c.json(data, HSCode.OK);
};
