import acc from './acc';
import chat from './chat';
import delivery from './delivery';
import hr from './hr';
import inventory from './inventory';
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
  ...inventory,
  chat,
] as const;

export default routes;
