# `apps/api/` — HTTP application

## Contents

- **`app.ts`** — Express factory `createApp(container?)`, Swagger UI at **`/api-docs`**, global error handler, route mounting.
- **`bin/www.ts`** — Server listen (default port **3000**; `dotenv` loads **`apps/api/.env`** when present).

## Local dev and Supabase

- **`Container`** uses **Supabase** when **`SUPABASE_URL`** and **`SUPABASE_SERVICE_ROLE_KEY`** are both set (see **`.env.example`**).
- If those are **missing** and **`NODE_ENV` is not `production`**, the API still starts with an **in-memory** `Thing` repository (data resets on restart) so **`npm run dev`** and **`http://localhost:3000/api-docs`** work out of the box. A warning is logged.
- **Production** requires both Supabase variables (Lambda / `NODE_ENV=production`).
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
