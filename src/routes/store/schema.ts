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
  group_uuid: defaultUUID('group_uuid').references(() => group.uuid),
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
  size_uuid: defaultUUID('size_uuid').references(() => size.uuid),
  name: text('name').notNull(),
  warranty_days: integer('warranty_days').default(sql`null`),
  service_warranty_days: integer('service_warranty_days').notNull(),
  type: typeEnum('type'),
  is_maintaining_stock: boolean('is_maintaining_stock').default(false),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
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

export default store;
