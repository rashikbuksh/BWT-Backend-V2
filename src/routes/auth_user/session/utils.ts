import { createSelectSchema } from 'drizzle-zod';

// import { dateTimePattern } from '@/utils';
import { session } from '../schema';

//* crud
export const selectSchema = createSelectSchema(session);
