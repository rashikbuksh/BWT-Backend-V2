import type { AppRouteHandler } from '@/lib/types';

import { and, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { problem } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { category } = c.req.query();

  const problemPromise = db
    .select({
      value: problem.uuid,
      label: problem.name,
    })
    .from(problem);

  const filters = [];
  if (category) {
    filters.push(eq(problem.category, category));
  }

  if (filters.length > 0) {
    problemPromise.where(and(...filters));
  }

  const data = await problemPromise;

  return c.json(data, HSCode.OK);
};
