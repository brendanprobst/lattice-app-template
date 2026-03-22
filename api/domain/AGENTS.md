# `api/domain/` — Domain layer

## Purpose

Pure business logic: **entities**, **value objects**, **domain services**, **repository interfaces** (`I*Repository`), and the **`Result` / `ResultError` / `ErrorCatalog`** types.

## Rules

- No imports from `application/`, `infrastructure/`, `controllers/`, or `routes/`.
- Express and I/O types stay out of here.
- Expose behavior on entities; keep use cases thin orchestrators.

## Reference implementation

The **`Thing`** aggregate (entity + `IThingRepository` + use cases) is the template vertical slice. ADRs under `docs/adr/` describe patterns generically; align new code with the Thing flow unless an ADR documents an alternative.

## Template slice

Follow **`Thing`** end-to-end when adding a new aggregate: entity → `I*Repository` → in-memory adapter → use cases → DTOs → `Container` → controller → routes → Swagger → tests (`test/things.test.ts`).

## Cursor

The **DDD expert** rule (`.cursor/rules/ddd-expert.mdc`) applies when editing under `api/domain/`, `api/application/`, or `docs/adr/`.
