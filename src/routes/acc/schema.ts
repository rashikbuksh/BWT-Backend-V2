import { sql } from 'drizzle-orm';
import { boolean, integer, pgSchema, text } from 'drizzle-orm/pg-core';

import {
  DateTime,
  defaultUUID,
  PG_DECIMAL,
  uuid_primary,
} from '@/lib/variables';
import * as hrSchema from '@/routes/hr/schema';

const acc = pgSchema('acc');

export const currency = acc.table('currency', {
  uuid: uuid_primary,
  currency: text('currency').notNull().unique(),
  currency_name: text('currency_name').notNull(),
  symbol: text('symbol').default(sql`null`),
  conversion_rate: PG_DECIMAL('conversion_rate').default(sql`1`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  default: boolean('default').default(false),
});

export const fiscal_year = acc.table('fiscal_year', {
  uuid: uuid_primary,
  year_no: text('year_no').unique(),
  start_date: DateTime('start_date'),
  end_date: DateTime('end_date'),
  active: boolean('active').default(true),
  locked: boolean('locked').default(true),
  jan_budget: PG_DECIMAL('jan_budget').default(sql`0`),
  feb_budget: PG_DECIMAL('feb_budget').default(sql`0`),
  mar_budget: PG_DECIMAL('mar_budget').default(sql`0`),
  apr_budget: PG_DECIMAL('apr_budget').default(sql`0`),
  may_budget: PG_DECIMAL('may_budget').default(sql`0`),
  jun_budget: PG_DECIMAL('jun_budget').default(sql`0`),
  jul_budget: PG_DECIMAL('jul_budget').default(sql`0`),
  aug_budget: PG_DECIMAL('aug_budget').default(sql`0`),
  sep_budget: PG_DECIMAL('sep_budget').default(sql`0`),
  oct_budget: PG_DECIMAL('oct_budget').default(sql`0`),
  nov_budget: PG_DECIMAL('nov_budget').default(sql`0`),
  dec_budget: PG_DECIMAL('dec_budget').default(sql`0`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  currency_uuid: defaultUUID('currency_uuid').references(() => currency.uuid),
  rate: PG_DECIMAL('rate').default(sql`0`),
});

export const headTypeEnum = acc.enum('headTypeEnum', [
  'assets',
  'liability',
  'income',
  'expense',
]);

export const head = acc.table('head', {
  uuid: uuid_primary,
  name: text('name').notNull().unique(),
  bs: boolean('bs').default(true),
  is_fixed: boolean('is_fixed').default(true),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  type: headTypeEnum('type').default('assets'),
  group_number: text('group_number').default(sql`null`),
  index: integer('index').default(0),
});

export const group = acc.table('group', {
  uuid: uuid_primary,
  name: text('name').notNull(),
  head_uuid: defaultUUID('head_uuid')
    .references(() => head.uuid)
    .notNull(),
  code: text('code'),
  is_fixed: boolean('is_fixed').default(true),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  group_number: text('group_number').default(sql`null`),
  index: integer('index').default(0),
});

export const restrictions_enum = acc.enum('restrictions_enum', [
  'none',
  'non_job',
  'job_expense',
  'job_income',
]);

export const identifierEnum = acc.enum('identifierEnum', [
  'store_maintenance',
  'store_rm',
  'store_accessories',
  'none',
]);

export const ledger_sequence = acc.sequence('ledger_sequence', {
  startWith: 1,
  increment: 1,
});

export const ledger = acc.table('ledger', {
  uuid: uuid_primary,
  id: integer('id').default(sql`nextval('acc.ledger_sequence')`),
  table_name: text('table_name').default(sql`null`),
  table_uuid: text('table_uuid').default(sql`null`),
  name: text('name').notNull().unique(),
  account_no: text('account_no').default(sql`null`),
  // type: type_enum('type').notNull(),
  is_active: boolean('is_active').default(true),
  restrictions: restrictions_enum('restrictions').default('none'),
  group_uuid: defaultUUID('group_uuid').references(() => group.uuid),
  vat_deduction: PG_DECIMAL('vat_deduction').default(sql`0`),
  tax_deduction: PG_DECIMAL('tax_deduction').default(sql`0`),
  old_ledger_id: integer('old_ledger_id').default(sql`null`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  narration: text('narration').default(sql`null`),
  is_bank_ledger: boolean('is_bank_ledger').default(false),
  is_cash_ledger: boolean('is_cash_ledger').default(false),
  identifier: identifierEnum('identifier').default('none'),
  initial_amount: PG_DECIMAL('initial_amount').default(sql`0`),
  group_number: text('group_number').default(sql`null`),
  index: integer('index').default(0),
});

export const cost_center = acc.table('cost_center', {
  uuid: uuid_primary,
  name: text('name').notNull().unique(),
  ledger_uuid: defaultUUID('ledger_uuid').references(() => ledger.uuid),
  table_name: text('table_name').default(sql`null`),
  table_uuid: text('table_uuid').default(sql`null`),
  invoice_no: text('invoice_no').default(sql`null`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export const category_enum = acc.enum('category_enum', [
  'contra',
  'payment',
  'receipt',
  'journal',
  'sales',
  'purchase',
  'others',
]);

export const voucher_sequence = acc.sequence('voucher_sequence', {
  startWith: 1,
  increment: 1,
});

export const voucher = acc.table('voucher', {
  id: integer('id').default(sql`nextval('acc.voucher_sequence')`),
  uuid: uuid_primary,
  date: DateTime('date').notNull(),
  category: category_enum('category').notNull(),
  vat_deduction: PG_DECIMAL('vat_deduction').default(sql`0`),
  tax_deduction: PG_DECIMAL('tax_deduction').default(sql`0`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  narration: text('narration').default(sql`null`),
  currency_uuid: defaultUUID('currency_uuid').references(() => currency.uuid),
  conversion_rate: PG_DECIMAL('conversion_rate').default(sql`1`),
});

export const voucher_entry_type_enum = acc.enum('voucher_entry_type_enum', [
  'dr',
  'cr',
]);

export const voucher_entry = acc.table('voucher_entry', {
  uuid: uuid_primary,
  index: integer('index').notNull(),
  ledger_uuid: defaultUUID('ledger_uuid')
    .references(() => ledger.uuid)
    .notNull(),
  type: voucher_entry_type_enum('type').notNull(),
  amount: PG_DECIMAL('amount').default(sql`0`),
  is_need_cost_center: boolean('is_need_cost_center').default(false),
  is_payment: boolean('is_payment').default(false),
  description: text('description').default(sql`null`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
  voucher_uuid: defaultUUID('voucher_uuid')
    .references(() => voucher.uuid)
    .notNull(),
});

export const voucher_entry_cost_center = acc.table(
  'voucher_entry_cost_center',
  {
    uuid: uuid_primary,
    index: integer('index').notNull(),
    voucher_entry_uuid: defaultUUID('voucher_entry_uuid')
      .references(() => voucher_entry.uuid)
      .notNull(),
    cost_center_uuid: defaultUUID('cost_center_uuid')
      .references(() => cost_center.uuid)
      .notNull(),
    amount: PG_DECIMAL('amount').default(sql`0`),
    created_by: defaultUUID('created_by').references(
      () => hrSchema.users.uuid,
    ),
    created_at: DateTime('created_at').notNull(),
    updated_by: defaultUUID('updated_by')
      .references(() => hrSchema.users.uuid)
      .default(sql`null`),
    updated_at: DateTime('updated_at').default(sql`null`),
    remarks: text('remarks').default(sql`null`),
  },
);

export const payment_type_enum = acc.enum('payment_type_enum', [
  'cash',
  'cheque',
  'rtgs',
  'npsb',
  'mfs',
]);

export const voucher_entry_payment = acc.table('voucher_entry_payment', {
  uuid: uuid_primary,
  index: integer('index').notNull(),
  voucher_entry_uuid: defaultUUID('voucher_entry_uuid')
    .references(() => voucher_entry.uuid)
    .notNull(),

  payment_type: payment_type_enum('payment_type').default('cash'),
  trx_no: text('trx_no').default(sql`null`),
  date: DateTime('date').default(sql`null`),
  amount: PG_DECIMAL('amount').default(sql`0`),
  created_by: defaultUUID('created_by').references(() => hrSchema.users.uuid),
  created_at: DateTime('created_at').notNull(),
  updated_by: defaultUUID('updated_by')
    .references(() => hrSchema.users.uuid)
    .default(sql`null`),
  updated_at: DateTime('updated_at').default(sql`null`),
  remarks: text('remarks').default(sql`null`),
});

export default acc;
