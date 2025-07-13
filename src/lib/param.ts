import SlugParamsSchema from 'stoker/openapi/schemas/slug-params';
import { z } from 'zod';

const uuid = z.object({
  uuid: z.string().length(15).regex(/^[0-9A-Z]{15}$/i, {
    message: 'Invalid nanoid',
  }),
});

const name = SlugParamsSchema;

export { name, uuid };
