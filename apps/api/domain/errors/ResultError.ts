/**
 * ResultError - Domain entity representing an error with a code and message
 */
export class ResultError {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly metadata?: Record<string, unknown>
  ) {}

  /**
   * Creates a ResultError with formatted message
   */
  static create(code: string, message: string, metadata?: Record<string, unknown>): ResultError {
    return new ResultError(code, message, metadata);
  }

  /**
   * Formats the message with provided values
   */
  formatMessage(values: Record<string, string | number>): string {
    let formatted = this.message;
    for (const [key, value] of Object.entries(values)) {
      const token = `{${key}}`;
      formatted = formatted.split(token).join(String(value));
    }
    return formatted;
  }

  /**
   * Creates a copy with updated metadata
   */
  withMetadata(metadata: Record<string, unknown>): ResultError {
    return new ResultError(this.code, this.message, { ...this.metadata, ...metadata });
  }

  /**
   * Converts to primitives for serialization
   */
  toPrimitives(): { code: string; message: string; metadata?: Record<string, unknown> } {
    return {
      code: this.code,
      message: this.message,
      ...(this.metadata && { metadata: this.metadata }),
    };
  }
}
