import acc from './acc';
import delivery from './delivery';
import hr from './hr';
import inventory from './inventory';
import store from './store';
import work from './work';

const other = [
  ...hr,
  ...store,
  ...work,
  ...delivery,
  ...inventory,
  ...acc,
];

export default other;
