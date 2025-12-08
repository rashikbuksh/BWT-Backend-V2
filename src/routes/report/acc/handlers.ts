import type { AppRouteHandler } from '@/lib/types';

import { and, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { head } from '@/routes/acc/schema';

import type { BalanceReportRoute, ChartOfAccountsReportRoute, ChartOfAccountsReportTableViewRoute } from './routes';

export const balanceReport: AppRouteHandler<BalanceReportRoute> = async (c: any) => {
  const { from, to, type } = c.req.valid('query');

  const fromDate = from
    ? new Date(from).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const toDate = to
    ? new Date(to).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const year = new Date(toDate).getFullYear();
  const fromYear = new Date(fromDate).getFullYear();
  const ytdStart = `${fromYear}-01-01`;
  // const today = new Date().toISOString().split('T')[0];
  const ytdEnd = toDate;
  const prevYear = year - 1;
  const prevStart = `${prevYear}-01-01`;
  const prevEnd = `${prevYear}-12-31`;

  const headPromise = db
    .select({
      type: head.type,
      headList: sql`(SELECT json_agg(row_to_json(hl))
                FROM (
                    SELECT
                        h.uuid,
                        (COALESCE(h.group_number::text, '') || ' ' || h.name) as head_name,
                        (SELECT json_agg(row_to_json(gl))
                          FROM (
                              SELECT
                                  g.uuid,
                                  (COALESCE(g.group_number::text, '') || ' ' || g.name) as group_name,
                                  (SELECT json_agg(row_to_json(ll))
                                    FROM (
                                        SELECT
                                            l.uuid,
                                            (COALESCE(l.group_number::text, '') || ' ' || l.name) as leader_name,

                                           -- current period sums (filter by voucher entry created_at)
                                            COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${fromDate}::TIMESTAMP AND ${toDate}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'cr' THEN ve.amount ELSE 0 END), 0) as total_credit_current_amount,
                                            COALESCE(
                                              COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${fromDate}::TIMESTAMP AND ${toDate}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'dr' THEN ve.amount ELSE 0 END), 0)
                                              + COALESCE(MAX(CASE WHEN l.created_at BETWEEN ${fromDate}::TIMESTAMP AND ${toDate}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' THEN l.initial_amount ELSE 0 END), 0),
                                            0) as total_debit_current_amount,

                                            -- net for current period (debit - credit)
                                            (
                                              COALESCE(
                                                COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${fromDate}::TIMESTAMP AND ${toDate}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'dr' THEN ve.amount ELSE 0 END), 0)
                                                + COALESCE(MAX(CASE WHEN l.created_at BETWEEN ${fromDate}::TIMESTAMP AND ${toDate}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' THEN l.initial_amount ELSE 0 END), 0),
                                              0)
                                              -
                                              COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${fromDate}::TIMESTAMP AND ${toDate}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'cr' THEN ve.amount ELSE 0 END), 0)
                                            ) as total_net_current_amount,

                                            -- year to date (from Jan 1 of from_date's year up to toDate)
                                            COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${ytdStart}::TIMESTAMP AND ${ytdEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'cr' THEN ve.amount ELSE 0 END), 0) as total_credit_ytd_amount,
                                            COALESCE(
                                              COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${ytdStart}::TIMESTAMP AND ${ytdEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'dr' THEN ve.amount ELSE 0 END), 0)
                                              + COALESCE(MAX(CASE WHEN l.created_at BETWEEN ${ytdStart}::TIMESTAMP AND ${ytdEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' THEN l.initial_amount ELSE 0 END), 0),
                                            0) as total_debit_ytd_amount,

                                            -- net year to date (debit - credit)
                                            (
                                              COALESCE(
                                                COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${ytdStart}::TIMESTAMP AND ${ytdEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'dr' THEN ve.amount ELSE 0 END), 0)
                                                + COALESCE(MAX(CASE WHEN l.created_at BETWEEN ${ytdStart}::TIMESTAMP AND ${ytdEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' THEN l.initial_amount ELSE 0 END), 0),
                                              0)
                                              -
                                              COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${ytdStart}::TIMESTAMP AND ${ytdEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'cr' THEN ve.amount ELSE 0 END), 0)
                                            ) as total_net_ytd_amount,

                                            -- last year (full previous year)
                                            COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${prevStart}::TIMESTAMP AND ${prevEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'cr' THEN ve.amount ELSE 0 END), 0) as total_credit_last_year_amount,
                                            COALESCE(
                                              COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${prevStart}::TIMESTAMP AND ${prevEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'dr' THEN ve.amount ELSE 0 END), 0)
                                              + COALESCE(MAX(CASE WHEN l.created_at BETWEEN ${prevStart}::TIMESTAMP AND ${prevEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' THEN l.initial_amount ELSE 0 END), 0),
                                            0) as total_debit_last_year_amount,

                                            -- net last year (debit - credit)
                                            (
                                              COALESCE(
                                                COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${prevStart}::TIMESTAMP AND ${prevEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'dr' THEN ve.amount ELSE 0 END), 0)
                                                + COALESCE(MAX(CASE WHEN l.created_at BETWEEN ${prevStart}::TIMESTAMP AND ${prevEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' THEN l.initial_amount ELSE 0 END), 0),
                                              0)
                                              -
                                              COALESCE(SUM(CASE WHEN ve.created_at BETWEEN ${prevStart}::TIMESTAMP AND ${prevEnd}::TIMESTAMP + interval '23 hours 59 minutes 59 seconds' AND ve.type = 'cr' THEN ve.amount ELSE 0 END), 0)
                                            ) as total_net_last_year_amount

                                        FROM acc.ledger l
                                        LEFT JOIN acc.voucher_entry ve ON l.uuid = ve.ledger_uuid
                                        WHERE l.group_uuid = g.uuid
                                        GROUP BY l.uuid, l.name
                                    ) ll
                                  ) as leader_list
                              FROM acc.group g
                              WHERE g.head_uuid = h.uuid
                                AND EXISTS (
                                  SELECT 1 FROM acc.ledger l_chk WHERE l_chk.group_uuid = g.uuid
                                )
                          ) gl
                        ) as groupe_list
                    FROM acc.head h
                    WHERE h.type = head.type
                      AND EXISTS (
                        SELECT 1
                        FROM acc.group g_chk
                        JOIN acc.ledger l_chk2 ON l_chk2.group_uuid = g_chk.uuid
                        WHERE g_chk.head_uuid = h.uuid
                      )
                ) hl
            )`.as('head_list'),
    })
    .from(head); // Filter by relevant types;

  const filters = [];

  filters.push(sql`${head.type} IN ('assets', 'liability', 'income', 'expense')
                 AND EXISTS (
                   SELECT 1
                   FROM acc.head h2
                   JOIN acc.group g2 ON g2.head_uuid = h2.uuid
                   JOIN acc.ledger l2 ON l2.group_uuid = g2.uuid
                   WHERE h2.type = ${head.type}
                 )`);

  if (type === 'profit_and_loss') {
    filters.push(sql`${head.type} IN ('income', 'expense')`);
  }
  else if (type === 'balance_sheet') {
    filters.push(sql`${head.type} IN ('assets', 'liability')`);
  }

  if (filters.length > 0) {
    headPromise.where(and(...filters));
  }

  headPromise.groupBy(head.type);

  const data = await headPromise;

  return c.json(data, HSCode.OK);
};

export const chartOfAccountsReport: AppRouteHandler<ChartOfAccountsReportRoute> = async (c: any) => {
  const headPromise = db
    .select({
      name: head.type,
      children: sql`(
            SELECT COALESCE(json_agg(head_obj), '[]'::json) as children
            FROM (
                SELECT
                    json_build_object(
                        'name', (COALESCE(h.group_number::text, '') || ' ' || h.name),
                        'children',
                            COALESCE(
                                (
                                    SELECT json_agg(group_obj)
                                    FROM (
                                        SELECT
                                            json_build_object(
                                                'name', (COALESCE(g.group_number::text, '') || ' ' || g.name),
                                                'account_type', h.type,
                                                'children',
                                                    COALESCE(
                                                        (
                                                            SELECT json_agg(ledger_obj)
                                                            FROM (
                                                                SELECT
                                                                    json_build_object(
                                                                        'name', (COALESCE(l.group_number::text, '') || ' ' || l.name),
                                                                        'account_tag', 'Ledger'
                                                                    ) AS ledger_obj
                                                                FROM acc.ledger l
                                                                WHERE l.group_uuid = g.uuid
                                                                GROUP BY l.uuid, l.name, l.group_number
                                                            ) ledger_obj
                                                        ),
                                                        '[]'::json
                                                    )
                                            ) AS group_obj
                                        FROM acc.group g
                                        WHERE g.head_uuid = h.uuid
                                    ) group_obj
                                ),
                                '[]'::json
                            )
                    ) AS head_obj
                FROM acc.head h
                WHERE h.type = head.type
            ) head_obj
        )`,
    })
    .from(head)
    .where(
      sql`${head.type} IN ('assets', 'liability', 'income', 'expense')`,
    )
    .groupBy(head.type);

  const data = await db.execute(headPromise);

  return c.json(data.rows, HSCode.OK);
};

export const chartOfAccountsReportTableView: AppRouteHandler<ChartOfAccountsReportTableViewRoute> = async (c: any) => {
  const query = sql`
        SELECT
            l.uuid as ledger_uuid,
            COALESCE(l.group_number::text, '') || ' ' || l.name AS ledger_name,
            g.uuid as group_uuid,
            COALESCE(g.group_number::text, '') || ' ' || g.name AS group_name,
            h.uuid as head_uuid,
            COALESCE(h.group_number::text, '') || ' ' || h.name AS head_name,
            h.type
        FROM acc.ledger l
        LEFT JOIN acc.group g ON l.group_uuid = g.uuid
        LEFT JOIN acc.head h ON g.head_uuid = h.uuid
        ORDER BY h.type, h.group_number, g.group_number, l.group_number;
    `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
