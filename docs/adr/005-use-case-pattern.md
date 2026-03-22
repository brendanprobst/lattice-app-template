# ADR-005: Use Case Pattern for Application Logic

## Status

Accepted

## Context

We need to orchestrate domain operations without coupling to HTTP concerns. Controllers should be thin and focused on HTTP handling.

## Decision

Encapsulate each business operation in a use case class:

- e.g. `CreateThingUseCase`, `GetThingByIdUseCase`, `ListThingsUseCase`, etc.
- Controllers call use cases, use cases orchestrate domain services
- Use cases return `Result<T>` for consistent error handling
- Use Data Transfer Objects (DTOs) for return types instead of inline types or domain primitives

## Consequences

### Positive

- Business logic is reusable (not tied to HTTP)
- Controllers stay thin (just HTTP concerns)
- Clear business intent (one use case = one operation)
- Easy to test use cases independently
- DTOs provide explicit, reusable return types
- DTOs decouple use case return types from domain entity structure
- Type safety: DTOs prevent accidental exposure of internal domain details

### Negative

- More files (one per use case, plus DTOs)
- Additional layer of abstraction
- Need to maintain DTOs when API contracts change

## DTOs (Data Transfer Objects)

Use cases return DTOs defined in `api/application/dtos/`:

- `ThingDto` - Represents a thing in API responses (example aggregate)

DTOs serve as the contract between use cases and controllers, ensuring:
- Clear API response structure
- Type safety without exposing domain internals
- Easy refactoring of domain entities without breaking API contracts
- Reusability across multiple use cases

## Alternatives Considered

- **Logic in Controllers**: Rejected - couples business logic to HTTP
- **Service Layer**: Rejected - use cases are more focused and explicit
- **Inline Types**: Rejected - DTOs provide better maintainability and reusability
- **Returning Domain Entities Directly**: Rejected - exposes internal structure and couples API to domain