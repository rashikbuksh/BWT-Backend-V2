import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgSchema,
  serial,
  text,
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

export const vendor = store.table('vendor', {
  uuid: uuid_primary,
  // model_uuid: defaultUUID('model_uuid').references(() => model.uuid),
  name: text('name').notNull(),
  company_name: text('company_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  description: text('description').default(sql`null`),
  is_active: boolean('is_active').default(false),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  brand_uuid: defaultUUID('brand_uuid').references(() => brand.uuid).default(sql`null`),
});

export const typeEnum = pgEnum('type', ['inventory', 'service']);

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
});

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
});

export const product_image = store.table('product_image', {
  uuid: uuid_primary,
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  variant_uuid: defaultUUID('variant_uuid').references(() => product_variant.uuid).default(sql`null`),
  image: text('image').notNull(),
  is_main: boolean('is_main').default(false),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
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

export const purchase = store.table('purchase', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  vendor_uuid: defaultUUID('vendor_uuid').references(() => vendor.uuid),
  branch_uuid: defaultUUID('branch_uuid').references(() => branch.uuid),
  date: DateTime('date').notNull(),
  payment_mode: text('payment_mode').notNull(),
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

export const purchase_entry = store.table('purchase_entry', {
  uuid: uuid_primary,
  purchase_uuid: defaultUUID('purchase_uuid').references(() => purchase.uuid),
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  serial_no: text('serial_no').notNull(),
  quantity: PG_DECIMAL('quantity').notNull(),
  price_per_unit: PG_DECIMAL('price_per_unit').notNull(),
  discount: PG_DECIMAL('discount').default(sql`0`),
  warehouse_uuid: defaultUUID('warehouse_uuid').references(
    () => warehouse.uuid,
  ),
  rack_uuid: defaultUUID('rack_uuid').references(() => rack.uuid),
  floor_uuid: defaultUUID('floor_uuid').references(() => floor.uuid),
  box_uuid: defaultUUID('box_uuid').references(() => box.uuid),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const purchase_return = store.table('purchase_return', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  purchase_uuid: defaultUUID('purchase_uuid').references(() => purchase.uuid),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  warehouse_uuid: defaultUUID('warehouse_uuid').references(
    () => warehouse.uuid,
  ),
});

export const purchase_return_entry = store.table('purchase_return_entry', {
  uuid: uuid_primary,
  purchase_return_uuid: defaultUUID('purchase_return_uuid').references(
    () => purchase_return.uuid,
  ),
  quantity: PG_DECIMAL('quantity').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  purchase_entry_uuid: defaultUUID('purchase_entry_uuid').references(
    () => purchase_entry.uuid,
  ),
});

export const internal_transfer = store.table('internal_transfer', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  from_warehouse_uuid: defaultUUID('from_warehouse_uuid').references(
    () => warehouse.uuid,
  ),
  to_warehouse_uuid: defaultUUID('to_warehouse_uuid').references(
    () => warehouse.uuid,
  ),
  rack_uuid: defaultUUID('rack_uuid').references(() => rack.uuid),
  floor_uuid: defaultUUID('floor_uuid').references(() => floor.uuid),
  box_uuid: defaultUUID('box_uuid').references(() => box.uuid),
  quantity: PG_DECIMAL('quantity').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  purchase_entry_uuid: defaultUUID('purchase_entry_uuid').references(
    () => purchase_entry.uuid,
  ),
});

export const product_transfer = store.table('product_transfer', {
  id: serial('id').notNull().unique(),
  uuid: uuid_primary,
  // product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  warehouse_uuid: defaultUUID('warehouse_uuid').references(
    () => warehouse.uuid,
  ),
  order_uuid: defaultUUID('order_uuid').references(
    () => workSchema.order.uuid,
  ),
  quantity: PG_DECIMAL('quantity').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  purchase_entry_uuid: defaultUUID('purchase_entry_uuid').references(
    () => purchase_entry.uuid,
  ),
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
  product_serial: text('product_serial').default(sql`null`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
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

export default store;
