import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.balanceReport, handlers.balanceReport)
  .openapi(routes.chartOfAccountsReport, handlers.chartOfAccountsReport)
  .openapi(routes.chartOfAccountsReportTableView, handlers.chartOfAccountsReportTableView);

export default router;
