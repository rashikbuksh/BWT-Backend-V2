import * as HSCode from 'stoker/http-status-codes';

import { createToast } from './return';

export interface DatabaseError {
  code?: string;
  detail?: string;
  message?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

export function handleDatabaseError(error: DatabaseError) {
  console.error('Database error:', error);

  switch (error.code) {
    case '23505': {
      // Unique constraint violation
      let message = 'Record already exists';

      // Extract constraint name for more specific messages
      if (error.constraint) {
        if (error.constraint.includes('email')) {
          message = 'Email address already exists';
        }
        else if (error.constraint.includes('phone')) {
          message = 'Phone number already exists';
        }
        else if (error.constraint.includes('uuid')) {
          message = 'Duplicate record found';
        }
      }

      return {
        response: createToast('error', message),
        status: HSCode.CONFLICT,
      };
    }

    case '23503': {
      // Foreign key constraint violation
      let message = 'Referenced record not found';

      if (error.constraint) {
        if (error.constraint.includes('department')) {
          message = 'Department not found';
        }
        else if (error.constraint.includes('designation')) {
          message = 'Designation not found';
        }
        else if (error.constraint.includes('user')) {
          message = 'User not found';
        }
      }

      return {
        response: createToast('error', message),
        status: HSCode.BAD_REQUEST,
      };
    }

    case '23502': {
      // Not null constraint violation
      let message = 'Required field is missing';

      if (error.column) {
        message = `${error.column} is required`;
      }

      return {
        response: createToast('error', message),
        status: HSCode.BAD_REQUEST,
      };
    }

    case '22001': {
      // String data too long
      return {
        response: createToast('error', 'Data too long for field'),
        status: HSCode.BAD_REQUEST,
      };
    }

    case '42703': {
      // Column does not exist
      return {
        response: createToast('error', 'Invalid field specified'),
        status: HSCode.BAD_REQUEST,
      };
    }

    case '42P01': {
      // Table does not exist
      return {
        response: createToast('error', 'Database table not found'),
        status: HSCode.INTERNAL_SERVER_ERROR,
      };
    }

    case '25P02': {
      // Transaction is aborted
      return {
        response: createToast('error', 'Transaction failed - please try again'),
        status: HSCode.INTERNAL_SERVER_ERROR,
      };
    }

    case '53300': {
      // Too many connections
      return {
        response: createToast('error', 'Database busy - please try again'),
        status: HSCode.SERVICE_UNAVAILABLE,
      };
    }

    case '08003':
    case '08006': {
      // Connection does not exist / Connection failure
      return {
        response: createToast('error', 'Database connection lost'),
        status: HSCode.SERVICE_UNAVAILABLE,
      };
    }

    default: {
      // Generic database error
      const message = error.detail || error.message || 'Database error occurred';
      return {
        response: createToast('error', message),
        status: HSCode.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

// Convenience function for handling errors in route handlers
export function handleDatabaseErrorInRoute(c: any, error: DatabaseError) {
  const { response, status } = handleDatabaseError(error);
  return c.json(response, status);
}
