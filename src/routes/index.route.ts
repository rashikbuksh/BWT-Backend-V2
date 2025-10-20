import acc from './acc';
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
  ...acc,
] as const;

export default routes;
