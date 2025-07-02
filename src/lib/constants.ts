import * as HSPhrases from 'stoker/http-status-phrases';
import { createMessageObjectSchema } from 'stoker/openapi/schemas';

export const ZOD_ERROR_MESSAGES = {
  REQUIRED: 'Required',
  EXPECTED_NUMBER: 'Expected number, received nan',
  NO_UPDATES: 'No updates provided',
};

export const ZOD_ERROR_CODES = {
  INVALID_UPDATES: 'invalid_updates',
};

export const notFoundSchema = createMessageObjectSchema(HSPhrases.NOT_FOUND);
export const unauthorizedSchema = createMessageObjectSchema(HSPhrases.UNAUTHORIZED);

export const noObjectFoundSchema = {
  success: false,
  error: {
    issues: [
      {
        code: ZOD_ERROR_CODES.INVALID_UPDATES,
        path: [],
        message: ZOD_ERROR_MESSAGES.NO_UPDATES,
      },
    ],
    name: 'ZodError',
  },
};
