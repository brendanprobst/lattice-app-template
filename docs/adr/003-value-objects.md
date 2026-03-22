# ADR-003: Value Objects for Domain Primitives

## Status

Accepted

## Context

Domain concepts represented as raw strings or numbers can enter invalid states and spread bugs. Value objects validate at construction and make illegal states unrepresentable.

## Decision

When a primitive has invariants (format, range, allowed set), introduce a **value object** in `api/domain/value-objects/` with:

- A private constructor and factory methods
- `fromString()` returning `Result<T>` for untrusted input where appropriate
- `fromStringOrThrow()` or similar for trusted input (e.g. seed loaders)

The template’s example aggregate (`Thing`) uses plain strings for simplicity; add value objects when your domain rules justify them.

## Consequences

### Positive

- Invalid states are rejected at the boundary
- Centralized validation logic
- Self-documenting types

### Negative

- More types and files than using primitives alone

## Alternatives Considered

- **Plain primitives everywhere**: Rejected for constrained domains where mistakes are costly
- **Enums only**: Sometimes sufficient; value objects add validation and behavior
