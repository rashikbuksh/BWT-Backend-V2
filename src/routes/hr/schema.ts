import { relations, sql } from 'drizzle-orm';
import { boolean, pgSchema, text } from 'drizzle-orm/pg-core';

import { DateTime, defaultUUID, uuid_primary } from '@/lib/variables';
import { DEFAULT_OPERATION } from '@/utils/db';

const hr = pgSchema('hr');

//* Department
export const department = hr.table('department', {
  uuid: uuid_primary,
  name: text('name').notNull().unique(),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at'),
  remarks: text('remarks'),
});

//* Designation
export const designation = hr.table('designation', {
  uuid: uuid_primary,
  name: text('name').notNull().unique(),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at'),
  remarks: text('remarks'),
});

//* Users
export const users = hr.table('users', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  department_uuid: defaultUUID('department_uuid').notNull().references(() => department.uuid, DEFAULT_OPERATION),
  designation_uuid: defaultUUID('designation_uuid').notNull().references(() => designation.uuid, DEFAULT_OPERATION),
  email: text('email').notNull().unique(),
  phone: text('phone').default(sql`null`),
  office: text('office').default(sql`null`),
  image: text('image').default(sql`null`),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at'),
  remarks: text('remarks'),
});

//* Auth User

export const auth_user = hr.table('auth_user', {
  uuid: uuid_primary,
  user_uuid: defaultUUID('user_uuid').notNull().references(() => users.uuid, DEFAULT_OPERATION),
  pass: text('pass').notNull(),
  can_access: text('can_access'),
  status: boolean('status').default(false),
  created_at: DateTime('created_at').notNull(),
  updated_at: DateTime('updated_at'),
  remarks: text('remarks'),
});

//* relations
export const hr_department_rel = relations(department, ({ one }) => ({
  department: one(users, {
    fields: [department.uuid],
    references: [users.department_uuid],
  }),
}));

export const hr_designation_rel = relations(designation, ({ one }) => ({
  designation: one(users, {
    fields: [designation.uuid],
    references: [users.designation_uuid],
  }),
}));

export const hr_users_rel = relations(users, ({ one }) => ({
  designation: one(designation, {
    fields: [users.designation_uuid],
    references: [designation.uuid],
  }),
  department: one(department, {
    fields: [users.department_uuid],
    references: [department.uuid],
  }),
}));

export default hr;
