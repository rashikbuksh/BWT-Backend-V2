import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.getLateEmployeeAttendanceReport, handlers.getLateEmployeeAttendanceReport)
  .openapi(routes.getAttendanceReport, handlers.getAttendanceReport)
  .openapi(routes.getMonthlyAttendanceReport, handlers.getMonthlyAttendanceReport)
  .openapi(routes.getOnLeaveEmployeeAttendanceReport, handlers.getOnLeaveEmployeeAttendanceReport);

export default router;
