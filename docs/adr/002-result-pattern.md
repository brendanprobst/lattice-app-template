# ADR-002: Result Pattern for Error Handling

## Status

Accepted

## Context

We need explicit error handling for business logic failures. Throwing exceptions makes error paths implicit and harder to track. Result pattern provides better type safety and error handling.

## Decision

Use a functional `Result<T>` pattern where operations return `Result.success(value)` or `Result.failure(error)` instead of throwing exceptions for business logic errors.

Domain errors are centralized in `ErrorCatalog` with user-friendly messages.

### Error Message Design

Error messages are designed to be **user-friendly and non-technical**. Technical details such as IDs and other debugging information are stored in the `metadata` field of `ResultError`, not in the user-facing message.

**Rationale:**

- **User Experience**: End users should see clear, actionable messages without technical jargon
- **Security**: Avoid exposing internal IDs or system details that could be exploited
- **Debugging**: Developers can access technical details via the `metadata` field in error responses
- **Maintainability**: Messages can evolve without breaking tests that check error codes

**Example:**

```typescript
// User sees the catalog message for THING_NOT_FOUND
// Developer sees in metadata: { id: "thing-123" }
ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id: "thing-123" })
```

## Consequences

### Positive

- Explicit error handling - callers must handle failures
- Type-safe error paths
- Centralized error definitions (ErrorCatalog)
- No hidden exception flows
- Separation of user-friendly messages and technical debugging info (via metadata field)
- Better security by not exposing internal IDs in user-facing messages

### Negative

- More verbose than exceptions
- Requires discipline to use consistently
- Non-standard in Node.js ecosystem

## Alternatives Considered

- **Exceptions**: Rejected - implicit error paths, harder to track
- **Error Codes**: Rejected - Result pattern provides better type safety
