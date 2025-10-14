import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.orderAndProductCount, handlers.orderAndProductCount)
  .openapi(routes.orderDiagnosisCount, handlers.orderDiagnosisCount)
  .openapi(routes.repairCount, handlers.repairCount)
  .openapi(routes.qcCount, handlers.qcCount)
  .openapi(routes.readyForDeliveryCount, handlers.readyForDeliveryCount)
  .openapi(routes.deliveredCount, handlers.deliveredCount)
  .openapi(routes.dashboardReport, handlers.dashboardReport);

export default router;
