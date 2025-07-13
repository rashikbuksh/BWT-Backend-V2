import delivery from './delivery';
import hr from './hr';
import store from './store';
import work from './work';

const routes = [
  ...hr,
  ...delivery,
  ...store,
  ...work,
] as const;

export default routes;
