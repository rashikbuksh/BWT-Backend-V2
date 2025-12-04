import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const options = [
    {
      value: 'hr.users',
      label: 'Customers',
    },
    {
      value: 'inventory.purchase',
      label: 'Purchase',
    },
    {
      value: 'inventory.vendor',
      label: 'Vendor',
    },
  ];

  const data = options;

  return c.json(data || [], HSCode.OK);
};
