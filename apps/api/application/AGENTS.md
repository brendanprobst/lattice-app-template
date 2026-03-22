# `apps/api/application/` — Application layer

## Purpose

**Use cases** orchestrate domain objects and repositories. **DTOs** define API-facing shapes (primitives), not entities.

## Pattern

- One class per use case, `execute(...): Promise<Result<T>>`.
- Map entities to DTOs via `toPrimitives()` or explicit mappers.
- Catch unexpected errors and return `Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR)` where appropriate.

## Files

- **`use-cases/`** — Application services.
- **`dtos/`** — Types exported from `index.ts` when shared.
