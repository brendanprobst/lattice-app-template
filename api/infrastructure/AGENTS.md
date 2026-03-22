# `api/infrastructure/` — Infrastructure

## Purpose

**Repository implementations**, **seed/bootstrap** loaders, and the **`Container`** composition root.

## Rules

- Implement interfaces from `api/domain/repositories/`.
- `Container` holds concrete singletons (or factories) and exposes getters used by controllers.

## Bootstrap

Optional seed data loading lives here (e.g. `seed.ts`). Production apps often replace in-memory repos with DB-backed adapters registered the same way on `Container`.

## Cursor

The **infra expert** rule (`.cursor/rules/infra-expert.mdc`) applies when editing under `api/infrastructure/`, `api/config/`, or root `seed.json`.
