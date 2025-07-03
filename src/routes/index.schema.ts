import * as delivery from './delivery/schema';
import * as hr from './hr/schema';

const schema = {
  ...hr,
  ...delivery,
};

export type Schema = typeof schema;

export default schema;
