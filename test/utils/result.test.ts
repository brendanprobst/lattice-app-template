import { Result } from '../../api/domain/errors/Result';
import { ResultError } from '../../api/domain/errors/ResultError';
import { ErrorCatalog } from '../../api/domain/errors/ErrorCatalog';

describe('Result', () => {
  describe('success', () => {
    it('should create a successful result with a value', () => {
      const result = Result.success('test value');
      
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toBe('test value');
    });

    it('should create a successful result with null value', () => {
      const result = Result.success(null);
      
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toBe(null);
    });

    it('should create a successful result with undefined value', () => {
      const result = Result.success(undefined);
      
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toBe(undefined);
    });

    it('should create a successful result with object value', () => {
      const value = { id: '123', name: 'Test' };
      const result = Result.success(value);
      
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toEqual(value);
    });

    it('should create a successful result with array value', () => {
      const value = [1, 2, 3];
      const result = Result.success(value);
      
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toEqual(value);
    });

    it('should create a successful result with number value', () => {
      const result = Result.success(42);
      
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toBe(42);
    });

    it('should create a successful result with boolean value', () => {
      const result = Result.success(true);
      
      expect(result.isFailure()).toBe(false);
      expect(result.getValue()).toBe(true);
    });
  });

  describe('failure', () => {
    it('should create a failed result with an error', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      
      expect(result.isFailure()).toBe(true);
      expect(result.getError()).toBe(error);
    });

    it('should create a failed result with custom error', () => {
      const error = ResultError.create('CUSTOM_ERROR', 'Custom error message');
      const result = Result.failure(error);
      
      expect(result.isFailure()).toBe(true);
      expect(result.getError()).toBe(error);
      expect(result.getError().code).toBe('CUSTOM_ERROR');
      expect(result.getError().message).toBe('Custom error message');
    });

    it('should create a failed result with error containing metadata', () => {
      const error = ResultError.create('ERROR', 'Message', { key: 'value' });
      const result = Result.failure(error);
      
      expect(result.isFailure()).toBe(true);
      expect(result.getError().metadata).toEqual({ key: 'value' });
    });
  });

  describe('constructor validation', () => {
    it('should throw error when creating success with error', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      
      expect(() => {
        // @ts-expect-error - Testing invalid constructor usage
        new Result(true, 'value', error);
      }).toThrow('Cannot create a successful result with an error');
    });

    it('should throw error when creating failure without error', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid constructor usage
        new Result(false, 'value', undefined);
      }).toThrow('Cannot create a failed result without an error');
    });
  });

  describe('getValue', () => {
    it('should return value for successful result', () => {
      const result = Result.success('test');
      expect(result.getValue()).toBe('test');
    });

    it('should throw error when getting value from failed result', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      
      expect(() => result.getValue()).toThrow('Cannot get value from a failed result');
    });
  });

  describe('getError', () => {
    it('should return error for failed result', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      
      expect(result.getError()).toBe(error);
      expect(result.getError().code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should throw error when getting error from successful result', () => {
      const result = Result.success('test');
      
      expect(() => result.getError()).toThrow('Cannot get error from a successful result');
    });
  });

  describe('map', () => {
    it('should transform value for successful result', () => {
      const result = Result.success(5);
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isFailure()).toBe(false);
      expect(mapped.getValue()).toBe(10);
    });

    it('should transform value type for successful result', () => {
      const result = Result.success('hello');
      const mapped = result.map(s => s.length);
      
      expect(mapped.isFailure()).toBe(false);
      expect(mapped.getValue()).toBe(5);
    });

    it('should transform object value for successful result', () => {
      const result = Result.success({ name: 'John', age: 30 });
      const mapped = result.map(user => user.name);
      
      expect(mapped.isFailure()).toBe(false);
      expect(mapped.getValue()).toBe('John');
    });

    it('should return failure unchanged for failed result', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure<number>(error);
      const mapped = result.map(x => x * 2);
      
      expect(mapped.isFailure()).toBe(true);
      expect(mapped.getError()).toBe(error);
    });

    it('should handle null transformation', () => {
      const result = Result.success('test');
      const mapped = result.map(() => null);
      
      expect(mapped.isFailure()).toBe(false);
      expect(mapped.getValue()).toBe(null);
    });

    it('should handle undefined transformation', () => {
      const result = Result.success('test');
      const mapped = result.map(() => undefined);
      
      expect(mapped.isFailure()).toBe(false);
      expect(mapped.getValue()).toBe(undefined);
    });
  });

  describe('flatMap', () => {
    it('should chain successful results', () => {
      const result = Result.success(5);
      const chained = result.flatMap(x => Result.success(x * 2));
      
      expect(chained.isFailure()).toBe(false);
      expect(chained.getValue()).toBe(10);
    });

    it('should chain results with different types', () => {
      const result = Result.success('123');
      const chained = result.flatMap(s => Result.success(parseInt(s, 10)));
      
      expect(chained.isFailure()).toBe(false);
      expect(chained.getValue()).toBe(123);
    });

    it('should return failure when chaining from failed result', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure<number>(error);
      const chained = result.flatMap(x => Result.success(x * 2));
      
      expect(chained.isFailure()).toBe(true);
      expect(chained.getError()).toBe(error);
    });

    it('should return failure when chaining to failed result', () => {
      const result = Result.success(5);
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const chained = result.flatMap(() => Result.failure(error));
      
      expect(chained.isFailure()).toBe(true);
      expect(chained.getError()).toBe(error);
    });

    it('should chain multiple operations', () => {
      const result = Result.success(2);
      const chained = result
        .flatMap(x => Result.success(x * 3))
        .flatMap(x => Result.success(x + 1))
        .flatMap(x => Result.success(x * 2));
      
      expect(chained.isFailure()).toBe(false);
      expect(chained.getValue()).toBe(14); // ((2 * 3) + 1) * 2
    });

    it('should short-circuit on first failure in chain', () => {
      const error1 = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const error2 = ErrorCatalog.INTERNAL_SERVER_ERROR;
      
      const result = Result.success(5);
      const chained = result
        .flatMap(() => Result.failure(error1))
        .flatMap(() => Result.failure(error2));
      
      expect(chained.isFailure()).toBe(true);
      expect(chained.getError()).toBe(error1); // First error, not second
    });
  });

  describe('onSuccess', () => {
    it('should execute callback for successful result', () => {
      const callback = jest.fn();
      const result = Result.success('test');
      
      result.onSuccess(callback);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('test');
    });

    it('should not execute callback for failed result', () => {
      const callback = jest.fn();
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      
      result.onSuccess(callback);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return the same result for chaining', () => {
      const result = Result.success('test');
      const returned = result.onSuccess(() => {});
      
      expect(returned).toBe(result);
    });

    it('should allow multiple onSuccess calls', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const result = Result.success('test');
      
      result.onSuccess(callback1).onSuccess(callback2);
      
      expect(callback1).toHaveBeenCalledWith('test');
      expect(callback2).toHaveBeenCalledWith('test');
    });
  });

  describe('onFailure', () => {
    it('should execute callback for failed result', () => {
      const callback = jest.fn();
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      
      result.onFailure(callback);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(error);
    });

    it('should not execute callback for successful result', () => {
      const callback = jest.fn();
      const result = Result.success('test');
      
      result.onFailure(callback);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return the same result for chaining', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      const returned = result.onFailure(() => {});
      
      expect(returned).toBe(result);
    });

    it('should allow multiple onFailure calls', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      
      result.onFailure(callback1).onFailure(callback2);
      
      expect(callback1).toHaveBeenCalledWith(error);
      expect(callback2).toHaveBeenCalledWith(error);
    });
  });

  describe('isFailure', () => {
    it('should return false for successful result', () => {
      const result = Result.success('test');
      expect(result.isFailure()).toBe(false);
    });

    it('should return true for failed result', () => {
      const error = ErrorCatalog.INTERNAL_SERVER_ERROR;
      const result = Result.failure(error);
      expect(result.isFailure()).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex transformation chain', () => {
      const result = Result.success(10);
      
      const final = result
        .map(x => x * 2)
        .flatMap(x => x > 15 ? Result.success(x.toString()) : Result.failure<string>(ErrorCatalog.INTERNAL_SERVER_ERROR));
      
      expect(final.isFailure()).toBe(false);
      expect(final.getValue()).toBe('20');
    });

    it('should handle error in transformation chain', () => {
      const result = Result.success(5);
      
      const final = result
        .map(x => x * 2)
        .flatMap(x => x > 15 ? Result.success(x.toString()) : Result.failure<string>(ErrorCatalog.INTERNAL_SERVER_ERROR));
      
      expect(final.isFailure()).toBe(true);
      expect(final.getError().code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should combine map and callbacks', () => {
      const successCallback = jest.fn();
      const failureCallback = jest.fn();
      
      const result = Result.success(5)
        .map(x => x * 2)
        .onSuccess(successCallback)
        .onFailure(failureCallback);
      
      expect(successCallback).toHaveBeenCalledWith(10);
      expect(failureCallback).not.toHaveBeenCalled();
      expect(result.getValue()).toBe(10);
    });

    it('should handle error callbacks in chain', () => {
      const successCallback = jest.fn();
      const failureCallback = jest.fn();
      
      const result = Result.success(5)
        .flatMap(() => Result.failure<number>(ErrorCatalog.INTERNAL_SERVER_ERROR))
        .onSuccess(successCallback)
        .onFailure(failureCallback);
      
      expect(successCallback).not.toHaveBeenCalled();
      expect(failureCallback).toHaveBeenCalledWith(ErrorCatalog.INTERNAL_SERVER_ERROR);
      expect(result.isFailure()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string value', () => {
      const result = Result.success('');
      expect(result.getValue()).toBe('');
    });

    it('should handle zero value', () => {
      const result = Result.success(0);
      expect(result.getValue()).toBe(0);
    });

    it('should handle false boolean value', () => {
      const result = Result.success(false);
      expect(result.getValue()).toBe(false);
    });

    it('should handle empty object value', () => {
      const result = Result.success({});
      expect(result.getValue()).toEqual({});
    });

    it('should handle empty array value', () => {
      const result = Result.success([]);
      expect(result.getValue()).toEqual([]);
    });

    it('should handle nested objects', () => {
      const value = { nested: { deep: { value: 'test' } } };
      const result = Result.success(value);
      expect(result.getValue()).toEqual(value);
    });

    it('should handle error with empty code', () => {
      const error = ResultError.create('', 'Empty code error');
      const result = Result.failure(error);
      expect(result.getError().code).toBe('');
    });

    it('should handle error with empty message', () => {
      const error = ResultError.create('ERROR', '');
      const result = Result.failure(error);
      expect(result.getError().message).toBe('');
    });
  });
});
