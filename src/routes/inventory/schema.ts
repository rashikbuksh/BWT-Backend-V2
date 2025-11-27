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
import * as storeSchema from '../store/schema';
import * as workSchema from '../work/schema';

const inventory = pgSchema('inventory');

export const category = inventory.table('category', {
  uuid: uuid_primary,
  // group_uuid: defaultUUID('group_uuid').references(() => group.uuid),
  name: text('name').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  image: text('image').default(sql`null`),
});

export const typeEnum = pgEnum('type', ['inventory', 'service']);
export const refurbishedEnum = pgEnum('refurbished', ['yes', 'no']);

export const product = inventory.table('product', {
  uuid: uuid_primary,
  title: text('title').default(sql`null`),
  category_uuid: defaultUUID('category_uuid').references(() => category.uuid),
  model_uuid: defaultUUID('model_uuid').references(() => storeSchema.model.uuid),
  warranty_days: integer('warranty_days').default(sql`null`),
  service_warranty_days: integer('service_warranty_days').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const vendor = inventory.table('vendor', {
  uuid: uuid_primary,
  // model_uuid: defaultUUID('model_uuid').references(() => model.uuid),
  name: text('name').notNull(),
  company_name: text('company_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address').notNull(),
  description: text('description').default(sql`null`),
  is_active: boolean('is_active').default(false),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  brand_uuid: defaultUUID('brand_uuid').references(() => storeSchema.brand.uuid).default(sql`null`),
});

export const discountUnitEnum = pgEnum('discount_unit', ['bdt', 'percentage']);

export const unitTypeEnum = pgEnum('unit_type', [
  'percentage',
  'bdt',
]);

export const purchase = inventory.table('purchase', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  vendor_uuid: defaultUUID('vendor_uuid').references(() => vendor.uuid),
  branch_uuid: defaultUUID('branch_uuid').references(() => storeSchema.branch.uuid),
  date: DateTime('date').notNull(),
  payment_mode: text('payment_mode').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const stock = inventory.table('stock', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  warehouse_1: PG_DECIMAL('warehouse_1').default(sql`0`),
  warehouse_2: PG_DECIMAL('warehouse_2').default(sql`0`),
  warehouse_3: PG_DECIMAL('warehouse_3').default(sql`0`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const purchase_entry = inventory.table('purchase_entry', {
  uuid: uuid_primary,
  purchase_uuid: defaultUUID('purchase_uuid').references(() => purchase.uuid),
  product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  serial_no: text('serial_no').notNull(),
  quantity: PG_DECIMAL('quantity').notNull(),
  price_per_unit: PG_DECIMAL('price_per_unit').notNull(),
  discount: PG_DECIMAL('discount').default(sql`0`),
  warehouse_uuid: defaultUUID('warehouse_uuid').references(
    () => storeSchema.warehouse.uuid,
  ),
  rack_uuid: defaultUUID('rack_uuid').references(() => storeSchema.rack.uuid),
  floor_uuid: defaultUUID('floor_uuid').references(() => storeSchema.floor.uuid),
  box_uuid: defaultUUID('box_uuid').references(() => storeSchema.box.uuid),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const purchase_return = inventory.table('purchase_return', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  purchase_uuid: defaultUUID('purchase_uuid').references(() => purchase.uuid),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  warehouse_uuid: defaultUUID('warehouse_uuid').references(
    () => storeSchema.warehouse.uuid,
  ),
});

export const purchase_return_entry = inventory.table('purchase_return_entry', {
  uuid: uuid_primary,
  purchase_return_uuid: defaultUUID('purchase_return_uuid').references(
    () => purchase_return.uuid,
  ),
  quantity: PG_DECIMAL('quantity').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  purchase_entry_uuid: defaultUUID('purchase_entry_uuid').references(
    () => purchase_entry.uuid,
  ),
});

export const internal_transfer = inventory.table('internal_transfer', {
  uuid: uuid_primary,
  id: serial('id').notNull().unique(),
  from_warehouse_uuid: defaultUUID('from_warehouse_uuid').references(
    () => storeSchema.warehouse.uuid,
  ),
  to_warehouse_uuid: defaultUUID('to_warehouse_uuid').references(
    () => storeSchema.warehouse.uuid,
  ),
  rack_uuid: defaultUUID('rack_uuid').references(() => storeSchema.rack.uuid),
  floor_uuid: defaultUUID('floor_uuid').references(() => storeSchema.floor.uuid),
  box_uuid: defaultUUID('box_uuid').references(() => storeSchema.box.uuid),
  quantity: PG_DECIMAL('quantity').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  purchase_entry_uuid: defaultUUID('purchase_entry_uuid').references(
    () => purchase_entry.uuid,
  ),
});

export const product_transfer = inventory.table('product_transfer', {
  id: serial('id').notNull().unique(),
  uuid: uuid_primary,
  // product_uuid: defaultUUID('product_uuid').references(() => product.uuid),
  warehouse_uuid: defaultUUID('warehouse_uuid').references(
    () => storeSchema.warehouse.uuid,
  ),
  order_uuid: defaultUUID('order_uuid').references(
    () => workSchema.order.uuid,
  ),
  quantity: PG_DECIMAL('quantity').notNull(),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid).default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  purchase_entry_uuid: defaultUUID('purchase_entry_uuid').references(
    () => purchase_entry.uuid,
  ),
});

export default inventory;
