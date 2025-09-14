// import { sql } from 'drizzle-orm';
// import {
//   pgEnum,
//   pgSchema,
//   serial,
//   text,
// } from 'drizzle-orm/pg-core';

// import {
//   DateTime,
//   defaultUUID,
//   PG_DECIMAL,
//   uuid_primary,
// } from '@/lib/variables';

// import * as hrSchema from '../hr/schema';

// const accessories = pgSchema('accessories');

// export const accessoriesOrderStatus = pgEnum('accessories_order_status', [
//   'pending',
//   'rejected',
//   'accepted',
//   'cancel',
// ]);

// export const order = accessories.table('order', {
//   id: serial('id').notNull().unique(),
//   uuid: uuid_primary,
//   user_uuid: defaultUUID('user_uuid').references(() => hrSchema.users.uuid).notNull(),
//   quantity: PG_DECIMAL('quantity').notNull(),
//   description: text('description').default(sql`null`),
//   image_1: text('image_1').default(sql`null`),
//   image_2: text('image_2').default(sql`null`),
//   image_3: text('image_3').default(sql`null`),
//   created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
//   created_at: DateTime('created_at').notNull(),
//   updated_by: defaultUUID('updated_by').references(() => hrSchema.users.uuid),
//   updated_at: DateTime('updated_at').default(sql`null`),
//   remarks: text('remarks').default(sql`null`),
//   status: accessoriesOrderStatus('status').notNull().default('pending'),

// });

// export default accessories;
