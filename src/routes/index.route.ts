import auth_user from './auth_user';
import delivery from './delivery';
import hr from './hr';
import other from './other';
import publicRoute from './publicRoute';
import report from './report';
import store from './store';
import work from './work';

const routes = [
  ...hr,
  ...delivery,
  ...store,
  ...report,
  ...work,
  ...other,
  ...publicRoute,
  ...auth_user,
] as const;

export default routes;
