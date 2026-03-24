# ADR-004: Repository Pattern and Persistence

## Status

Accepted (updated for Supabase-backed default)

## Context

We need to abstract data access so the domain layer stays pure and tests do not require a live database. The template also needs a **realistic default** for forks: most apps persist to a database, not memory.

## Decision

Use repository **interfaces** in the domain layer with **implementations** in infrastructure:

- **`IThingRepository`** (example aggregate port) lives in the domain layer.
- **`ThingRepository`** in infrastructure implements the port and talks to persistence through a **`ThingDataAdapter`** port (e.g. **`SupabaseAdapter`** for PostgREST).
- **Tests** use **in-memory or mocked adapters** (e.g. `MockedThingDataAdapter`) so Jest stays fast and deterministic without network I/O.

Domain depends only on **`IThingRepository`**, not on Supabase or HTTP.

## Consequences

### Positive

- Domain has no database or HTTP dependencies.
- Swapping storage (another DB, mock, or test double) is a **composition-root** change plus a new adapter implementation.
- Fast unit/integration tests without Supabase.

### Negative

- Extra abstraction (repository + adapter) versus a single “repository that calls fetch directly” without a port.
- More files to navigate for newcomers.

## Alternatives Considered

- **Direct database access from controllers**: Rejected — couples HTTP layer to storage.
- **ORM models in the domain layer**: Rejected — violates clean architecture; keep domain entities free of ORM decorators.

## Relationship to ADR-006

Deployment uses **Supabase** with credentials in **SSM** and the API on **Lambda**; see [ADR-006](./006-full-stack-and-deployment.md) for where this fits in the full stack.
