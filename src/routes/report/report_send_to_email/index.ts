import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.reportSendToEmail, handlers.reportSendToEmail)
  .openapi(routes.bulkReportSendToEmail, handlers.bulkReportSendToEmail)
  .openapi(routes.bulkReportSendToEmailWithoutForm, handlers.bulkReportSendToEmailWithoutForm);

export default router;
