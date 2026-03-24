# ADR-001: Domain-Driven Design Architecture

## Status

Accepted

## Context

We need a maintainable architecture that clearly separates business logic from infrastructure concerns. The codebase needs to be testable and easy to extend with new business rules.

## Decision

Use Domain-Driven Design (DDD) with clean architecture layers:

- **Domain Layer**: Entities, value objects, domain services (pure business logic)
- **Application Layer**: Use cases (orchestrate domain operations)
- **Infrastructure Layer**: Repository implementations, external concerns
- **Presentation Layer**: Express controllers and routes

## Consequences

### Positive

- Business logic is isolated and testable without HTTP/database
- Clear separation of concerns
- Easy to swap infrastructure (e.g., in-memory → database)
- Domain layer has no dependencies on external frameworks

### Negative

- More files and abstraction layers
- Steeper learning curve for new developers

## Alternatives Considered

- **Simple MVC**: Rejected — business logic would leak into controllers.
- **Service Layer Pattern**: Rejected — DDD provides clearer domain modeling for evolving rules.
