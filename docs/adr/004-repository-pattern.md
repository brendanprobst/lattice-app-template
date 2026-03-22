# ADR-004: Repository Pattern with In-Memory Implementation

## Status

Accepted

## Context

We need to abstract data access to keep the domain layer pure and enable easy testing. Currently using in-memory storage, but may need a database later.
Repository pattern provides a clean way to abstract data access and enable easy testing. It also allows for easy migration to a real database.

## Decision

Use repository interfaces in the domain layer with implementations in the infrastructure layer:

- `IThingRepository` interface (example aggregate)
- `InMemoryThingRepository` implementation

Domain layer depends on interfaces, not implementations.

## Consequences

### Positive

- Domain layer has no database dependencies
- Easy to test (can mock repositories)
- Simple migration path to real database (swap implementation)
- In-memory implementation enables fast tests

### Negative

- Additional abstraction layer
- More files to maintain

## Alternatives Considered

- **Direct Database Access**: Rejected - couples domain to infrastructure
- **ORM in Domain Layer**: Rejected - violates clean architecture principles

## Database Migration Path

While the in-memory implementation is sufficient for local development and tests, the architecture supports swapping in a database-backed repository later.

### Design Decisions Supporting Migration

1. **Repository Interfaces**: Domain layer depends only on interfaces such as `IThingRepository`, not implementations. This allows swapping implementations without touching domain or application layers.

2. **Seed Data Structure**: The `seed.json` file can hold a `things` array of simple records (id, name, createdAt) analogous to table rows.

3. **Entity Serialization**: The `Thing` entity exposes `toPrimitives()` for API DTOs; loading from persistence can mirror that shape.

4. **Container Pattern**: The dependency injection container (`Container` class) centralizes repository instantiation. Migrating to a database requires only updating the container to use database repository implementations instead of in-memory ones.

### Migration Path

When ready for production, the migration is straightforward:

1. Create database repository implementations that implement the same interfaces
2. Update the `Container` class to instantiate database repositories instead of in-memory ones
3. Create a migration script to load `seed.json` data into the database
4. No changes needed to domain layer, application layer, or controllers

The architecture ensures zero breaking changes to business logic during the migration.

