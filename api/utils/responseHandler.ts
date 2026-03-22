import { Response } from 'express';
import { Result } from '../domain/errors/Result';
import { HttpErrorMapper } from './httpErrorMapper';
import { ErrorCatalog } from '../domain/errors/ErrorCatalog';
import { Logger } from './logger';

/**
 * ResponseHandler - Utility functions for handling HTTP responses
 */
export class ResponseHandler {
  /**
   * Handles a Result by sending appropriate HTTP response
   * On success: sends 200 with the value
   * On failure: sends appropriate status code based on error type
   */
  static handleResult<T>(result: Result<T>, res: Response): void {
    if (result.isFailure()) {
      const error = result.getError();
      const statusCode = HttpErrorMapper.getStatusCode(error);
      const errorResponse: {
        status: number;
        code: string;
        message: string;
        metadata?: Record<string, unknown>;
      } = {
        status: statusCode,
        code: error.code,
        message: error.message,
      };
      
      // Include metadata for debugging if present
      if (error.metadata && Object.keys(error.metadata).length > 0) {
        errorResponse.metadata = error.metadata;
      }
      
      res.status(statusCode).json({
        error: errorResponse,
      });
      return;
    }

    res.json(result.getValue());
  }

  /**
   * Handles unexpected errors (exceptions) by sending a 500 error response
   * Logs the error for debugging purposes
   */
  static handleError(error: unknown, res: Response): void {
    // Log error for debugging (in production, use proper logging service)
    const errorMessage = error instanceof Error ? error.message : String(error);
    Logger.error(`Unexpected error: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error('Error stack:', error.stack);
    }

    res.status(500).json({
      error: {
        status: 500,
        code: ErrorCatalog.INTERNAL_SERVER_ERROR.code,
        message: ErrorCatalog.INTERNAL_SERVER_ERROR.message,
      },
    });
  }
}
