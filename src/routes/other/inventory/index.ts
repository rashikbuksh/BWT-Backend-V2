import category from './category';
import internal_transfer from './internal_transfer';
import product from './product';
import purchase from './purchase';
import purchase_entry from './purchase_entry';
import purchase_return from './purchase_return';
import vendor from './vendor';

export default [
  internal_transfer,
  purchase,
  purchase_entry,
  category,
  product,
  purchase_return,
  vendor,
] as const;
