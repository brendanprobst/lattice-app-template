import { HttpErrorMapper } from '@api/utils/httpErrorMapper';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { ResultError } from '@api/domain/errors/ResultError';

describe('HttpErrorMapper', () => {
  describe('getStatusCode', () => {
    it('maps THING_NOT_FOUND to 404', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.THING_NOT_FOUND)).toBe(404);
    });

    it('maps formatted THING_NOT_FOUND to 404', () => {
      const error = ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id: 'x' });
      expect(HttpErrorMapper.getStatusCode(error)).toBe(404);
    });

    it('maps THING_NAME_INVALID to 400', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.THING_NAME_INVALID)).toBe(400);
    });

    it('maps INTERNAL_SERVER_ERROR to 500', () => {
      expect(HttpErrorMapper.getStatusCode(ErrorCatalog.INTERNAL_SERVER_ERROR)).toBe(500);
    });

    it('defaults unknown codes to 500', () => {
      const unknownError = ResultError.create('UNKNOWN_ERROR', 'Unknown error');
      expect(HttpErrorMapper.getStatusCode(unknownError)).toBe(500);
    });
  });

  describe('All ErrorCatalog errors are mapped', () => {
    it('maps each catalog error to 400, 404, or 500', () => {
      const allErrors = [
        ErrorCatalog.THING_NOT_FOUND,
        ErrorCatalog.THING_NAME_INVALID,
        ErrorCatalog.INTERNAL_SERVER_ERROR,
      ];

      allErrors.forEach((error) => {
        const statusCode = HttpErrorMapper.getStatusCode(error);
        expect([400, 404, 500]).toContain(statusCode);
      });
    });
  });
});
