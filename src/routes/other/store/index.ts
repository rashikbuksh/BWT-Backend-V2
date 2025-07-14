import box from './box';
import branch from './branch';
import brand from './brand';
import category from './category';
import floor from './floor';
import group from './group';
import internalTransfer from './internal_transfer';
import model from './model';
import product from './product';
import purchase from './purchase';
import purchaseEntry from './purchase_entry';
import purchaseReturn from './purchase_return';
import rack from './rack';
import size from './size';
import stock from './stock';
import vendor from './vendor';
import warehouse from './warehouse';

export default [group, category, brand, size, vendor, product, branch, stock, warehouse, rack, floor, box, purchaseReturn, purchase, internalTransfer, model, purchaseEntry] as const;
