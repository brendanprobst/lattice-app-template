import { ResultError } from '../domain/errors/ResultError';

/**
 * HttpErrorMapper - Maps domain error codes to HTTP status codes
 */
export class HttpErrorMapper {
  static getStatusCode(error: ResultError): number {
    const statusMap: Record<string, number> = {
      THING_NOT_FOUND: 404,
      THING_NAME_INVALID: 400,
      INTERNAL_SERVER_ERROR: 500,
    };

    return statusMap[error.code] || 500;
  }
}
