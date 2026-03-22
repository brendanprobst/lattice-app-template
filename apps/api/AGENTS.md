# `apps/api/` — HTTP application

## Contents

- **`app.ts`** — Express factory `createApp(container?)`, Swagger UI, global error handler, route mounting.
- **`bin/www.ts`** — Server listen.
- **`config/`** — Swagger JSDoc assembly.
- **`controllers/`**, **`routes/`** — Presentation layer.
- **`domain/`**, **`application/`**, **`infrastructure/`** — DDD layers.

## Adding a feature

1. Domain entity + repository interface (+ optional domain services).
2. Use case(s) + DTOs returning `Result<T>`.
3. In-memory (or real) repository implementation.
4. `Container` getters for new repositories and use cases.
5. Controller + router; mount router in `app.ts`.
6. Swagger decorators and `config/swagger/index.ts` schema paths as needed.
