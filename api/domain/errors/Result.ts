import { ResultError } from './ResultError';

/**
 * Result - A domain entity representing the outcome of an operation
 * Can be either Success or Failure
 */
export class Result<T> {
  private constructor(
    private readonly isSuccess: boolean,
    private readonly value?: T,
    private readonly error?: ResultError
  ) {
    if (isSuccess && error) {
      throw new Error('Cannot create a successful result with an error');
    }
    if (!isSuccess && !error) {
      throw new Error('Cannot create a failed result without an error');
    }
  }

  /**
   * Creates a successful result with a value
   */
  static success<T>(value: T): Result<T> {
    return new Result<T>(true, value, undefined);
  }

  /**
   * Creates a failed result with an error
   */
  static failure<T>(error: ResultError): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  /**
   * Checks if the result is successful
   */
  isFailure(): boolean {
    return !this.isSuccess;
  }

  /**
   * Gets the value if successful, throws if failed
   */
  getValue(): T {
    if (this.isFailure()) {
      throw new Error('Cannot get value from a failed result');
    }
    return this.value!;
  }

  /**
   * Gets the error if failed, throws if successful
   */
  getError(): ResultError {
    if (this.isSuccess) {
      throw new Error('Cannot get error from a successful result');
    }
    return this.error!;
  }

  /**
   * Maps the value if successful, returns failure if failed
   */
  map<U>(fn: (value: T) => U): Result<U> {
    if (this.isFailure()) {
      return Result.failure<U>(this.error!);
    }
    return Result.success(fn(this.value!));
  }

  /**
   * Chains results together
   */
  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    if (this.isFailure()) {
      return Result.failure<U>(this.error!);
    }
    return fn(this.value!);
  }

  /**
   * Executes a function if the result is successful
   */
  onSuccess(fn: (value: T) => void): Result<T> {
    if (this.isSuccess) {
      fn(this.value!);
    }
    return this;
  }

  /**
   * Executes a function if the result is a failure
   */
  onFailure(fn: (error: ResultError) => void): Result<T> {
    if (this.isFailure()) {
      fn(this.error!);
    }
    return this;
  }
}
