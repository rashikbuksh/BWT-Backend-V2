import delivery from './delivery';
import hr from './hr';
import other from './other';
import store from './store';
import work from './work';

const routes = [
  ...hr,
  ...delivery,
  ...store,
  ...work,
  ...other,
] as const;

export default routes;
