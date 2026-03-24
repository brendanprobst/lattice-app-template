# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) that document key architectural decisions made in this codebase.

## What are ADRs?

ADRs capture important architectural decisions, explaining:

- **What** decision was made
- **Why** it was made
- **Consequences** (positive and negative)

## Index

### Application architecture (API / DDD)

- [ADR-001: Domain-Driven Design Architecture](./001-ddd-architecture.md)
- [ADR-002: Result Pattern for Error Handling](./002-result-pattern.md)
- [ADR-003: Value Objects for Domain Primitives](./003-value-objects.md)
- [ADR-004: Repository Pattern and Persistence](./004-repository-pattern.md)
- [ADR-005: Use Case Pattern for Application Logic](./005-use-case-pattern.md)

### Full stack, hosting, and deployment

- [ADR-006: Full-Stack Layout and AWS Deployment Strategy](./006-full-stack-and-deployment.md)
- [ADR-007: CI Validation and Manual Deployment Promotion](./007-ci-and-environment-promotion.md)

## Why these decisions matter

These ADRs document patterns that keep the codebase:

- **Testable**: Business logic isolated from infrastructure
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add features or swap implementations (including persistence and cloud targets)
