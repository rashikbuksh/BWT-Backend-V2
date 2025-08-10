import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { FieldVisitReportRoute } from './routes';

export const fieldVisitReport: AppRouteHandler<FieldVisitReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date, approval, status } = c.req.valid('query');

  const query = sql`
                SELECT
                    me.uuid,
                    me.employee_uuid,
                    u.uuid AS employee_user_uuid,
                    u.name AS employee_name,
                    e.employee_id,
                    d.uuid AS department_uuid,
                    d.department AS department_name,
                    des.uuid AS designation_uuid,
                    des.designation AS designation_name,
                    me.type,
                    me.reason,
                    me.entry_time::time AS entry_time,
                    me.exit_time::time AS exit_time,
                    firstApprover.uuid AS first_approver_uuid,
                    firstApprover.name AS first_approver_name,
                    secondApprover.uuid AS second_approver_uuid,
                    secondApprover.name AS second_approver_name,
                    me.approval AS status,
                    me.created_by AS applied_by_uuid,
                    appliedBy.name AS applied_by_name,
                    me.created_at::date AS applied_date
                FROM hr.manual_entry me
                LEFT JOIN hr.employee e ON me.employee_uuid = e.uuid
                LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                LEFT JOIN hr.department d ON d.uuid = u.department_uuid
                LEFT JOIN hr.designation des ON des.uuid = u.designation_uuid
                LEFT JOIN hr.users firstApprover ON e.first_field_visit_approver_uuid = firstApprover.uuid
                LEFT JOIN hr.users secondApprover ON e.second_field_visit_approver_uuid = secondApprover.uuid
                LEFT JOIN hr.users appliedBy ON me.created_by = appliedBy.uuid
                WHERE me.type = 'field_visit'
                 ${status === 'active'
                    ? sql`AND e.is_resign = false AND e.status = true`
                    : status === 'inactive'
                      ? sql`AND e.is_resign = false AND e.status = false`
                      : status === 'resigned'
                        ? sql`AND e.is_resign = true`
                        : sql`AND e.status = true`}
                ${employee_uuid ? sql`AND me.employee_uuid = ${employee_uuid}` : sql``}
                ${from_date ? sql`AND me.created_at::date >= ${from_date}::date AND me.created_at::date <= ${to_date}::date` : sql``}
                ${approval !== 'undefined' && approval ? sql`AND me.approval = ${approval}` : sql``}`;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
