import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.lateReport, handlers.lateReport)
  .openapi(routes.dailyLateReport, handlers.dailyLateReport);

export default router;
