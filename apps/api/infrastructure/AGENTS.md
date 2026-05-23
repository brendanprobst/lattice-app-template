# `apps/api/infrastructure/` — Infrastructure

## Purpose

**Repository implementations**, **seed/bootstrap** loaders, and the **`Container`** composition root.

## Rules

- Implement interfaces from `apps/api/domain/repositories/`.
- External service calls must go through infrastructure adapters (for example, `adapters/supabase/SupabaseAdapter.ts`) so repositories remain persistence-focused and client libraries stay swappable.
- `Container` holds concrete singletons (or factories) and exposes getters used by controllers.
- **Scale:** when `Container` grows past roughly **eight** repository/use-case getters, stop extending the class by hand — introduce a composition module or DI toolkit. Do not wing a full DI framework in a drive-by PR.

## Bootstrap

Optional seed data loading lives here (e.g. `seed.ts`). Production apps often replace in-memory repos with DB-backed adapters registered the same way on `Container`.

## Cursor

The **infra expert** rule (`.cursor/rules/infra-expert.mdc`) applies when editing under `apps/api/infrastructure/`, `apps/api/config/`, or root `seed.json`.
