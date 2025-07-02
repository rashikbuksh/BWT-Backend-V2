import type { UpdateDeleteAction } from 'drizzle-orm/pg-core';

interface Operation { onUpdate: UpdateDeleteAction }

export const DEFAULT_OPERATION: Operation = { onUpdate: 'cascade' };

export const DEFAULT_SEQUENCE = {
  startWith: 1,
  increment: 1,
};
