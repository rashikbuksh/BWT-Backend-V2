import box from './box';
import branch from './branch';
import brand from './brand';
import category from './category';
import floor from './floor';
import group from './group';
import model from './model';
import product from './product';
import productAttributes from './product_attributes';
import rack from './rack';
import size from './size';
import tags from './tags';
import warehouse from './warehouse';

export default [group, category, brand, size, product, branch, warehouse, rack, floor, box, model, productAttributes, tags] as const;
