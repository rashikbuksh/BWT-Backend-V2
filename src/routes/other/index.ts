import inventory from '../inventory';
import delivery from './delivery';
import hr from './hr';
import store from './store';
import work from './work';

const other = [
  ...hr,
  ...store,
  ...work,
  ...delivery,
  ...inventory,
];

export default other;
