import type { Context } from 'hono';

import * as HSCode from 'stoker/http-status-codes';
import * as HSPhrases from 'stoker/http-status-phrases';

import { ZOD_ERROR_CODES, ZOD_ERROR_MESSAGES } from '@/lib/constants';

export function ObjectNotFound(c: Context) {
  return c.json(
    {
      success: false,
      error: {
        issues: [
          {
            code: ZOD_ERROR_CODES.INVALID_UPDATES,
            path: [],
            message: ZOD_ERROR_MESSAGES.REQUIRED,
          },
        ],
        name: 'ZodError',
      },
    },
    HSCode.UNPROCESSABLE_ENTITY,
  );
}
interface Toast {
  type: 'create' | 'update' | 'delete' | 'error';
  message: string | number;
}

export function DataNotFound(c: Context) {
  const body = {
    toastType: 'not-found',
    message: HSPhrases.NOT_FOUND,
  };

  return c.json(body, HSCode.NOT_FOUND);
}

export function createToast(toastType: Toast['type'], message: Toast['message']) {
  switch (toastType) {
    case 'create':
      return {
        toastType,
        message: `${message} created`,
      };
    case 'update':
      return {
        toastType,
        message: `${message} updated`,
      };
    case 'delete':
      return {
        toastType,
        message: `${message} deleted`,
      };
    case 'error':
      return {
        toastType,
        message: `${message}`,
      };
  }
}
