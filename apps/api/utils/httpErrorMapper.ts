import { ResultError } from '@api/domain/errors/ResultError';

/**
 * HttpErrorMapper - Maps domain error codes to HTTP status codes
 */
export class HttpErrorMapper {
  static getStatusCode(error: ResultError): number {
    const statusMap: Record<string, number> = {
      THING_NOT_FOUND: 404,
      THING_NAME_INVALID: 400,
      EMAIL_NOT_APPROVED: 403,
      ALLOWLIST_UNAVAILABLE: 503,
      INTERNAL_SERVER_ERROR: 500,
    };

    return statusMap[error.code] || 500;
  }
}
