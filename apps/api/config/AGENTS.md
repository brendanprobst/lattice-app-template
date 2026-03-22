# `apps/api/config/` — Configuration

## Purpose

**Swagger** OpenAPI assembly: `swagger/index.ts` defines shared schemas and glob paths to route files and `swagger/decorators/*.ts`.

## Editing Swagger

- Add JSDoc blocks or `swaggerRoute()` helpers next to routes.
- Register new decorator files in `apis` inside `swagger/index.ts` if they are not matched by `./routes/*`.
