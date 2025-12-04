import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { head } from '@/routes/acc/schema';

import type { ValueLabelRoute } from './routes';

export const typeOptions = [
  { label: 'Asset', value: 'assets' },
  { label: 'Liability', value: 'liability' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
];

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const headPromise = db.select({
    value: head.uuid,
    name: head.name,
    type: head.type,
  })
    .from(head);

  const data = await headPromise;

  // Map the data to create the label using find from typeOptions
  const mappedData = data.map((item) => {
    const typeLabel
      = typeOptions.find(option => option.value === item.type)
        ?.label || item.type; // Fallback to raw type if no match
    return {
      value: item.value,
      label: `${item.name} (${typeLabel})`,
    };
  });

  return c.json(mappedData || [], HSCode.OK);
};
