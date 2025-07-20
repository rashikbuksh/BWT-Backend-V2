import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.leaveHistoryBalanceReport, handlers.leaveHistoryBalanceReport);

export default router;
