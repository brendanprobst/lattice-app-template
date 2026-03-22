# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) that document key architectural decisions made in this codebase.

## What are ADRs?

ADRs capture important architectural decisions, explaining:

- **What** decision was made
- **Why** it was made
- **Consequences** (positive and negative)

## ADRs

- [ADR-001: Domain-Driven Design Architecture](./001-ddd-architecture.md)
- [ADR-002: Result Pattern for Error Handling](./002-result-pattern.md)
- [ADR-003: Value Objects for Domain Primitives](./003-value-objects.md)
- [ADR-004: Repository Pattern with In-Memory Implementation](./004-repository-pattern.md)
- [ADR-005: Use Case Pattern for Application Logic](./005-use-case-pattern.md)

## Why These Decisions Matter

These ADRs document the core architectural patterns that make the codebase:

- **Testable**: Business logic isolated from infrastructure
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add new features or swap implementations
