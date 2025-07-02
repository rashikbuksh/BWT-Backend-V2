import { sql } from 'drizzle-orm';
import {
  boolean,
  pgEnum,
  pgSchema,
  serial,
  text,
  unique,
} from 'drizzle-orm/pg-core';

import { DateTime, defaultUUID, uuid_primary } from '@/lib/variables';

import { users } from '../hr/schema';
import { branch } from '../store/schema';
import { order } from '../work/schema';

const delivery = pgSchema('delivery');

export const vehicle = delivery.table('vehicle', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  no: text('no').notNull(),
  created_by: defaultUUID('created_by').references(() => users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const courier = delivery.table(
  'courier',
  {
    uuid: uuid_primary,
    name: text('name').notNull(),
    branch: text('branch').notNull(),
    created_by: defaultUUID('created_by').references(
      () => users.uuid,
    ),
    created_at: DateTime('created_at').notNull(),
    updated_at: DateTime('updated_at').default(sql`null`),
    remarks: text('remarks').default(sql`null`),
  },
  table => [unique().on(table.name, table.branch)],
);

export const challanTypeEnum = pgEnum('challan_type', [
  'customer_pickup',
  'courier_delivery',
  'employee_delivery',
  'vehicle_delivery',
]);

export const challanPaymentMethodEnum = pgEnum('challan_payment_method', [
  'cash',
  'due',
]);

export const challan = delivery.table('challan', {
  id: serial('id').notNull().unique(),
  uuid: uuid_primary,
  customer_uuid: defaultUUID('customer_uuid').references(
    () => users.uuid,
  ),
  challan_type: challanTypeEnum('challan_type').notNull(),
  employee_uuid: defaultUUID('employee_uuid').references(
    () => users.uuid,
  ),
  vehicle_uuid: defaultUUID('vehicle_uuid').references(() => vehicle.uuid),
  courier_uuid: defaultUUID('courier_uuid').references(() => courier.uuid),
  is_delivery_complete: boolean('is_delivery_complete').default(false),
  created_by: defaultUUID('created_by').references(() => users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  payment_method: challanPaymentMethodEnum('challan_payment_method').default(
    'cash',
  ),
  branch_uuid: defaultUUID('branch_uuid').references(
    () => branch.uuid,
  ),
});

export const challan_entry = delivery.table('challan_entry', {
  uuid: uuid_primary,
  challan_uuid: defaultUUID('challan_uuid').references(() => challan.uuid),
  order_uuid: defaultUUID('order_uuid').references(
    () => order.uuid,
  ),
  created_by: defaultUUID('created_by').references(() => users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export default delivery;
