import { createRouter } from '@/lib/create_app';

import * as backupHandlers from './backup_handlers';
import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.getRequest, handlers.getRequest)
  .openapi(routes.post, handlers.post)
  .openapi(routes.connectionTest, handlers.connectionTest)
  .openapi(routes.iclockRoot, handlers.iclockRoot)
  .openapi(routes.deviceHealth, handlers.deviceHealth)
  .openapi(routes.addBulkUsers, handlers.addBulkUsers)
  .openapi(routes.customCommand, handlers.customCommand)
  .openapi(routes.clearCommandQueue, handlers.clearCommandQueue)
  .openapi(routes.getQueueStatus, handlers.getQueueStatus)
  .openapi(routes.refreshUsers, handlers.refreshUsers)
  .openapi(routes.getRequest_legacy, handlers.getRequest_legacy)
  .openapi(routes.deviceCmd, handlers.deviceCmd)
  .openapi(routes.deleteUser, handlers.deleteUser)
  .openapi(routes.syncAttendanceLogs, handlers.syncAttendanceLogs)
  .openapi(routes.syncEmployees, handlers.syncEmployees)
  .openapi(routes.addTemporaryUser, handlers.addTemporaryUserHandler)
  .openapi(routes.cancelTemporaryAccess, handlers.cancelTemporaryAccessHandler)
  .openapi(routes.getTemporaryUsersRoute, handlers.getTemporaryUsersHandler)
  .openapi(routes.fullBackup, backupHandlers.fullBackup)
  .openapi(routes.employeeBiometricSyncFromDeviceToBackend, handlers.employeeBiometricSyncFromDeviceToBackend)
  .openapi(routes.employeeBiometricSyncFromBackendToDevice, handlers.employeeBiometricSyncFromBackendToDevice);

export default router;
