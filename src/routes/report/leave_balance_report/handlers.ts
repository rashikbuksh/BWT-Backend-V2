import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { LeaveHistoryBalanceReportRoute } from './routes';

export const leaveHistoryBalanceReport: AppRouteHandler<LeaveHistoryBalanceReportRoute> = async (c: any) => {
  const query = sql`
  SELECT
    leave_history.id,
    leave_history.user_id,
    leave_history.start_date,
    leave_history.end_date,
    leave_history.status,
    users.name AS user_name,
    users.email AS user_email
  FROM
    leave_history
  JOIN
    users ON leave_history.user_id = users.id
  WHERE
    leave_history.status = 'approved'
  `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
