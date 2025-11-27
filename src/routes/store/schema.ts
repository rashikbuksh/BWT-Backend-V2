import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgSchema,
  serial,
  text,
  unique,
} from 'drizzle-orm/pg-core';

import {
  DateTime,
  defaultUUID,
  PG_DECIMAL,
  uuid_primary,
} from '@/lib/variables';
import { DEFAULT_SEQUENCE } from '@/utils/db';

import * as hrSchema from '../hr/schema';
import * as workSchema from '../work/schema';

const store = pgSchema('store');

export const group = store.table('group', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});
export const category = store.table('category', {
  uuid: uuid_primary,
  // group_uuid: defaultUUID('group_uuid').references(() => group.uuid),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  image: text('image').default(sql`null`),
});

export const brand = store.table('brand', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const size = store.table('size', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const model = store.table('model', {
  uuid: uuid_primary,
  brand_uuid: defaultUUID('brand_uuid').references(() => brand.uuid),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const typeEnum = pgEnum('type', ['inventory', 'service']);
export const refurbishedEnum = pgEnum('refurbished', ['yes', 'no']);

export const product = store.table('product', {
  uuid: uuid_primary,
  category_uuid: defaultUUID('category_uuid').references(() => category.uuid),
  model_uuid: defaultUUID('model_uuid').references(() => model.uuid),
  warranty_days: integer('warranty_days').default(sql`null`),
  service_warranty_days: integer('service_warranty_days').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  title: text('title').default(sql`null`),
  specifications_description: text('specifications_description').default(sql`null`),
  care_maintenance_description: text('care_maintenance_description').default(sql`null`),
  attribute_list: text('attribute_list').array().default([]),
  is_published: boolean('is_published').default(false),
  extra_information: text('extra_information').default(sql`null`),
  refurbished: refurbishedEnum('refurbished').default('no'),
  url: text('url').default(sql`null`).unique(),
  is_affiliate: boolean('is_affiliate').default(false),
  is_details_image: boolean('is_details_image').default(false),
});

export const discountUnitEnum = pgEnum('discount_unit', ['bdt', 'percentage']);

export const unitTypeEnum = pgEnum('unit_type', [
  'percentage',
  'bdt',
]);

export const product_variant = store.table('product_variant', {
  uuid: uuid_primary,
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  selling_price: PG_DECIMAL('selling_price').notNull(),
  discount: PG_DECIMAL('discount').default(sql`0`),
  warehouse_1: PG_DECIMAL('warehouse_1').default(sql`0`),
  warehouse_2: PG_DECIMAL('warehouse_2').default(sql`0`),
  warehouse_3: PG_DECIMAL('warehouse_3').default(sql`0`),
  warehouse_4: PG_DECIMAL('warehouse_4').default(sql`0`),
  warehouse_5: PG_DECIMAL('warehouse_5').default(sql`0`),
  warehouse_6: PG_DECIMAL('warehouse_6').default(sql`0`),
  warehouse_7: PG_DECIMAL('warehouse_7').default(sql`0`),
  warehouse_8: PG_DECIMAL('warehouse_8').default(sql`0`),
  warehouse_9: PG_DECIMAL('warehouse_9').default(sql`0`),
  warehouse_10: PG_DECIMAL('warehouse_10').default(sql`0`),
  warehouse_11: PG_DECIMAL('warehouse_11').default(sql`0`),
  warehouse_12: PG_DECIMAL('warehouse_12').default(sql`0`),
  selling_warehouse: PG_DECIMAL('selling_warehouse').default(sql`0`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  index: integer('index').notNull(),
  discount_unit: discountUnitEnum('discount_unit').default('bdt'),
  image: text('image').default(sql`null`),
  is_affiliate: boolean('is_affiliate').default(false),
  commission_rate: PG_DECIMAL('commission_rate').default(sql`0`),
  unit_type: unitTypeEnum('unit_type').default('bdt'),
});

export const product_attributes = store.table('product_attributes', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const product_specification = store.table('product_specification', {
  uuid: uuid_primary,
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  label: text('label').notNull(),
  value: text('value').notNull(),
  index: integer('index').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const product_variant_values_entry = store.table('product_variant_values_entry', {
  uuid: uuid_primary,
  product_variant_uuid: defaultUUID('product_variant_uuid').references(() => product_variant.uuid),
  attribute_uuid: defaultUUID('attribute_uuid').references(() => product_attributes.uuid),
  value: text('value').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const branch = store.table('branch', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  address: text('address').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const stock = store.table('stock', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  warehouse_1: PG_DECIMAL('warehouse_1').default(sql`0`),
  warehouse_2: PG_DECIMAL('warehouse_2').default(sql`0`),
  warehouse_3: PG_DECIMAL('warehouse_3').default(sql`0`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const assignedEnum = pgEnum('assigned', [
  'warehouse_1',
  'warehouse_2',
  'warehouse_3',
  'warehouse_4',
  'warehouse_5',
  'warehouse_6',
  'warehouse_7',
  'warehouse_8',
  'warehouse_9',
  'warehouse_10',
  'warehouse_11',
  'warehouse_12',
]);

export const warehouse = store.table('warehouse', {
  uuid: uuid_primary,
  branch_uuid: defaultUUID('branch_uuid').references(() => branch.uuid),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  assigned: assignedEnum('assigned').default('warehouse_1').unique(),
});

export const rack = store.table('rack', {
  uuid: uuid_primary,
  warehouse_uuid: defaultUUID('warehouse_uuid').references(
    () => warehouse.uuid,
  ),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const floor = store.table('floor', {
  uuid: uuid_primary,
  rack_uuid: defaultUUID('rack_uuid').references(() => rack.uuid),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const box = store.table('box', {
  uuid: uuid_primary,
  floor_uuid: defaultUUID('floor_uuid').references(() => floor.uuid),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const paymentMethodEnum = pgEnum('payment_method', [
  'cod',
  'bkash',
]);

export const order_statusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'completed',
  'cancelled',
]);

export const bill_info_sequence = store.sequence('bill_info_sequence', DEFAULT_SEQUENCE);

export const bill_info = store.table('bill_info', {
  id: integer('id').default(sql`nextval('store.bill_info_sequence')`),
  uuid: uuid_primary,
  user_uuid: defaultUUID('user_uuid').references(() => hrSchema.users.uuid),
  name: text('name').default(sql`null`),
  phone: text('phone').default(sql`null`),
  address: text('address').default(sql`null`),
  city: text('city').default(sql`null`),
  district: text('district').default(sql`null`),
  note: text('note').default(sql`null`),
  is_ship_different: boolean('is_ship_different').default(false),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  email: text('email').default(sql`null`),
  payment_method: paymentMethodEnum('payment_method').default('cod'),
  is_paid: boolean('is_paid').default(false),
  bill_status: order_statusEnum('bill_status').default('pending'),
});

export const ordered = store.table('ordered', {
  uuid: uuid_primary,
  bill_info_uuid: defaultUUID('bill_info_uuid').references(
    () => bill_info.uuid,
  ),
  product_variant_uuid: defaultUUID('product_variant_uuid').references(
    () => product_variant.uuid,
  ),
  quantity: PG_DECIMAL('quantity').notNull(),
  selling_price: PG_DECIMAL('selling_price').notNull(),
  is_paid: boolean('is_paid').default(false),
  order_status: order_statusEnum('order_status').default('pending'),
  // product_serial: text('product_serial').default(sql`null`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  serial_entry: text('serial_entry').array().default([]),
  affiliate_id: integer('affiliate_id').default(sql`null`),
});

export const ship_address = store.table('ship_address', {
  uuid: uuid_primary,
  bill_info_uuid: defaultUUID('bill_info_uuid').references(
    () => bill_info.uuid,
  ),
  name: text('name').default(sql`null`),
  company_name: text('company_name').default(sql`null`),
  phone: text('phone').default(sql`null`),
  address: text('address').default(sql`null`),
  city: text('city').default(sql`null`),
  district: text('district').default(sql`null`),
  zip: text('zip').default(sql`null`),
  note: text('note').default(sql`null`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const accessoriesStatus = pgEnum('accessories_status', [
  'pending',
  'rejected',
  'accepted',
  'cancel',
]);

export const accessories = store.table('accessories', {
  id: serial('id').notNull().unique(),
  uuid: uuid_primary,
  user_uuid: defaultUUID('user_uuid').references(() => hrSchema.users.uuid).notNull(),
  quantity: PG_DECIMAL('quantity').notNull(),
  description: text('description').default(sql`null`),
  image_1: text('image_1').default(sql`null`),
  image_2: text('image_2').default(sql`null`),
  image_3: text('image_3').default(sql`null`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  status: accessoriesStatus('status').notNull().default('pending'),

});

export const review = store.table('review', {
  uuid: uuid_primary,
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  user_uuid: defaultUUID('user_uuid').references(() => hrSchema.users.uuid),
  email: text('email').default(sql`null`),
  name: text('name').default(sql`null`),
  comment: text('comment').notNull(),
  rating: integer('rating').notNull(),
  is_verified: boolean('is_verified').default(false),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  info_uuid: defaultUUID('info_uuid').references(() => workSchema.info.uuid).default(sql`null`),
  accessories_uuid: defaultUUID('accessories_uuid').references(() => accessories.uuid).default(sql`null`),
});

export const forum = store.table('forum', {
  uuid: uuid_primary,
  user_uuid: defaultUUID('user_uuid').references(() => hrSchema.users.uuid),
  name: text('name').default(sql`null`),
  phone: text('phone').default(sql`null`),
  question: text('question').notNull(),
  answer: text('answer').default(sql`null`),
  is_answered: boolean('is_answered').default(false),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  title: text('title').default(sql`null`),
  tags: text('tags').array().default([]),
});

export const tags = store.table('tags', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const affiliate = store.table('affiliate', {
  id: serial('id').notNull(),
  user_uuid: defaultUUID('user_uuid')
    .references(() => hrSchema.users.uuid)
    .notNull(),
  product_variant_uuid: defaultUUID('product_variant_uuid').references(() => product_variant.uuid).notNull(),
  visited: integer('visited').default(0),
  purchased: integer('purchased').default(0),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  commission_rate: PG_DECIMAL('commission_rate').default(sql`0`),
  unit_type: unitTypeEnum('unit_type').default('bdt'),
  remarks: text('remarks').default(sql`null`),

}, table => [unique().on(table.user_uuid, table.product_variant_uuid)]);

export const affiliate_click = store.table('affiliate_click', {
  id: serial('id').notNull(),
  affiliate_id: integer('affiliate_id').notNull(),
  ip_address: text('ip_address').notNull(),
  created_at: DateTime('created_at').notNull(),
});

export const product_image = store.table('product_image', {
  uuid: uuid_primary,
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  image: text('image').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  index: integer('index').notNull().default(sql`0`),
});

export default store;
