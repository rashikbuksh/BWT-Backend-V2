import delivery from './delivery';
// import delivery from './delivery';
import hr from './hr';
import store from './store';
import work from './work';
import zkteco from './zkteco';

const other = [
  ...hr,
  ...store,
  ...work,
  ...delivery,
  zkteco,
];

export default other;
