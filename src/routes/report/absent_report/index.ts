import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.dailyAbsentReport, handlers.dailyAbsentReport)
  .openapi(routes.absentSummaryReport, handlers.absentSummaryReport);

export default router;
