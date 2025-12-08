import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const balanceReport = createRoute({
  path: '/report/acc/balance-report',
  method: 'get',
  summary: 'Balance Report',
  description: 'Get the balance report for an employee',
  request: {
    query: z.object({
      type: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          name: z.string(),
          headList: z.array(z.any()),
        }),
      ),
      'The balance report',
    ),
  },
  tags,
});

export const chartOfAccountsReport = createRoute({
  path: '/report/acc/chart-of-accounts-report',
  method: 'get',
  summary: 'Chart of Accounts Report',
  description: 'Get the chart of accounts report',
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          name: z.string(),
          children: z.array(z.any()),
        }),
      ),
      'The chart of accounts report',
    ),
  },
  tags,
});

export const chartOfAccountsReportTableView = createRoute({
  path: '/report/acc/chart-of-accounts-report-table-view',
  method: 'get',
  summary: 'Chart of Accounts Report Table View',
  description: 'Get the chart of accounts report in table view',
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          account_name: z.string(),
          account_code: z.string(),
          parent_account: z.string().nullable(),
          account_type: z.string(),
          balance: z.number(),
        }),
      ),
      'The chart of accounts report in table view',
    ),
  },
  tags,
});

export type BalanceReportRoute = typeof balanceReport;
export type ChartOfAccountsReportRoute = typeof chartOfAccountsReport;
export type ChartOfAccountsReportTableViewRoute = typeof chartOfAccountsReportTableView;
