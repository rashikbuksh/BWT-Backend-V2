import * as delivery from './delivery/schema';
import * as hr from './hr/schema';
import * as store from './store/schema';
import * as work from './work/schema';

const schema = {
  ...hr,
  ...delivery,
  ...store,
  ...work,
};

export type Schema = typeof schema;

export default schema;
