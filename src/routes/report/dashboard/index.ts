import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.getEmployeeAttendanceReport, handlers.getEmployeeAttendanceReport)
  .openapi(routes.getAttendanceReport, handlers.getAttendanceReport)
  .openapi(routes.getMonthlyAttendanceReport, handlers.getMonthlyAttendanceReport)
  .openapi(routes.getDailyEmployeeAttendanceReport, handlers.getDailyEmployeeAttendanceReport);

export default router;
