// No import of express Response; use a plain object to mock the Response-like interface in tests
import { ResponseHandler } from '@api/utils/responseHandler';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { ResultError } from '@api/domain/errors/ResultError';
import { Logger } from '@api/utils/logger';

/**
 * Mock Response interface - matches Express Response structure needed by ResponseHandler
 * Using 'any' type assertion since we're mocking Express Response in tests
 */
type MockResponse = {
  status: (code: number) => { json: (data: any) => void };
  json: (data: any) => void;
};

describe('ResponseHandler', () => {
  let mockResponse: MockResponse;
  let statusSpy: jest.Mock;
  let jsonSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    } as MockResponse;
  });

  describe('handleResult', () => {
    it('should send success response with 200 status and value', () => {
      const successResult = Result.success({ id: '123', name: 'Test' });
      
      ResponseHandler.handleResult(successResult, mockResponse as any);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({ id: '123', name: 'Test' });
    });

    it('should send success response with null value', () => {
      const successResult = Result.success(null);
      
      ResponseHandler.handleResult(successResult, mockResponse as any);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(null);
    });

    it('should send success response with undefined value', () => {
      const successResult = Result.success(undefined);
      
      ResponseHandler.handleResult(successResult, mockResponse as any);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith(undefined);
    });

    it('should send success response with empty object', () => {
      const successResult = Result.success({});
      
      ResponseHandler.handleResult(successResult, mockResponse as any);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith({});
    });

    it('should send success response with array', () => {
      const successResult = Result.success([1, 2, 3]);
      
      ResponseHandler.handleResult(successResult, mockResponse as any);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should send success response with empty array', () => {
      const successResult = Result.success([]);
      
      ResponseHandler.handleResult(successResult, mockResponse as any);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith([]);
    });

    it('should send success response with string value', () => {
      const successResult = Result.success('simple string');
      
      ResponseHandler.handleResult(successResult, mockResponse as any);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).toHaveBeenCalledWith('simple string');
    });

    it('should send error response with appropriate status code for THING_NOT_FOUND', () => {
      const error = ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id: 'thing-missing' });
      const failureResult = Result.failure(error);

      ResponseHandler.handleResult(failureResult, mockResponse as any);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 404,
          code: 'THING_NOT_FOUND',
          message: error.message,
          metadata: { id: 'thing-missing' },
        },
      });
    });

    it('should send error response with 400 status for validation errors', () => {
      const error = ErrorCatalog.THING_NAME_INVALID;
      const failureResult = Result.failure(error);

      ResponseHandler.handleResult(failureResult, mockResponse as any);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 400,
          code: 'THING_NAME_INVALID',
          message: error.message,
        },
      });
    });

    it('should not include metadata field when error has no metadata', () => {
      const error = ErrorCatalog.THING_NAME_INVALID;
      const failureResult = Result.failure(error);

      ResponseHandler.handleResult(failureResult, mockResponse as any);

      const responseCall = jsonSpy.mock.calls[0][0];
      expect(responseCall.error).not.toHaveProperty('metadata');
    });

    it('should send error response with 500 status for INTERNAL_SERVER_ERROR', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const failureResult = Result.failure(error);

      ResponseHandler.handleResult(failureResult, mockResponse as any);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        },
      });
    });

    it('should send error response with user-friendly message and metadata', () => {
      const error = ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id: 'thing-missing' });
      const failureResult = Result.failure(error);

      ResponseHandler.handleResult(failureResult, mockResponse as any);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 404,
          code: 'THING_NOT_FOUND',
          message: ErrorCatalog.THING_NOT_FOUND.message,
          metadata: { id: 'thing-missing' },
        },
      });
    });

    it('should send error response for unknown error code (defaults to 500)', () => {
      const unknownError = ResultError.create('UNKNOWN_ERROR', 'Unknown error occurred');
      const failureResult = Result.failure(unknownError);

      ResponseHandler.handleResult(failureResult, mockResponse as any);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred',
        },
      });
    });

    it('should handle error with empty message', () => {
      const error = ResultError.create('TEST_ERROR', '');
      const failureResult = Result.failure(error);

      ResponseHandler.handleResult(failureResult, mockResponse as any);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'TEST_ERROR',
          message: '',
        },
      });
    });
  });

  describe('handleError', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      loggerErrorSpy = jest.spyOn(Logger, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    it('should handle Error instance with stack trace', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';

      ResponseHandler.handleError(error, mockResponse as any);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unexpected error: Test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error stack:', error.stack);
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: ErrorCatalog.INTERNAL_SERVER_ERROR.message,
        },
      });
    });

    it('should handle Error instance without stack trace', () => {
      const error = new Error('Test error');
      delete error.stack;

      ResponseHandler.handleError(error, mockResponse as any);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unexpected error: Test error');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: ErrorCatalog.INTERNAL_SERVER_ERROR.message,
        },
      });
    });

    it('should handle non-Error values', () => {
      const error = 'String error';

      ResponseHandler.handleError(error, mockResponse as any);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unexpected error: String error');
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: ErrorCatalog.INTERNAL_SERVER_ERROR.message,
        },
      });
    });

    it('should handle null values', () => {
      ResponseHandler.handleError(null, mockResponse as any);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unexpected error: null');
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: ErrorCatalog.INTERNAL_SERVER_ERROR.message,
        },
      });
    });

    it('should handle undefined values', () => {
      ResponseHandler.handleError(undefined, mockResponse as any);

      expect(loggerErrorSpy).toHaveBeenCalledWith('Unexpected error: undefined');
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: {
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: ErrorCatalog.INTERNAL_SERVER_ERROR.message,
        },
      });
    });
  });
});
