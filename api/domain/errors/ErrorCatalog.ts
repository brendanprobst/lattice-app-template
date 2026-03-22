import { ResultError } from './ResultError';

/**
 * ErrorCatalog - Centralized catalog of domain errors
 * Register new codes here and map them in HttpErrorMapper.
 */
export class ErrorCatalog {
  static readonly THING_NOT_FOUND = ResultError.create(
    'THING_NOT_FOUND',
    'We couldn\'t find that thing. It may have been removed.'
  );

  static readonly THING_NAME_INVALID = ResultError.create(
    'THING_NAME_INVALID',
    'Please provide a non-empty name for the thing.'
  );

  static readonly INTERNAL_SERVER_ERROR = ResultError.create(
    'INTERNAL_SERVER_ERROR',
    'Something went wrong on our end. Please try again later.'
  );

  /**
   * Helper method to create a formatted error from a catalog error with metadata
   */
  static formatError(
    baseError: ResultError,
    metadata: Record<string, string | number>
  ): ResultError {
    return ResultError.create(baseError.code, baseError.message, metadata);
  }
}
