import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { internal_transfer } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const internalTransferPromise = db
    .select({
      value: internal_transfer.uuid,
      label: sql`CONCAT('SIT',TO_CHAR(${internal_transfer.created_at}, 'YY'),' - ', ${internal_transfer.id})`,
    })
    .from(internal_transfer);

  const data = await internalTransferPromise;

  return c.json(data, HSCode.OK);
};
