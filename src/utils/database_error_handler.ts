import * as HSCode from 'stoker/http-status-codes';

import { createToast } from './return';

export interface DatabaseError {
  code?: string;
  detail?: string;
  message?: string;
  constraint?: string;
  table?: string;
  column?: string;
  hint?: string;
  where?: string;
  cause?: any;
  stack?: string;
  severity?: string;
  routine?: string;
}

// Helper function to log detailed error information
function logDatabaseError(error: DatabaseError, context?: string) {
  console.error('=== Database Error Details ===');
  console.error('Context:', context || 'Unknown operation');
  console.error('Error Code:', error.code);
  console.error('Error Message:', error.message);
  console.error('Error Detail:', error.detail);
  console.error('Constraint:', error.constraint);
  console.error('Table:', error.table);
  console.error('Column:', error.column);
  console.error('Hint:', error.hint);
  console.error('Severity:', error.severity);
  console.error('Routine:', error.routine);

  // Log the cause if it exists (might contain the actual PostgreSQL error)
  if (error.cause) {
    console.error('=== Error Cause ===');
    console.error('Cause Code:', error.cause.code);
    console.error('Cause Message:', error.cause.message);
    console.error('Cause Detail:', error.cause.detail);
    console.error('Cause Constraint:', error.cause.constraint);
    console.error('Cause Table:', error.cause.table);
    console.error('Cause Column:', error.cause.column);
    console.error('Cause Severity:', error.cause.severity);
    console.error('==================');
  }

  console.error('Timestamp:', new Date().toISOString());
  console.error('===============================');
}

export function handleDatabaseError(error: DatabaseError, context?: string) {
  logDatabaseError(error, context);

  // Parse error information from message if code is undefined (Drizzle ORM format)
  const parsedError = { ...error };

  // First, check if the actual PostgreSQL error is in the cause property
  if (!error.code && error.cause && error.cause.code) {
    parsedError.code = error.cause.code;
    parsedError.detail = error.cause.detail;
    parsedError.constraint = error.cause.constraint;
    parsedError.table = error.cause.table;
    parsedError.column = error.cause.column;
    parsedError.hint = error.cause.hint;
    parsedError.severity = error.cause.severity;
  }

  // If still no code, try to parse from the error message
  if (!parsedError.code && error.message) {
    // Try to extract the original PostgreSQL error from the Drizzle error message
    // Look for pattern: error: insert or update on table "users" violates foreign key constraint "constraint_name"
    const violatesMatch = error.message.match(/violates (\w+)(?:\s+key)? constraint "([^"]+)"/);
    if (violatesMatch) {
      const constraintType = violatesMatch[1];
      parsedError.constraint = violatesMatch[2];

      // Map constraint types to PostgreSQL error codes
      if (constraintType === 'foreign') {
        parsedError.code = '23503';
      }
      else if (constraintType === 'unique') {
        parsedError.code = '23505';
      }
      else if (constraintType === 'check') {
        parsedError.code = '23514';
      }
      else if (constraintType === 'not-null') {
        parsedError.code = '23502';
      }

      // Extract more detail about the specific key and table
      const keyDetailMatch = error.message.match(/Key \(([^)]+)\)=\(([^)]+)\) is not present in table "([^"]+)"/);
      if (keyDetailMatch) {
        parsedError.detail = `Key (${keyDetailMatch[1]})=(${keyDetailMatch[2]}) is not present in table "${keyDetailMatch[3]}".`;
      }
    }

    // Also try to extract the table name for better error messages
    const tableMatch = error.message.match(/on table "([^"]+)"/);
    if (tableMatch) {
      parsedError.table = tableMatch[1];
    }

    // Enhanced inference for foreign key errors from query structure
    if (error.message.includes('insert into') && !parsedError.code) {
      // Extract table name
      const insertTableMatch = error.message.match(/insert into "([^"]+)"\.?"([^"]+)"/);
      if (insertTableMatch) {
        const schema = insertTableMatch[1];
        const table = insertTableMatch[2];

        // Common patterns for foreign key violations
        if (table === 'users' && schema === 'hr') {
          // Check if query contains foreign key fields
          if (error.message.includes('department_uuid') || error.message.includes('designation_uuid')) {
            parsedError.code = '23503';

            // Try to determine which constraint based on the data
            if (error.message.includes('department_uuid')) {
              parsedError.constraint = 'users_department_uuid_department_uuid_fk';
              parsedError.detail = 'Department reference does not exist';
            }
            else if (error.message.includes('designation_uuid')) {
              parsedError.constraint = 'users_designation_uuid_designation_uuid_fk';
              parsedError.detail = 'Designation reference does not exist';
            }
          }
        }
      }
    }
  }

  switch (parsedError.code) {
    case '23505': {
      // Unique constraint violation
      let message = 'Record already exists';

      // Extract constraint name for more specific messages
      if (parsedError.constraint) {
        if (parsedError.constraint.includes('email')) {
          message = 'Email address already exists';
        }
        else if (parsedError.constraint.includes('phone')) {
          message = 'Phone number already exists';
        }
        else if (parsedError.constraint.includes('uuid')) {
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

      // Extract more specific information from error detail
      if (parsedError.detail) {
        // Parse detail like: "Key (department_uuid)=(6YR7DuJ5MPGECJy) is not present in table \"department\"."
        const keyMatch = parsedError.detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
        const tableMatch = parsedError.detail.match(/table "([^"]+)"/);

        if (keyMatch && tableMatch) {
          const keyName = keyMatch[1];
          const _keyValue = keyMatch[2]; // Value not used but kept for potential future use
          const tableName = tableMatch[1];

          // Generate user-friendly messages based on the constraint
          if (keyName.includes('department')) {
            message = `Selected department does not exist. Please choose a valid department.`;
          }
          else if (keyName.includes('designation')) {
            message = `Selected designation does not exist. Please choose a valid designation.`;
          }
          else if (keyName.includes('user')) {
            message = `Referenced user does not exist.`;
          }
          else if (keyName.includes('engineer')) {
            message = `Selected engineer does not exist.`;
          }
          else if (keyName.includes('customer')) {
            message = `Referenced customer does not exist.`;
          }
          else {
            message = `Referenced ${tableName} record does not exist.`;
          }
        }
      }

      // Fallback to constraint-based messages if detail parsing fails
      if (message === 'Referenced record not found' && parsedError.constraint) {
        if (parsedError.constraint.includes('department')) {
          message = 'Selected department does not exist';
        }
        else if (parsedError.constraint.includes('designation')) {
          message = 'Selected designation does not exist';
        }
        else if (parsedError.constraint.includes('user')) {
          message = 'Referenced user does not exist';
        }
        else if (parsedError.constraint.includes('engineer')) {
          message = 'Selected engineer does not exist';
        }
        else if (parsedError.constraint.includes('customer')) {
          message = 'Referenced customer does not exist';
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

      if (parsedError.column) {
        message = `${parsedError.column} is required`;
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
      const message = parsedError.detail || parsedError.message || 'Database error occurred';
      return {
        response: createToast('error', message),
        status: HSCode.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

// Convenience function for handling errors in route handlers
export function handleDatabaseErrorInRoute(c: any, error: DatabaseError, context?: string) {
  const { response, status } = handleDatabaseError(error, context);
  return c.json(response, status);
}
