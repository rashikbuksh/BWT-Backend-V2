import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getManualEntryDetailsByEmployee, handlers.getManualEntryDetailsByEmployee)
  .openapi(routes.getEmployeeLeaveInformationDetails, handlers.getEmployeeLeaveInformationDetails)
  .openapi(routes.getEmployeeAttendanceReport, handlers.getEmployeeAttendanceReport)
  .openapi(routes.getEmployeeSummaryDetailsByEmployeeUuid, handlers.getEmployeeSummaryDetailsByEmployeeUuid)
  .openapi(routes.updateProfilePicture, handlers.updateProfilePicture)
  .openapi(routes.getBulkShiftForEmployee, handlers.getBulkShiftForEmployee)
  .openapi(routes.postBulkEmployeeInformation, handlers.postBulkEmployeeInformation)
  .openapi(routes.getEmployeeSalaryByFiscalYear, handlers.getEmployeeSalaryByFiscalYear);

export default router;
