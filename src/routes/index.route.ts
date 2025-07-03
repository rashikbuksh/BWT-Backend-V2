import delivery from './delivery';
import hr from './hr';
import store from './store';

const routes = [
  ...hr,
  ...delivery,
  ...store,
] as const;

export default routes;
