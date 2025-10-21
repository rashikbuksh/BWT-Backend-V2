import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.getRooms, handlers.getRooms)
  .openapi(routes.createRoom, handlers.createRoom)
  .openapi(routes.getRoomDetails, handlers.getRoomDetails)
  .openapi(routes.joinRoom, handlers.joinRoom)
  .openapi(routes.leaveRoom, handlers.leaveRoom)
  .openapi(routes.sendMessage, handlers.sendMessage)
  .openapi(routes.getRoomMessages, handlers.getRoomMessages)
  .openapi(routes.getRoomUsers, handlers.getRoomUsers);

export default router;
