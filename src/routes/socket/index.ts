import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.getSocketStats, handlers.getSocketStats)
  .openapi(routes.getRoomUsers, handlers.getRoomUsersHandler)
  .openapi(routes.getOnlineUsers, handlers.getOnlineUsers)
  .openapi(routes.sendNotification, handlers.sendNotification);

export default router;
